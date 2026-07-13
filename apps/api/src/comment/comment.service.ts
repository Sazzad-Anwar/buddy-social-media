import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../db.service';
import { PostCacheService } from '../post/post-cache.service';
import { CommentCacheService } from './comment-cache.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import {
  decodeCursor,
  encodeCursor,
  normalizeCursorLimit,
} from '../common/pagination/cursor-pagination';
import { COMMENT_LIST_CACHE_TTL_SECONDS } from './comment.constants';
import type { CommentCard } from './comment.types';
import type { User, PostLikeUser } from '@repo/types';

type CommentCursor = {
  createdAt: string;
  id: number;
};

type LikesCursor = {
  createdAt: string;
  userId: number;
};

const commentSummarySelect = {
  id: true,
  postId: true,
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
    orderBy: [
      { createdAt: 'desc' },
      { userId: 'desc' },
    ],
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
} satisfies Prisma.CommentSelect;

function serializeCommentCard(
  comment: Prisma.CommentGetPayload<{
    select: typeof commentSummarySelect;
  }>,
  likedByMe = false,
): CommentCard {
  return {
    id: comment.id,
    postId: comment.postId,
    content: comment.content,
    repliesCount: comment.repliesCount,
    likesCount: comment.likesCount,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: comment.author,
    likedUsers: comment.likes.map((like) => ({
      id: like.user.id,
      firstName: like.user.firstName,
      lastName: like.user.lastName,
    })),
    likedByMe,
  };
}

const commentLikeSelect = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
  createdAt: true,
  userId: true,
} satisfies Prisma.CommentLikeSelect;

function serializeCommentLikeUser(
  like: Prisma.CommentLikeGetPayload<{
    select: typeof commentLikeSelect;
  }>,
): PostLikeUser {
  return {
    id: like.user.id,
    firstName: like.user.firstName,
    lastName: like.user.lastName,
    email: like.user.email,
    role: like.user.role,
    likedAt: like.createdAt.toISOString(),
  };
}

@Injectable()
export class CommentService {
  constructor(
    private readonly db: PrismaService,
    private readonly cache: CommentCacheService,
    private readonly postCache: PostCacheService,
  ) {}

  async create(
    postId: number,
    createCommentDto: CreateCommentDto,
    author: User,
  ): Promise<CommentCard> {
    const post = await this.ensureVisiblePost(postId, author.id);

    const comment = await this.db.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          postId,
          authorId: author.id,
          content: createCommentDto.content,
        },
        select: commentSummarySelect,
      });

      await tx.post.update({
        where: { id: postId },
        data: {
          commentsCount: {
            increment: 1,
          },
        },
      });

      return created;
    });

    await this.cache.bumpCommentsVersion(postId);
    await this.postCache.bumpFeedVersion();
    await this.postCache.deletePostCards(postId, post.authorId);

    return serializeCommentCard(comment);
  }

  async findAll(
    postId: number,
    viewer: User,
    query: { cursor?: string; limit?: number },
  ): Promise<{
    items: CommentCard[];
    nextCursor: string | null;
    hasNextPage: boolean;
  }> {
    await this.ensureVisiblePost(postId, viewer.id);

    const limit = normalizeCursorLimit(query.limit);
    const version = await this.cache.getCommentsVersion(postId);
    const pageKey = this.cache.commentsPageKey({
      postId,
      version,
      viewerId: viewer.id,
      cursor: query.cursor ?? null,
      limit,
    });

    const cachedIds = await this.cache.getCommentsPage(pageKey);
    if (cachedIds) {
      const cards = await this.resolveCardsFromIds(cachedIds, viewer.id);
      const cardsWithLikes = await this.attachLikeState(cards, viewer.id);
      const nextCursor =
        cardsWithLikes.length > 0
          ? encodeCursor<CommentCursor>({
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

    const cursor = decodeCursor<CommentCursor>(query.cursor);
    const where = cursor
      ? {
          postId,
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
          postId,
        };

    const comments = await this.db.comment.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: limit + 1,
      select: commentSummarySelect,
    });

    const hasNextPage = comments.length > limit;
    const page = hasNextPage ? comments.slice(0, limit) : comments;
    const cards = await this.materializeCards(page, viewer.id);

    await this.cache.setCommentsPage(
      pageKey,
      cards.map((card) => String(card.id)),
      COMMENT_LIST_CACHE_TTL_SECONDS,
    );

    return {
      items: cards,
      nextCursor:
        hasNextPage && cards.length > 0
          ? encodeCursor<CommentCursor>({
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
    viewer: User,
  ): Promise<{ likedByMe: boolean; likesCount: number }> {
    return await this.setLikeState(postId, commentId, viewer, true);
  }

  async unlike(
    postId: number,
    commentId: number,
    viewer: User,
  ): Promise<{ likedByMe: boolean; likesCount: number }> {
    return await this.setLikeState(postId, commentId, viewer, false);
  }

  private async resolveCardsFromIds(ids: string[], viewerId: number) {
    const cards: CommentCard[] = [];

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
    comments: Prisma.CommentGetPayload<{
      select: typeof commentSummarySelect;
    }>[],
    viewerId: number,
  ) {
    const cards = comments.map((comment) => serializeCommentCard(comment));

    await Promise.all(
      comments.map(async (comment, index) => {
        await this.cache.setCommentCard(
          this.commentSummaryKey({
            commentId: comment.id,
            scope: 'public',
          }),
          cards[index],
          COMMENT_LIST_CACHE_TTL_SECONDS,
        );
      }),
    );

    const likedComments = await this.db.commentLike.findMany({
      where: {
        commentId: {
          in: comments.map((comment) => comment.id),
        },
        userId: viewerId,
      },
      select: {
        commentId: true,
      },
    });

    const likedCommentIds = new Set(likedComments.map((item) => item.commentId));

    return cards.map((card) => ({
      ...card,
      likedByMe: likedCommentIds.has(card.id),
    }));
  }

  private async attachLikeState(cards: CommentCard[], viewerId: number) {
    if (cards.length === 0) {
      return cards;
    }

    const likedComments = await this.db.commentLike.findMany({
      where: {
        commentId: {
          in: cards.map((card) => card.id),
        },
        userId: viewerId,
      },
      select: {
        commentId: true,
      },
    });

    const likedCommentIds = new Set(likedComments.map((item) => item.commentId));

    return cards.map((card) => ({
      ...card,
      likedByMe: likedCommentIds.has(card.id),
    }));
  }

  private async getCardByIdForViewer(
    commentId: number,
    viewerId: number,
  ): Promise<CommentCard | null> {
    const publicKey = this.commentSummaryKey({
      commentId,
      scope: 'public',
    });
    const publicCard = await this.cache.getCommentCard(publicKey);
    if (publicCard) {
      return publicCard;
    }

    const comment = await this.db.comment.findFirst({
      where: {
        id: commentId,
        OR: [
          { post: { visibility: 'PUBLIC' } },
          { post: { authorId: viewerId } },
        ],
      },
      select: commentSummarySelect,
    });

    if (!comment) {
      return null;
    }

    const card = serializeCommentCard(comment);
    await this.cache.setCommentCard(
      publicKey,
      card,
      COMMENT_LIST_CACHE_TTL_SECONDS,
    );

    return card;
  }

  private commentSummaryKey(params: {
    commentId: number;
    scope: 'public' | 'private';
    ownerId?: number;
  }): string {
    if (params.scope === 'private') {
      return `comment:summary:${params.commentId}:private:${params.ownerId ?? 0}`;
    }

    return `comment:summary:${params.commentId}:public`;
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

  private async setLikeState(
    postId: number,
    commentId: number,
    viewer: User,
    shouldLike: boolean,
  ): Promise<{ likedByMe: boolean; likesCount: number }> {
    const comment = await this.ensureVisibleComment(
      postId,
      commentId,
      viewer.id,
    );

    const existing = await this.db.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId: viewer.id,
        },
      },
    });

    const summary = await this.db.comment.findFirst({
      where: {
        id: commentId,
        postId,
      },
      select: {
        id: true,
        likesCount: true,
      },
    });

    if (!summary) {
      throw new NotFoundException('Comment is not found');
    }

    if (shouldLike && existing) {
      return {
        likedByMe: true,
        likesCount: summary.likesCount,
      };
    }

    if (!shouldLike && !existing) {
      return {
        likedByMe: false,
        likesCount: summary.likesCount,
      };
    }

    const updated = await this.db.$transaction(async (tx) => {
      if (!shouldLike) {
        await tx.commentLike.delete({
          where: {
            commentId_userId: {
              commentId,
              userId: viewer.id,
            },
          },
        });

        return await tx.comment.update({
          where: { id: commentId },
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

      await tx.commentLike.create({
        data: {
          commentId,
          userId: viewer.id,
        },
      });

      return await tx.comment.update({
        where: { id: commentId },
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

    await this.cache.deleteCommentCards(commentId, comment.post.authorId);

    return {
      likedByMe: shouldLike,
      likesCount: updated.likesCount,
    };
  }

  async listLikes(
    postId: number,
    commentId: number,
    query: { cursor?: string; limit?: number },
    viewer: User,
  ): Promise<{
    items: PostLikeUser[];
    nextCursor: string | null;
    hasNextPage: boolean;
  }> {
    await this.ensureVisibleComment(postId, commentId, viewer.id);

    const limit = normalizeCursorLimit(query.limit);

    const cursor = decodeCursor<LikesCursor>(query.cursor);
    const where = cursor
      ? {
          commentId,
          OR: [
            {
              createdAt: {
                lt: new Date(cursor.createdAt),
              },
            },
            {
              createdAt: new Date(cursor.createdAt),
              userId: {
                lt: cursor.userId,
              },
            },
          ],
        }
      : {
          commentId,
        };

    const likes = await this.db.commentLike.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { userId: 'desc' }],
      take: limit + 1,
      select: commentLikeSelect,
    });

    const hasNextPage = likes.length > limit;
    const page = hasNextPage ? likes.slice(0, limit) : likes;
    const items = page.map(serializeCommentLikeUser);

    return {
      items,
      nextCursor:
        hasNextPage && items.length > 0
          ? encodeCursor<LikesCursor>({
              createdAt: items[items.length - 1].likedAt,
              userId: items[items.length - 1].id,
            })
          : null,
      hasNextPage,
    };
  }

  private async ensureVisiblePost(postId: number, userId: number) {
    const post = await this.db.post.findFirst({
      where: {
        id: postId,
        OR: [
          { visibility: 'PUBLIC' },
          { authorId: userId },
        ],
      },
      select: {
        id: true,
        authorId: true,
        visibility: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post is not found');
    }

    return post;
  }
}
