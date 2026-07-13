import { NotFoundException } from '@nestjs/common';
import { CommentService } from './comment.service';
import { Role } from '../enums/role.enum';
import type { User } from '@repo/types';

const viewer: User = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  role: Role.USER,
};

const visiblePost = {
  id: 10,
  authorId: 2,
  visibility: 'PUBLIC',
};

const commentSummary = {
  id: 101,
  postId: 10,
  authorId: 1,
  content: 'First comment',
  repliesCount: 0,
  likesCount: 1,
  createdAt: new Date('2026-07-12T10:00:00.000Z'),
  updatedAt: new Date('2026-07-12T10:00:00.000Z'),
  author: {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: Role.USER,
  },
  likes: [
    {
      user: {
        id: 3,
        firstName: 'Jane',
        lastName: 'Smith',
      },
    },
  ],
};

const secondCommentSummary = {
  ...commentSummary,
  id: 102,
  content: 'Second comment',
  createdAt: new Date('2026-07-12T09:55:00.000Z'),
  updatedAt: new Date('2026-07-12T09:55:00.000Z'),
  likes: [],
};

const expectedCommentCard = {
  id: 101,
  postId: 10,
  content: 'First comment',
  repliesCount: 0,
  likesCount: 1,
  createdAt: '2026-07-12T10:00:00.000Z',
  updatedAt: '2026-07-12T10:00:00.000Z',
  author: {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: Role.USER,
  },
  likedUsers: [
    {
      id: 3,
      firstName: 'Jane',
      lastName: 'Smith',
    },
  ],
  likedByMe: false,
};

function createServiceFixture() {
  const calls = {
    postFindFirst: [] as unknown[][],
    postUpdate: [] as unknown[][],
    commentCreate: [] as unknown[][],
    commentUpdate: [] as unknown[][],
    commentFindMany: [] as unknown[][],
    commentFindFirst: [] as unknown[][],
    commentLikeFindMany: [] as unknown[][],
    commentLikeFindUnique: [] as unknown[][],
    commentLikeCreate: [] as unknown[][],
    commentLikeDelete: [] as unknown[][],
    bumpCommentsVersion: [] as unknown[][],
    bumpFeedVersion: [] as unknown[][],
    deletePostCards: [] as unknown[][],
    setCommentsPage: [] as unknown[][],
  };

  let visiblePostResult: typeof visiblePost | null = visiblePost;
  let visibleCommentResult: typeof commentSummary | null = commentSummary;
  let commentsFindManyResult = [commentSummary, secondCommentSummary];
  let cachedCommentIds: string[] | null = null;
  let cachedCommentCard = null as null | typeof expectedCommentCard;
  let likedCommentIds: number[] = [];
  let commentLikeExists = false;

  const tx = {
    comment: {
      create: async (args: unknown) => {
        calls.commentCreate.push([args]);
        return commentSummary;
      },
      update: async (args: unknown) => {
        calls.commentUpdate.push([args]);
        return commentSummary;
      },
    },
    post: {
      update: async (args: unknown) => {
        calls.postUpdate.push([args]);
        return null;
      },
    },
  };

  const db = {
    $transaction: async (cb: any) => cb(tx),
    post: {
      findFirst: async (args: unknown) => {
        calls.postFindFirst.push([args]);
        return visiblePostResult;
      },
    },
    comment: {
      findMany: async (args: unknown) => {
        calls.commentFindMany.push([args]);
        return commentsFindManyResult;
      },
      findFirst: async (args: unknown) => {
        calls.commentFindFirst.push([args]);
        if (visibleCommentResult) {
          return commentSummary;
        }
        return null;
      },
    },
    commentLike: {
      findMany: async (args: unknown) => {
        calls.commentLikeFindMany.push([args]);
        return likedCommentIds.map((commentId) => ({ commentId }));
      },
      findUnique: async (args: unknown) => {
        calls.commentLikeFindUnique.push([args]);
        return commentLikeExists ? ({ commentId: 101, userId: viewer.id } as any) : null;
      },
      create: async (args: unknown) => {
        calls.commentLikeCreate.push([args]);
        commentLikeExists = true;
        return null;
      },
      delete: async (args: unknown) => {
        calls.commentLikeDelete.push([args]);
        commentLikeExists = false;
        return null;
      },
    },
  };

  const cache = {
    getCommentsVersion: async () => 1,
    bumpCommentsVersion: async (postId: number) => {
      calls.bumpCommentsVersion.push([postId]);
      return 2;
    },
    commentsPageKey: (params: {
      postId: number;
      version: number;
      viewerId: number;
      cursor: string | null;
      limit: number;
    }) =>
      [
        'comment:feed',
        `post:${params.postId}`,
        `v${params.version}`,
        `viewer:${params.viewerId}`,
        `cursor:${params.cursor ?? 'root'}`,
        `limit:${params.limit}`,
      ].join(':'),
    getCommentsPage: async () => cachedCommentIds,
    setCommentsPage: async (key: string, ids: string[], ttlSeconds: number) => {
      calls.setCommentsPage.push([key, ids, ttlSeconds]);
      cachedCommentIds = ids;
    },
    getCommentCard: async () => cachedCommentCard,
    setCommentCard: async () => undefined,
  };

  const postCache = {
    bumpFeedVersion: async () => {
      calls.bumpFeedVersion.push([]);
      return 2;
    },
    deletePostCards: async (...args: unknown[]) => {
      calls.deletePostCards.push(args);
    },
  };

  const service = new CommentService(db as any, cache as any, postCache as any);

  return {
    service,
    calls,
    setVisiblePostResult: (value: typeof visiblePost | null) => {
      visiblePostResult = value;
    },
    setCommentsFindManyResult: (value: unknown[]) => {
      commentsFindManyResult = value as any;
    },
    setVisibleCommentResult: (value: typeof commentSummary | null) => {
      visibleCommentResult = value;
    },
    setCachedCommentIds: (value: string[] | null) => {
      cachedCommentIds = value;
    },
    setCachedCommentCard: (value: null | typeof expectedCommentCard) => {
      cachedCommentCard = value;
    },
    setLikedCommentIds: (value: number[]) => {
      likedCommentIds = value;
    },
    setCommentLikeExists: (value: boolean) => {
      commentLikeExists = value;
    },
  };
}

describe('CommentService', () => {
  let fixture: ReturnType<typeof createServiceFixture>;

  beforeEach(() => {
    fixture = createServiceFixture();
  });

  it('creates a comment and invalidates feed and comment caches', async () => {
    const result = await fixture.service.create(
      visiblePost.id,
      { content: 'First comment' } as any,
      viewer,
    );

    expect(result).toEqual(expectedCommentCard);
    expect(fixture.calls.postFindFirst.length).toBe(1);
    expect(fixture.calls.commentCreate.length).toBe(1);
    expect(fixture.calls.postUpdate.length).toBe(1);
    expect(fixture.calls.bumpCommentsVersion).toEqual([[visiblePost.id]]);
    expect(fixture.calls.bumpFeedVersion.length).toBe(1);
    expect(fixture.calls.deletePostCards).toEqual([
      [visiblePost.id, visiblePost.authorId],
    ]);
  });

  it('returns a paginated feed from the database on cache miss', async () => {
    fixture.setCommentsFindManyResult([commentSummary, secondCommentSummary]);

    const result = await fixture.service.findAll(visiblePost.id, viewer, {
      limit: 1,
    });

    expect(result.items).toEqual([expectedCommentCard]);
    expect(result.hasNextPage).toBe(true);
    expect(result.nextCursor).toBeTruthy();
    expect(fixture.calls.commentFindMany.length).toBe(1);
    expect(fixture.calls.commentLikeFindMany).toEqual([
      [
        {
          where: {
            commentId: { in: [101] },
            userId: viewer.id,
          },
          select: { commentId: true },
        },
      ],
    ]);
    expect(fixture.calls.setCommentsPage.length).toBe(1);
  });

  it('returns cached comments and re-attaches like state', async () => {
    fixture.setCachedCommentIds(['101']);
    fixture.setCachedCommentCard(expectedCommentCard);
    fixture.setLikedCommentIds([101]);

    const result = await fixture.service.findAll(visiblePost.id, viewer, {
      limit: 1,
    });

    expect(result.items).toEqual([
      {
        ...expectedCommentCard,
        likedByMe: true,
      },
    ]);
    expect(fixture.calls.commentFindMany.length).toBe(0);
    expect(fixture.calls.commentLikeFindMany).toEqual([
      [
        {
          where: {
            commentId: { in: [101] },
            userId: viewer.id,
          },
          select: { commentId: true },
        },
      ],
    ]);
  });

  it('rejects access when the post is hidden from the viewer', async () => {
    fixture.setVisiblePostResult(null);

    await expect(
      fixture.service.findAll(visiblePost.id, viewer, {}),
    ).rejects.toThrow(NotFoundException);
  });

  it('likes and unlikes a comment while keeping counts consistent', async () => {
    fixture.setCommentLikeExists(false);

    const liked = await fixture.service.like(visiblePost.id, 101, viewer);
    expect(liked).toEqual({ likedByMe: true, likesCount: 1 });

    fixture.setCommentLikeExists(true);

    const unliked = await fixture.service.unlike(visiblePost.id, 101, viewer);
    expect(unliked).toEqual({ likedByMe: false, likesCount: 1 });

    expect(fixture.calls.commentLikeFindUnique.length).toBe(2);
    expect(fixture.calls.commentLikeCreate.length).toBe(1);
    expect(fixture.calls.commentLikeDelete.length).toBe(1);
    expect(fixture.calls.commentUpdate.length).toBe(2);
    expect(fixture.calls.deletePostCards.length).toBe(2);
  });
});
