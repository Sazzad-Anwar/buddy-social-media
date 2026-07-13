import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../db.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import {
  MediaService,
  type UploadedImageLikeFile,
} from '../media/media.service';
import { PostCacheService } from './post-cache.service';
import {
  decodeCursor,
  encodeCursor,
  normalizeCursorLimit,
} from '../common/pagination/cursor-pagination';
import {
  POST_FEED_CACHE_TTL_SECONDS,
  POST_LIKES_CACHE_TTL_SECONDS,
  POST_SUMMARY_CACHE_TTL_SECONDS,
} from './post.constants';
import type { PostCard, PostLikePreviewUser, PostLikeUser } from './post.types';
import type { User } from '@repo/types';

type FeedCursor = {
  createdAt: string;
  id: number;
};

type LikesCursor = {
  createdAt: string;
  userId: number;
};

const postSummarySelect = {
  id: true,
  authorId: true,
  content: true,
  imageKey: true,
  imageUrl: true,
  imageStatus: true,
  visibility: true,
  commentsCount: true,
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
} satisfies Prisma.PostSelect;

const postLikeSelect = {
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
} satisfies Prisma.PostLikeSelect;

const postLikePreviewSelect = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.PostLikeSelect;

function serializePostCard(
  post: Prisma.PostGetPayload<{
    select: typeof postSummarySelect;
  }>,
  likedByMe = false,
): PostCard {
  const likedUsers = post.likes.map((like) => ({
    id: like.user.id,
    firstName: like.user.firstName,
    lastName: like.user.lastName,
  })) satisfies PostLikePreviewUser[];

  return {
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl,
    imageStatus: post.imageStatus,
    visibility: post.visibility,
    commentsCount: post.commentsCount,
    likesCount: post.likesCount,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: post.author,
    likedUsers,
    likedByMe,
  };
}

function serializeLikeUser(
  like: Prisma.PostLikeGetPayload<{
    select: typeof postLikeSelect;
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
export class PostService {
  constructor(
    private readonly db: PrismaService,
    private readonly cache: PostCacheService,
    private readonly media: MediaService,
  ) {}

  async create(
    createPostDto: CreatePostDto,
    author: User,
    file?: UploadedImageLikeFile,
  ): Promise<PostCard> {
    const uploadedImage =
      file !== undefined
        ? await this.media.processAndUploadPostImage(file, author.id)
        : null;

    const post = await this.db.post.create({
      data: {
        authorId: author.id,
        content: createPostDto.content,
        visibility: createPostDto.visibility,
        imageKey: uploadedImage?.key ?? null,
        imageUrl: uploadedImage?.ufsUrl ?? null,
        imageStatus: 'READY',
      },
      select: postSummarySelect,
    });

    await this.cache.bumpFeedVersion();
    await this.cache.deletePostCards(post.id, author.id);

    return serializePostCard(post);
  }

  async findAll(
    viewer: User,
    query: { cursor?: string; limit?: number },
  ): Promise<{
    items: PostCard[];
    nextCursor: string | null;
    hasNextPage: boolean;
  }> {
    const limit = normalizeCursorLimit(query.limit);
    const feedVersion = await this.cache.getFeedVersion();
    const feedKey = this.cache.feedPageKey({
      version: feedVersion,
      viewerId: viewer.id,
      cursor: query.cursor ?? null,
      limit,
    });

    const cachedIds = await this.cache.getFeedPage(feedKey);

    if (cachedIds) {
      const cards = await this.resolveCardsFromIds(cachedIds, viewer.id);
      const cardsWithLikes = await this.attachLikeState(cards, viewer.id);
      const nextCursor =
        cardsWithLikes.length > 0
          ? encodeCursor<FeedCursor>({
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

    const cursor = decodeCursor<FeedCursor>(query.cursor);
    const where = this.buildFeedWhere(viewer.id, cursor);

    const posts = await this.db.post.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: postSummarySelect,
    });

    const hasNextPage = posts.length > limit;
    const page = hasNextPage ? posts.slice(0, limit) : posts;
    const cards = await this.materializeCards(page, viewer.id);
    const nextCursor =
      hasNextPage && cards.length > 0
        ? encodeCursor<FeedCursor>({
            createdAt: cards[cards.length - 1].createdAt,
            id: cards[cards.length - 1].id,
          })
        : null;

    await this.cache.setFeedPage(
      feedKey,
      cards.map((card) => String(card.id)),
      POST_FEED_CACHE_TTL_SECONDS,
    );

    return {
      items: cards,
      nextCursor,
      hasNextPage,
    };
  }

  async findOne(id: number, viewer: User): Promise<PostCard> {
    const cached = await this.getCardByIdForViewer(id, viewer.id);
    if (cached) {
      const [card] = await this.attachLikeState([cached], viewer.id);
      return card;
    }

    const post = await this.db.post.findFirst({
      where: {
        id,
        OR: [{ visibility: 'PUBLIC' }, { authorId: viewer.id }],
      },
      select: postSummarySelect,
    });

    if (!post) {
      throw new NotFoundException('Post is not found');
    }

    const card = serializePostCard(post);
    await this.cache.setPostCard(
      this.cache.postSummaryKey({
        postId: id,
        scope: post.visibility === 'PRIVATE' ? 'private' : 'public',
        ownerId: post.authorId,
      }),
      card,
      POST_SUMMARY_CACHE_TTL_SECONDS,
    );

    const [cardWithLike] = await this.attachLikeState([card], viewer.id);
    return cardWithLike;
  }

  async update(
    id: number,
    updatePostDto: UpdatePostDto,
    viewer: User,
    file?: UploadedImageLikeFile,
  ): Promise<PostCard> {
    const post = await this.ensureOwnedPost(id, viewer.id);
    const uploadedImage =
      file !== undefined
        ? await this.media.processAndUploadPostImage(file, post.id)
        : null;

    const nextData = {
      content: updatePostDto.content ?? post.content,
      visibility: updatePostDto.visibility ?? post.visibility,
      ...(uploadedImage
        ? {
            imageKey: uploadedImage.key,
            imageUrl: uploadedImage.ufsUrl,
            imageStatus: 'READY' as const,
          }
        : {}),
    };

    let updated;

    try {
      updated = await this.db.post.update({
        where: { id },
        data: nextData,
        select: postSummarySelect,
      });
    } catch (error) {
      if (uploadedImage) {
        await this.media.deleteUploadedFile(uploadedImage.key);
      }
      throw error;
    }

    if (uploadedImage && post.imageKey) {
      await this.media.deleteUploadedFile(post.imageKey);
    }

    await this.cache.bumpFeedVersion();
    await this.cache.deletePostCards(id, viewer.id);

    return serializePostCard(updated);
  }

  async remove(id: number, viewer: User): Promise<{ id: number }> {
    const post = await this.ensureOwnedPost(id, viewer.id);

    if (post.imageKey) {
      await this.media.deleteUploadedFile(post.imageKey);
    }

    await this.db.post.delete({
      where: { id },
    });

    await this.cache.bumpFeedVersion();
    await this.cache.deletePostCards(id, viewer.id);

    return { id };
  }

  async like(
    id: number,
    viewer: User,
  ): Promise<{ likedByMe: boolean; likesCount: number }> {
    return await this.setLikeState(id, viewer, true);
  }

  async unlike(
    id: number,
    viewer: User,
  ): Promise<{ likedByMe: boolean; likesCount: number }> {
    return await this.setLikeState(id, viewer, false);
  }

  private async setLikeState(
    id: number,
    viewer: User,
    shouldLike: boolean,
  ): Promise<{ likedByMe: boolean; likesCount: number }> {
    const post = await this.db.post.findFirst({
      where: {
        id,
        OR: [{ visibility: 'PUBLIC' }, { authorId: viewer.id }],
      },
      select: {
        id: true,
        likesCount: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post is not found');
    }

    const like = await this.db.postLike.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId: viewer.id,
        },
      },
    });

    if (shouldLike && like) {
      return {
        likedByMe: true,
        likesCount: post.likesCount,
      };
    }

    if (!shouldLike && !like) {
      return {
        likedByMe: false,
        likesCount: post.likesCount,
      };
    }

    const updated = await this.db.$transaction(async (tx) => {
      if (!shouldLike) {
        await tx.postLike.delete({
          where: {
            postId_userId: {
              postId: id,
              userId: viewer.id,
            },
          },
        });

        return await tx.post.update({
          where: { id },
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

      await tx.postLike.create({
        data: {
          postId: id,
          userId: viewer.id,
        },
      });

      return await tx.post.update({
        where: { id },
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

    await this.cache.deletePostCards(id, viewer.id);

    return {
      likedByMe: shouldLike,
      likesCount: updated.likesCount,
    };
  }

  async listLikes(
    id: number,
    query: { cursor?: string; limit?: number },
    viewer: User,
  ): Promise<{
    items: PostLikeUser[];
    nextCursor: string | null;
    hasNextPage: boolean;
  }> {
    await this.ensureVisiblePost(id, viewer.id);

    const limit = normalizeCursorLimit(query.limit);
    const cacheKey = this.cache.postLikesPageKey({
      postId: id,
      cursor: query.cursor ?? null,
      limit,
    });

    const cached = await this.cache.getLikesPage(cacheKey);
    if (cached) {
      return {
        items: cached,
        nextCursor:
          cached.length > 0
            ? encodeCursor<LikesCursor>({
                createdAt: cached[cached.length - 1].likedAt,
                userId: cached[cached.length - 1].id,
              })
            : null,
        hasNextPage: cached.length === limit,
      };
    }

    const cursor = decodeCursor<LikesCursor>(query.cursor);
    const where = cursor
      ? {
          postId: id,
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
          postId: id,
        };

    const likes = await this.db.postLike.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { userId: 'desc' }],
      take: limit + 1,
      select: postLikeSelect,
    });

    const hasNextPage = likes.length > limit;
    const page = hasNextPage ? likes.slice(0, limit) : likes;
    const items = page.map(serializeLikeUser);

    await this.cache.setLikesPage(
      cacheKey,
      items,
      POST_LIKES_CACHE_TTL_SECONDS,
    );

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

  private async ensureOwnedPost(id: number, userId: number) {
    const post = await this.db.post.findFirst({
      where: {
        id,
        authorId: userId,
      },
      select: postSummarySelect,
    });

    if (!post) {
      throw new ForbiddenException();
    }

    return post;
  }

  private async ensureVisiblePost(id: number, userId: number) {
    const post = await this.db.post.findFirst({
      where: {
        id,
        OR: [{ visibility: 'PUBLIC' }, { authorId: userId }],
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

  private buildFeedWhere(userId: number, cursor: FeedCursor | null) {
    const visibilityFilter = {
      OR: [{ visibility: 'PUBLIC' as const }, { authorId: userId }],
    };

    if (!cursor) {
      return visibilityFilter;
    }

    const cursorDate = new Date(cursor.createdAt);

    return {
      AND: [
        visibilityFilter,
        {
          OR: [
            {
              createdAt: {
                lt: cursorDate,
              },
            },
            {
              createdAt: cursorDate,
              id: {
                lt: cursor.id,
              },
            },
          ],
        },
      ],
    };
  }

  private async resolveCardsFromIds(ids: string[], viewerId: number) {
    const cards: PostCard[] = [];

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
    posts: Prisma.PostGetPayload<{
      select: typeof postSummarySelect;
    }>[],
    viewerId: number,
  ) {
    const cards = posts.map((post) => serializePostCard(post));

    await Promise.all(
      posts.map(async (post, index) => {
        const key = this.cache.postSummaryKey({
          postId: post.id,
          scope: post.visibility === 'PRIVATE' ? 'private' : 'public',
          ownerId: post.authorId,
        });
        await this.cache.setPostCard(
          key,
          cards[index],
          POST_SUMMARY_CACHE_TTL_SECONDS,
        );
      }),
    );

    const likedByMe = await this.db.postLike.findMany({
      where: {
        postId: {
          in: posts.map((post) => post.id),
        },
        userId: viewerId,
      },
      select: {
        postId: true,
      },
    });

    const likedPostIds = new Set(likedByMe.map((entry) => entry.postId));

    return cards.map((card) => ({
      ...card,
      likedByMe: likedPostIds.has(card.id),
    }));
  }

  private async attachLikeState(cards: PostCard[], viewerId: number) {
    if (cards.length === 0) {
      return cards;
    }

    const likedByMe = await this.db.postLike.findMany({
      where: {
        postId: {
          in: cards.map((card) => card.id),
        },
        userId: viewerId,
      },
      select: {
        postId: true,
      },
    });

    const likedPostIds = new Set(likedByMe.map((entry) => entry.postId));

    return cards.map((card) => ({
      ...card,
      likedByMe: likedPostIds.has(card.id),
    }));
  }

  private async getCardByIdForViewer(
    postId: number,
    viewerId: number,
  ): Promise<PostCard | null> {
    const publicKey = this.cache.postSummaryKey({
      postId,
      scope: 'public',
    });
    const publicCard = await this.cache.getPostCard(publicKey);
    if (publicCard) {
      return publicCard;
    }

    const privateKey = this.cache.postSummaryKey({
      postId,
      scope: 'private',
      ownerId: viewerId,
    });
    const privateCard = await this.cache.getPostCard(privateKey);
    if (privateCard) {
      return privateCard;
    }

    const post = await this.db.post.findFirst({
      where: {
        id: postId,
        OR: [{ visibility: 'PUBLIC' }, { authorId: viewerId }],
      },
      select: postSummarySelect,
    });

    if (!post) {
      return null;
    }

    const card = serializePostCard(post);
    const key = this.cache.postSummaryKey({
      postId,
      scope: post.visibility === 'PRIVATE' ? 'private' : 'public',
      ownerId: post.authorId,
    });

    await this.cache.setPostCard(key, card, POST_SUMMARY_CACHE_TTL_SECONDS);
    return card;
  }
}
