jest.mock('../db.service');

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostService } from './post.service';
import { Role } from '../enums/role.enum';
import type { User } from '@repo/types';

const viewer: User = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  role: Role.USER,
};

const author: User = {
  ...viewer,
  id: 2,
  email: 'author@example.com',
};

const createdAt = new Date('2026-07-12T10:00:00.000Z');

const postSummary = {
  id: 101,
  authorId: author.id,
  content: 'Hello world',
  imageKey: null,
  imageUrl: null,
  imageStatus: 'READY',
  visibility: 'PUBLIC',
  commentsCount: 0,
  likesCount: 2,
  createdAt,
  updatedAt: createdAt,
  author: {
    id: author.id,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'author@example.com',
    role: Role.USER,
  },
  likes: [
    {
      user: {
        id: 3,
        firstName: 'Alex',
        lastName: 'Ray',
      },
    },
  ],
};

const secondPostSummary = {
  ...postSummary,
  id: 102,
  content: 'Another post',
  createdAt: new Date('2026-07-12T09:55:00.000Z'),
  updatedAt: new Date('2026-07-12T09:55:00.000Z'),
  likes: [],
};

const expectedPostCard = {
  id: 101,
  content: 'Hello world',
  imageUrl: null,
  imageStatus: 'READY',
  visibility: 'PUBLIC',
  commentsCount: 0,
  likesCount: 2,
  createdAt: '2026-07-12T10:00:00.000Z',
  updatedAt: '2026-07-12T10:00:00.000Z',
  author: {
    id: author.id,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'author@example.com',
    role: Role.USER,
  },
  likedUsers: [
    {
      id: 3,
      firstName: 'Alex',
      lastName: 'Ray',
    },
  ],
  likedByMe: false,
};

function createServiceFixture() {
  const calls = {
    postFindFirst: [] as unknown[][],
    postCreate: [] as unknown[][],
    postUpdate: [] as unknown[][],
    postDelete: [] as unknown[][],
    postFindMany: [] as unknown[][],
    postLikeFindUnique: [] as unknown[][],
    postLikeFindMany: [] as unknown[][],
    postLikeCreate: [] as unknown[][],
    postLikeDelete: [] as unknown[][],
    bumpFeedVersion: [] as unknown[][],
    deletePostCards: [] as unknown[][],
    getFeedPage: [] as unknown[][],
    setFeedPage: [] as unknown[][],
    getPostCard: [] as unknown[][],
    setPostCard: [] as unknown[][],
    getLikesPage: [] as unknown[][],
    setLikesPage: [] as unknown[][],
    removeFile: [] as unknown[][],
    processAndUploadPostImage: [] as unknown[][],
  };

  let visiblePostResult: typeof postSummary | null = postSummary;
  let feedIds: string[] | null = null;
  let cachedPostCard = null as null | typeof expectedPostCard;
  let cachedLikesPage = null as null | Array<{ id: number; likedAt: string }>;
  let likeRecord = null as null | { postId: number; userId: number };

  const db = {
    $transaction: async (cb: any) => cb(db),
    post: {
      create: async (args: unknown) => {
        calls.postCreate.push([args]);
        return postSummary;
      },
      findMany: async (args: unknown) => {
        calls.postFindMany.push([args]);
        return [postSummary, secondPostSummary];
      },
      findFirst: async (args: unknown) => {
        calls.postFindFirst.push([args]);
        return visiblePostResult;
      },
      update: async (args: unknown) => {
        calls.postUpdate.push([args]);
        return postSummary;
      },
      delete: async (args: unknown) => {
        calls.postDelete.push([args]);
        return null;
      },
    },
    postLike: {
      findUnique: async (args: unknown) => {
        calls.postLikeFindUnique.push([args]);
        return likeRecord;
      },
      findMany: async (args: unknown) => {
        calls.postLikeFindMany.push([args]);
        return [{ postId: postSummary.id }];
      },
      create: async (args: unknown) => {
        calls.postLikeCreate.push([args]);
        likeRecord = { postId: postSummary.id, userId: viewer.id };
        return null;
      },
      delete: async (args: unknown) => {
        calls.postLikeDelete.push([args]);
        likeRecord = null;
        return null;
      },
    },
  };

  const cache = {
    getFeedVersion: async () => 1,
    bumpFeedVersion: async () => {
      calls.bumpFeedVersion.push([]);
      return 2;
    },
    feedPageKey: (params: {
      version: number;
      viewerId: number;
      cursor: string | null;
      limit: number;
    }) =>
      [
        'post:feed',
        `v${params.version}`,
        `viewer:${params.viewerId}`,
        `cursor:${params.cursor ?? 'root'}`,
        `limit:${params.limit}`,
      ].join(':'),
    getFeedPage: async () => feedIds,
    setFeedPage: async (key: string, ids: string[], ttlSeconds: number) => {
      calls.setFeedPage.push([key, ids, ttlSeconds]);
      feedIds = ids;
    },
    postSummaryKey: (params: {
      postId: number;
      scope: 'public' | 'private';
      ownerId?: number;
    }) =>
      params.scope === 'private'
        ? `post:summary:${params.postId}:private:${params.ownerId ?? 0}`
        : `post:summary:${params.postId}:public`,
    getPostCard: async () => cachedPostCard,
    setPostCard: async (key: string, card: typeof expectedPostCard) => {
      calls.setPostCard.push([key, card]);
      cachedPostCard = card;
    },
    deletePostCards: async (...args: unknown[]) => {
      calls.deletePostCards.push(args);
    },
    postLikesPageKey: (params: {
      postId: number;
      cursor: string | null;
      limit: number;
    }) =>
      [
        'post:likes',
        `post:${params.postId}`,
        `cursor:${params.cursor ?? 'root'}`,
        `limit:${params.limit}`,
      ].join(':'),
    getLikesPage: async () => cachedLikesPage,
    setLikesPage: async () => undefined,
  };

  const media = {
    removeFile: async (...args: unknown[]) => {
      calls.removeFile.push(args);
    },
    deleteUploadedFile: async (...args: unknown[]) => {
      calls.removeFile.push(args);
    },
    processAndUploadPostImage: async (...args: unknown[]) => {
      calls.processAndUploadPostImage.push(args);
      return {
        key: 'post-image-key',
        ufsUrl: 'https://files.example.com/post-image.webp',
        name: 'post-image.webp',
        size: 1234,
      };
    },
  };

  const service = new PostService(
    db as any,
    cache as any,
    media as any,
  );

  return {
    service,
    calls,
    setVisiblePostResult: (value: typeof postSummary | null) => {
      visiblePostResult = value;
    },
    setFeedIds: (value: string[] | null) => {
      feedIds = value;
    },
    setCachedPostCard: (value: null | typeof expectedPostCard) => {
      cachedPostCard = value;
    },
    setCachedLikesPage: (
      value: null | Array<{ id: number; likedAt: string }>,
    ) => {
      cachedLikesPage = value;
    },
    setLikeRecord: (value: null | { postId: number; userId: number }) => {
      likeRecord = value;
    },
  };
}

describe('PostService', () => {
  let fixture: ReturnType<typeof createServiceFixture>;

  beforeEach(() => {
    fixture = createServiceFixture();
  });

  it('creates a post without media and refreshes the feed cache', async () => {
    const result = await fixture.service.create(
      { content: 'Hello world', visibility: 'PUBLIC' } as any,
      viewer,
    );

    expect(result).toEqual(expectedPostCard);
    expect(fixture.calls.postCreate.length).toBe(1);
    expect(fixture.calls.bumpFeedVersion.length).toBe(1);
    expect(fixture.calls.deletePostCards).toEqual([
      [postSummary.id, viewer.id],
    ]);
  });

  it('creates a post with image media synchronously', async () => {
    const result = await fixture.service.create(
      { content: 'With image', visibility: 'PUBLIC' } as any,
      viewer,
      { buffer: Buffer.from('image'), originalname: 'post-image.jpg', size: 1234, mimetype: 'image/jpeg' } as any,
    );

    expect(result).toEqual(expectedPostCard);
    expect(fixture.calls.processAndUploadPostImage.length).toBe(1);
    expect(fixture.calls.postCreate.length).toBe(1);
  });

  it('returns a paginated feed from the database on cache miss', async () => {
    const result = await fixture.service.findAll(viewer, { limit: 1 });

    expect(result.items).toEqual([
      {
        ...expectedPostCard,
        likedByMe: true,
      },
    ]);
    expect(result.hasNextPage).toBe(true);
    expect(result.nextCursor).toBeTruthy();
    expect(fixture.calls.postFindMany.length).toBe(1);
    expect(fixture.calls.setFeedPage.length).toBe(1);
    expect(fixture.calls.postLikeFindMany.length).toBe(1);
  });

  it('returns cached feed cards and re-attaches like state', async () => {
    fixture.setFeedIds(['101']);
    fixture.setCachedPostCard(expectedPostCard);
    fixture.setLikeRecord({ postId: 101, userId: viewer.id });

    const result = await fixture.service.findAll(viewer, { limit: 1 });

    expect(result.items).toEqual([
      {
        ...expectedPostCard,
        likedByMe: true,
      },
    ]);
    expect(fixture.calls.postFindMany.length).toBe(0);
    expect(fixture.calls.postLikeFindMany.length).toBe(1);
  });

  it('throws when a hidden post cannot be viewed', async () => {
    fixture.setVisiblePostResult(null);

    await expect(fixture.service.findOne(101, viewer)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('likes and unlikes a post while keeping counts consistent', async () => {
    fixture.setLikeRecord(null);

    const liked = await fixture.service.like(101, viewer);
    expect(liked).toEqual({ likedByMe: true, likesCount: 2 });

    fixture.setLikeRecord({ postId: 101, userId: viewer.id });
    const unliked = await fixture.service.unlike(101, viewer);
    expect(unliked).toEqual({ likedByMe: false, likesCount: 2 });
  });
});
