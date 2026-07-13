import { NotFoundException } from '@nestjs/common';
import { ReplyService } from './reply.service';
import { Role } from '../enums/role.enum';
import type { User } from '@repo/types';

const viewer: User = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  role: Role.USER,
};

const visibleComment = {
  id: 201,
  postId: 10,
  authorId: 2,
  post: {
    id: 10,
    authorId: 2,
    visibility: 'PUBLIC' as const,
  },
};

type ReplySummary = {
  id: number;
  commentId: number;
  parentReplyId: number | null;
  authorId: number;
  content: string;
  repliesCount: number;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
  };
  likes: Array<{
    user: {
      id: number;
      firstName: string;
      lastName: string;
    };
  }>;
  comment: typeof visibleComment;
};

const replySummary: ReplySummary = {
  id: 301,
  commentId: 201,
  parentReplyId: null,
  authorId: 1,
  content: 'First reply',
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
  comment: visibleComment,
};

const secondReplySummary = {
  ...replySummary,
  id: 302,
  content: 'Second reply',
  createdAt: new Date('2026-07-12T09:55:00.000Z'),
  updatedAt: new Date('2026-07-12T09:55:00.000Z'),
  likes: [],
};

const expectedReplyCard = {
  id: 301,
  commentId: 201,
  parentReplyId: null,
  content: 'First reply',
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
    replyCreate: [] as unknown[][],
    replyFindUnique: [] as unknown[][],
    replyUpdate: [] as unknown[][],
    replyFindMany: [] as unknown[][],
    replyFindFirst: [] as unknown[][],
    replyLikeFindMany: [] as unknown[][],
    replyLikeFindUnique: [] as unknown[][],
    replyLikeCreate: [] as unknown[][],
    replyLikeDelete: [] as unknown[][],
    commentFindFirst: [] as unknown[][],
    commentUpdate: [] as unknown[][],
    bumpRepliesVersion: [] as unknown[][],
    bumpCommentsVersion: [] as unknown[][],
    deleteCommentCards: [] as unknown[][],
    setRepliesPage: [] as unknown[][],
  };

  let visibleCommentResult: typeof visibleComment | null = visibleComment;
  let visibleReplyResult: typeof replySummary | null = replySummary;
  let repliesFindManyResult = [replySummary, secondReplySummary];
  let createdReplyIdResult = { id: replySummary.id };
  let createdReplyLookupResult: typeof replySummary | null = replySummary;
  let cachedReplyIds: string[] | null = null;
  let cachedReplyCard = null as null | typeof expectedReplyCard;
  let replyLikeExists = false;

  const tx = {
    reply: {
      create: async (args: unknown) => {
        calls.replyCreate.push([args]);
        return createdReplyIdResult;
      },
      findUnique: async (args: unknown) => {
        calls.replyFindUnique.push([args]);
        return createdReplyLookupResult;
      },
      update: async (args: unknown) => {
        calls.replyUpdate.push([args]);
        return replySummary;
      },
    },
    comment: {
      update: async (args: unknown) => {
        calls.commentUpdate.push([args]);
        return null;
      },
    },
  };

  const db = {
    $transaction: async (cb: any) => cb(tx),
    comment: {
      findFirst: async (args: unknown) => {
        calls.commentFindFirst.push([args]);
        return visibleCommentResult;
      },
    },
    reply: {
      findMany: async (args: unknown) => {
        calls.replyFindMany.push([args]);
        return repliesFindManyResult;
      },
      findFirst: async (args: unknown) => {
        calls.replyFindFirst.push([args]);
        return visibleReplyResult;
      },
    },
    replyLike: {
      findMany: async (args: unknown) => {
        calls.replyLikeFindMany.push([args]);
        return replyLikeExists ? [{ replyId: 301 }] : [];
      },
      findUnique: async (args: unknown) => {
        calls.replyLikeFindUnique.push([args]);
        return replyLikeExists ? ({ replyId: 301, userId: viewer.id } as any) : null;
      },
      create: async (args: unknown) => {
        calls.replyLikeCreate.push([args]);
        replyLikeExists = true;
        return null;
      },
      delete: async (args: unknown) => {
        calls.replyLikeDelete.push([args]);
        replyLikeExists = false;
        return null;
      },
    },
  };

  const cache = {
    getRepliesVersion: async () => 1,
    bumpRepliesVersion: async (commentId: number) => {
      calls.bumpRepliesVersion.push([commentId]);
      return 2;
    },
    repliesPageKey: (params: {
      commentId: number;
      parentReplyId: number | null;
      version: number;
      viewerId: number;
      cursor: string | null;
      limit: number;
    }) =>
      [
        'reply:feed',
        `comment:${params.commentId}`,
        `parent:${params.parentReplyId ?? 'root'}`,
        `v${params.version}`,
        `viewer:${params.viewerId}`,
        `cursor:${params.cursor ?? 'root'}`,
        `limit:${params.limit}`,
      ].join(':'),
    getRepliesPage: async () => cachedReplyIds,
    setRepliesPage: async (key: string, ids: string[], ttlSeconds: number) => {
      calls.setRepliesPage.push([key, ids, ttlSeconds]);
      cachedReplyIds = ids;
    },
    getReplyCard: async () => cachedReplyCard,
    setReplyCard: async () => undefined,
    replySummaryKey: (params: {
      replyId: number;
      scope: 'public' | 'private';
      ownerId?: number;
    }) =>
      params.scope === 'private'
        ? `reply:summary:${params.replyId}:private:${params.ownerId ?? 0}`
        : `reply:summary:${params.replyId}:public`,
    deleteReplyCards: async () => undefined,
  };

  const commentCache = {
    bumpCommentsVersion: async (commentId: number) => {
      calls.bumpCommentsVersion.push([commentId]);
      return 2;
    },
    deleteCommentCards: async (...args: unknown[]) => {
      calls.deleteCommentCards.push(args);
    },
  };

  const service = new ReplyService(db as any, cache as any, commentCache as any);

  return {
    service,
    calls,
    setVisibleCommentResult: (value: typeof visibleComment | null) => {
      visibleCommentResult = value;
    },
    setRepliesFindManyResult: (value: unknown[]) => {
      repliesFindManyResult = value as any;
    },
    setCachedReplyIds: (value: string[] | null) => {
      cachedReplyIds = value;
    },
    setCachedReplyCard: (value: null | typeof expectedReplyCard) => {
      cachedReplyCard = value;
    },
    setReplyLikeExists: (value: boolean) => {
      replyLikeExists = value;
    },
    setVisibleReplyResult: (value: typeof replySummary | null) => {
      visibleReplyResult = value;
    },
    setCreatedReplyIdResult: (value: { id: number }) => {
      createdReplyIdResult = value;
    },
    setCreatedReplyLookupResult: (value: typeof replySummary | null) => {
      createdReplyLookupResult = value;
    },
  };
}

describe('ReplyService', () => {
  let fixture: ReturnType<typeof createServiceFixture>;

  beforeEach(() => {
    fixture = createServiceFixture();
  });

  it('creates a reply and invalidates thread caches', async () => {
    const result = await fixture.service.create(
      visibleComment.postId,
      visibleComment.id,
      { content: 'First reply' } as any,
      viewer,
    );

    expect(result).toEqual(expectedReplyCard);
    expect(fixture.calls.replyCreate.length).toBe(1);
    expect(fixture.calls.replyFindUnique.length).toBe(1);
    expect(fixture.calls.commentUpdate.length).toBe(1);
    expect(fixture.calls.bumpRepliesVersion).toEqual([[visibleComment.id]]);
    expect(fixture.calls.bumpCommentsVersion).toEqual([[visibleComment.postId]]);
    expect(fixture.calls.deleteCommentCards).toEqual([[visibleComment.id, visibleComment.post.authorId]]);
  });

  it('creates a nested reply under an existing reply', async () => {
    fixture.setCreatedReplyIdResult({ id: 303 });
    fixture.setCreatedReplyLookupResult({
      ...replySummary,
      id: 303,
      parentReplyId: 301,
    });

    const result = await fixture.service.create(
      visibleComment.postId,
      visibleComment.id,
      { content: 'Nested reply', parentReplyId: 301 } as any,
      viewer,
    );

    expect(result.parentReplyId).toBe(301);
    expect(result.commentId).toBe(visibleComment.id);
    expect(fixture.calls.replyCreate.length).toBe(1);
    expect(fixture.calls.replyUpdate.length).toBe(1);
    expect(fixture.calls.commentUpdate.length).toBe(1);
  });

  it('returns cached replies and re-attaches like state', async () => {
    fixture.setCachedReplyIds(['301']);
    fixture.setCachedReplyCard(expectedReplyCard);
    fixture.setReplyLikeExists(true);

    const result = await fixture.service.findAll(visibleComment.postId, visibleComment.id, viewer, {
      limit: 1,
    });

    expect(result.items).toEqual([
      {
        ...expectedReplyCard,
        likedByMe: true,
      },
    ]);
    expect(fixture.calls.replyFindMany.length).toBe(0);
    expect(fixture.calls.replyLikeFindMany.length).toBe(1);
  });

  it('likes and unlikes a reply while keeping counts consistent', async () => {
    fixture.setReplyLikeExists(false);

    const liked = await fixture.service.like(
      visibleComment.postId,
      visibleComment.id,
      301,
      viewer,
    );
    expect(liked).toEqual({ likedByMe: true, likesCount: 1 });

    fixture.setReplyLikeExists(true);

    const unliked = await fixture.service.unlike(
      visibleComment.postId,
      visibleComment.id,
      301,
      viewer,
    );
    expect(unliked).toEqual({ likedByMe: false, likesCount: 1 });

    expect(fixture.calls.replyLikeFindUnique.length).toBe(2);
    expect(fixture.calls.replyLikeCreate.length).toBe(1);
    expect(fixture.calls.replyLikeDelete.length).toBe(1);
    expect(fixture.calls.replyUpdate.length).toBe(2);
  });

  it('rejects access when the comment is hidden from the viewer', async () => {
    fixture.setVisibleCommentResult(null);

    await expect(
      fixture.service.findAll(visibleComment.postId, visibleComment.id, viewer, {}),
    ).rejects.toThrow(NotFoundException);
  });
});
