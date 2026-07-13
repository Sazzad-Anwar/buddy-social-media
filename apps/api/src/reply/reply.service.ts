import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../db.service';
import { CommentCacheService } from '../comment/comment-cache.service';
import { ReplyCacheService } from './reply-cache.service';
import {
  decodeCursor,
  encodeCursor,
  normalizeCursorLimit,
} from '../common/pagination/cursor-pagination';
import { REPLY_LIST_CACHE_TTL_SECONDS } from './reply.constants';
import type { ReplyCard } from './reply.types';
import type { User } from '@repo/types';
import type { CreateReplyDto } from './dto/create-reply.dto';

type ReplyCursor = {
  createdAt: string;
  id: number;
};

const replySummarySelect = {
  id: true,
  commentId: true,
  parentReplyId: true,
  authorId: true,
  content: true,
  repliesCount: true,
  likesCount: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
  likes: {
    take: 5,
    orderBy: [{ createdAt: 'desc' }, { userId: 'desc' }],
    select: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  comment: {
    select: {
      id: true,
      authorId: true,
      post: {
        select: {
          id: true,
          authorId: true,
          visibility: true,
        },
      },
    },
  },
  } satisfies Prisma.ReplySelect;

function serializeReplyCard(
  reply: Prisma.ReplyGetPayload<{
    select: typeof replySummarySelect;
  }>,
  likedByMe = false,
): ReplyCard {
  return {
    id: reply.id,
    commentId: reply.commentId,
    parentReplyId: reply.parentReplyId,
    content: reply.content,
    repliesCount: reply.repliesCount,
    likesCount: reply.likesCount,
    createdAt: reply.createdAt.toISOString(),
    updatedAt: reply.updatedAt.toISOString(),
    author: reply.author,
    likedUsers: reply.likes.map((like) => ({
      id: like.user.id,
      firstName: like.user.firstName,
      lastName: like.user.lastName,
    })),
    likedByMe,
  };
}

function replySummaryKey(reply: {
  comment: {
    post: {
      authorId: number;
      visibility: 'PUBLIC' | 'PRIVATE';
    };
  };
}) {
  if (reply.comment.post.visibility === 'PRIVATE') {
    return {
      scope: 'private' as const,
      ownerId: reply.comment.post.authorId,
    };
  }

  return {
    scope: 'public' as const,
  };
}

@Injectable()
export class ReplyService {
  constructor(
    private readonly db: PrismaService,
    private readonly cache: ReplyCacheService,
    private readonly commentCache: CommentCacheService,
  ) {}

  async create(
    postId: number,
    commentId: number,
    createReplyDto: CreateReplyDto,
    author: User,
  ): Promise<ReplyCard> {
    const comment = await this.ensureVisibleComment(postId, commentId, author.id);
    const parentReply =
      createReplyDto.parentReplyId !== undefined
        ? await this.ensureVisibleParentReply(
            postId,
            commentId,
            createReplyDto.parentReplyId,
            author.id,
          )
        : null;

    const createdReply = await this.db.$transaction(async (tx) => {
      const created = await tx.reply.create({
        data: {
          commentId,
          parentReplyId: parentReply?.id ?? null,
          authorId: author.id,
          content: createReplyDto.content,
        },
        select: {
          id: true,
        },
      });

      await tx.comment.update({
        where: { id: commentId },
        data: {
          repliesCount: {
            increment: 1,
          },
        },
      });

      if (parentReply) {
        await tx.reply.update({
          where: { id: parentReply.id },
          data: {
            repliesCount: {
              increment: 1,
            },
          },
        });
      }

      return created;
    });

    const reply = await this.db.reply.findUnique({
      where: { id: createdReply.id },
      select: replySummarySelect,
    });

    if (!reply) {
      throw new NotFoundException('Reply is not found');
    }

    await this.cache.bumpRepliesVersion(commentId);
    await this.commentCache.bumpCommentsVersion(comment.postId);
    await this.commentCache.deleteCommentCards(
      commentId,
      comment.post.authorId,
    );

    return serializeReplyCard(reply);
  }

  async findAll(
    postId: number,
    commentId: number,
    viewer: User,
    query: { cursor?: string; limit?: number; parentReplyId?: number },
  ): Promise<{
    items: ReplyCard[];
    nextCursor: string | null;
    hasNextPage: boolean;
  }> {
    const parentReplyId =
      query.parentReplyId !== undefined ? query.parentReplyId : null;
    await this.ensureVisibleComment(postId, commentId, viewer.id);
    if (parentReplyId !== null) {
      await this.ensureVisibleParentReply(postId, commentId, parentReplyId, viewer.id);
    }

    const limit = normalizeCursorLimit(query.limit);
    const version = await this.cache.getRepliesVersion(commentId);
    const pageKey = this.cache.repliesPageKey({
      commentId,
      parentReplyId,
      version,
      viewerId: viewer.id,
      cursor: query.cursor ?? null,
      limit,
    });

    const cachedIds = await this.cache.getRepliesPage(pageKey);
    if (cachedIds) {
      const cards = await this.resolveCardsFromIds(cachedIds, viewer.id);
      const cardsWithLikes = await this.attachLikeState(cards, viewer.id);
      const nextCursor =
        cardsWithLikes.length > 0
          ? encodeCursor<ReplyCursor>({
              createdAt: cardsWithLikes[cardsWithLikes.length - 1].createdAt,
              id: cardsWithLikes[cardsWithLikes.length - 1].id,
            })
          : null;

      return {
        items: cardsWithLikes,
        nextCursor,
        hasNextPage: cardsWithLikes.length === limit,
      };
    }

    const cursor = decodeCursor<ReplyCursor>(query.cursor);
    const where = cursor
      ? {
          commentId,
          parentReplyId,
          OR: [
            {
              createdAt: {
                lt: new Date(cursor.createdAt),
              },
            },
            {
              createdAt: new Date(cursor.createdAt),
              id: {
                lt: cursor.id,
              },
            },
          ],
        }
      : {
          commentId,
          parentReplyId,
        };

    const replies = await this.db.reply.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: replySummarySelect,
    });

    const hasNextPage = replies.length > limit;
    const page = hasNextPage ? replies.slice(0, limit) : replies;
    const cards = await this.materializeCards(page, viewer.id);

    await this.cache.setRepliesPage(
      pageKey,
      cards.map((card) => String(card.id)),
      REPLY_LIST_CACHE_TTL_SECONDS,
    );

    return {
      items: cards,
      nextCursor:
        hasNextPage && cards.length > 0
          ? encodeCursor<ReplyCursor>({
              createdAt: cards[cards.length - 1].createdAt,
              id: cards[cards.length - 1].id,
            })
          : null,
      hasNextPage,
    };
  }

  async like(
    postId: number,
    commentId: number,
    replyId: number,
    viewer: User,
  ): Promise<{ likedByMe: boolean; likesCount: number }> {
    return await this.setLikeState(postId, commentId, replyId, viewer, true);
  }

  async unlike(
    postId: number,
    commentId: number,
    replyId: number,
    viewer: User,
  ): Promise<{ likedByMe: boolean; likesCount: number }> {
    return await this.setLikeState(postId, commentId, replyId, viewer, false);
  }

  private async setLikeState(
    postId: number,
    commentId: number,
    replyId: number,
    viewer: User,
    shouldLike: boolean,
  ): Promise<{ likedByMe: boolean; likesCount: number }> {
    await this.ensureVisibleComment(postId, commentId, viewer.id);

    const reply = await this.db.reply.findFirst({
      where: {
        id: replyId,
        commentId,
      },
      select: {
        id: true,
        likesCount: true,
      },
    });

    if (!reply) {
      throw new NotFoundException('Reply is not found');
    }

    const like = await this.db.replyLike.findUnique({
      where: {
        replyId_userId: {
          replyId,
          userId: viewer.id,
        },
      },
    });

    if (shouldLike && like) {
      return {
        likedByMe: true,
        likesCount: reply.likesCount,
      };
    }

    if (!shouldLike && !like) {
      return {
        likedByMe: false,
        likesCount: reply.likesCount,
      };
    }

    const updated = await this.db.$transaction(async (tx) => {
      if (!shouldLike) {
        await tx.replyLike.delete({
          where: {
            replyId_userId: {
              replyId,
              userId: viewer.id,
            },
          },
        });

        return await tx.reply.update({
          where: { id: replyId },
          data: {
            likesCount: {
              decrement: 1,
            },
          },
          select: {
            id: true,
            likesCount: true,
          },
        });
      }

      await tx.replyLike.create({
        data: {
          replyId,
          userId: viewer.id,
        },
      });

      return await tx.reply.update({
        where: { id: replyId },
        data: {
          likesCount: {
            increment: 1,
          },
        },
        select: {
          id: true,
          likesCount: true,
        },
      });
    });

    await this.cache.deleteReplyCards(replyId, viewer.id);

    return {
      likedByMe: shouldLike,
      likesCount: updated.likesCount,
    };
  }

  private async ensureVisibleComment(
    postId: number,
    commentId: number,
    userId: number,
  ) {
    const comment = await this.db.comment.findFirst({
      where: {
        id: commentId,
        postId,
        post: {
          OR: [{ visibility: 'PUBLIC' }, { authorId: userId }],
        },
      },
      select: {
        id: true,
        postId: true,
        authorId: true,
        post: {
          select: {
            id: true,
            authorId: true,
            visibility: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment is not found');
    }

    return comment;
  }

  private async ensureVisibleParentReply(
    postId: number,
    commentId: number,
    parentReplyId: number,
    userId: number,
  ) {
    const reply = await this.db.reply.findFirst({
      where: {
        id: parentReplyId,
        commentId,
        comment: {
          postId,
          post: {
            OR: [{ visibility: 'PUBLIC' }, { authorId: userId }],
          },
        },
      },
      select: {
        id: true,
        commentId: true,
        authorId: true,
        comment: {
          select: {
            id: true,
            postId: true,
            post: {
              select: {
                id: true,
                authorId: true,
                visibility: true,
              },
            },
          },
        },
      },
    });

    if (!reply) {
      throw new NotFoundException('Parent reply is not found');
    }

    return reply;
  }

  private async resolveCardsFromIds(ids: string[], viewerId: number) {
    const cards: ReplyCard[] = [];

    for (const id of ids) {
      const numericId = Number(id);
      const card = await this.getCardByIdForViewer(numericId, viewerId);
      if (card) {
        cards.push(card);
      }
    }

    return cards;
  }

  private async materializeCards(
    replies: Prisma.ReplyGetPayload<{
      select: typeof replySummarySelect;
    }>[],
    viewerId: number,
  ) {
    const cards = replies.map((reply) => serializeReplyCard(reply));

    await Promise.all(
      replies.map(async (reply, index) => {
        const key = this.cache.replySummaryKey({
          replyId: reply.id,
          ...replySummaryKey(reply),
        });
        await this.cache.setReplyCard(
          key,
          cards[index],
          REPLY_LIST_CACHE_TTL_SECONDS,
        );
      }),
    );

    const likedByMe = await this.db.replyLike.findMany({
      where: {
        replyId: {
          in: replies.map((reply) => reply.id),
        },
        userId: viewerId,
      },
      select: {
        replyId: true,
      },
    });

    const likedReplyIds = new Set(likedByMe.map((entry) => entry.replyId));

    return cards.map((card) => ({
      ...card,
      likedByMe: likedReplyIds.has(card.id),
    }));
  }

  private async attachLikeState(cards: ReplyCard[], viewerId: number) {
    if (cards.length === 0) {
      return cards;
    }

    const likedByMe = await this.db.replyLike.findMany({
      where: {
        replyId: {
          in: cards.map((card) => card.id),
        },
        userId: viewerId,
      },
      select: {
        replyId: true,
      },
    });

    const likedReplyIds = new Set(likedByMe.map((entry) => entry.replyId));

    return cards.map((card) => ({
      ...card,
      likedByMe: likedReplyIds.has(card.id),
    }));
  }

  private async getCardByIdForViewer(
    replyId: number,
    viewerId: number,
  ): Promise<ReplyCard | null> {
    const publicKey = this.cache.replySummaryKey({
      replyId,
      scope: 'public',
    });
    const publicCard = await this.cache.getReplyCard(publicKey);
    if (publicCard) {
      return publicCard;
    }

    const privateKey = this.cache.replySummaryKey({
      replyId,
      scope: 'private',
      ownerId: viewerId,
    });
    const privateCard = await this.cache.getReplyCard(privateKey);
    if (privateCard) {
      return privateCard;
    }

    const reply = await this.db.reply.findFirst({
      where: {
        id: replyId,
        comment: {
          post: {
            OR: [{ visibility: 'PUBLIC' }, { authorId: viewerId }],
          },
        },
      },
      select: replySummarySelect,
    });

    if (!reply) {
      return null;
    }

    const card = serializeReplyCard(reply);
    const key = this.cache.replySummaryKey({
      replyId,
      ...(reply.comment.post.visibility === 'PRIVATE'
        ? { scope: 'private' as const, ownerId: reply.comment.post.authorId }
        : { scope: 'public' as const }),
    });

    await this.cache.setReplyCard(key, card, REPLY_LIST_CACHE_TTL_SECONDS);
    return card;
  }
}
