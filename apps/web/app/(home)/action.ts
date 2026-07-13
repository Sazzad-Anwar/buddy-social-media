'use server';

import { serverRequest } from 'lib/server-api';
import {
  commentCardSchema,
  cursorPageSchema,
  feedPageSchema,
  PostCard,
  replyCardSchema,
  type FeedPage,
} from '@repo/types';
import { z } from 'zod';

const commentPageSchema = cursorPageSchema(commentCardSchema);
const replyPageSchema = cursorPageSchema(replyCardSchema);

export type CommentPage = z.infer<typeof commentPageSchema>;
export type ReplyPage = z.infer<typeof replyPageSchema>;
const replyResponseSchema = replyCardSchema;

function throwErrorOnErrorResponse(response: Response, payload: unknown) {
  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string'
        ? payload.message
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }
}

export async function loadFeedPageAction(
  cursor: string | null,
  limit = 20,
): Promise<FeedPage> {
  const query = new URLSearchParams({
    limit: String(limit),
  });

  if (cursor) {
    query.set('cursor', cursor);
  }

  const response = await serverRequest(`/post?${query.toString()}`, {
    cache: 'no-store',
  });

  const payload = await response.json();

  throwErrorOnErrorResponse(response, payload);

  return feedPageSchema.parse(payload);
}

export async function loadCommentsAction(
  postId: number,
  cursor: string | null,
  limit = 20,
): Promise<CommentPage> {
  const query = new URLSearchParams({
    limit: String(limit),
  });

  if (cursor) {
    query.set('cursor', cursor);
  }

  const response = await serverRequest(
    `/post/${postId}/comments?${query.toString()}`,
    {
      cache: 'no-store',
    },
  );

  const payload = await response.json();

  throwErrorOnErrorResponse(response, payload);

  return commentPageSchema.parse(payload);
}

export async function loadRepliesAction(
  postId: number,
  commentId: number,
  cursor: string | null,
  limit = 10,
): Promise<ReplyPage> {
  const query = new URLSearchParams({
    limit: String(limit),
  });

  if (cursor) {
    query.set('cursor', cursor);
  }

  const response = await serverRequest(
    `/post/${postId}/comments/${commentId}/replies?${query.toString()}`,
    {
      cache: 'no-store',
    },
  );

  const payload = await response.json();

  throwErrorOnErrorResponse(response, payload);

  return replyPageSchema.parse(payload);
}

export async function likePostAction(postId: number) {
  const response = await serverRequest(`/post/${postId}/like`, {
    method: 'POST',
  });
  const payload = await response.json();

  throwErrorOnErrorResponse(response, payload);
  return payload;
}

export async function unlikePostAction(postId: number) {
  const response = await serverRequest(`/post/${postId}/like`, {
    method: 'DELETE',
  });
  const payload = await response.json();

  throwErrorOnErrorResponse(response, payload);
  return payload;
}

export async function likeCommentAction(postId: number, commentId: number) {
  const response = await serverRequest(
    `/post/${postId}/comments/${commentId}/like`,
    {
      method: 'POST',
    },
  );
  const payload = await response.json();

  throwErrorOnErrorResponse(response, payload);
  return payload;
}

export async function unlikeCommentAction(postId: number, commentId: number) {
  const response = await serverRequest(
    `/post/${postId}/comments/${commentId}/like`,
    {
      method: 'DELETE',
    },
  );
  const payload = await response.json();

  throwErrorOnErrorResponse(response, payload);
  return payload;
}

export async function getPostByIdAction(postId: number): Promise<PostCard> {
  const response = await serverRequest(`/post/${postId}`, {
    method: 'GET',
    next: {
      tags: [`post-${postId}`],
    },
  });
  const payload = await response.json();

  throwErrorOnErrorResponse(response, payload);
  return payload;
}

export async function addCommentAction(postId: number, content: string) {
  const response = await serverRequest(`/post/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const payload = await response.json();

  throwErrorOnErrorResponse(response, payload);

  return payload;
}

export async function addReplyAction(
  postId: number,
  commentId: number,
  content: string,
  parentReplyId?: number,
) {
  const response = await serverRequest(
    `/post/${postId}/comments/${commentId}/replies`,
    {
      method: 'POST',
      body: JSON.stringify({
        content,
        ...(parentReplyId !== undefined ? { parentReplyId } : {}),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
  const payload = await response.json();

  throwErrorOnErrorResponse(response, payload);

  return replyResponseSchema.parse(payload);
}

export async function createPostAction(params: {
  content: string;
  image?: File | null;
  visibility?: 'PUBLIC' | 'PRIVATE';
}) {
  const formData = new FormData();
  formData.append('content', params.content);
  formData.append('visibility', params.visibility ?? 'PUBLIC');

  if (params.image) {
    formData.append('image', params.image);
  }

  const response = await serverRequest('/post', {
    method: 'POST',
    body: formData,
  });
  const payload = await response.json();

  throwErrorOnErrorResponse(response, payload);
  return payload;
}

export async function likeReplyAction(
  postId: number,
  commentId: number,
  replyId: number,
) {
  const response = await serverRequest(
    `/post/${postId}/comments/${commentId}/replies/${replyId}/like`,
    {
      method: 'POST',
    },
  );
  const payload = await response.json();

  throwErrorOnErrorResponse(response, payload);

  return payload;
}

export async function unlikeReplyAction(
  postId: number,
  commentId: number,
  replyId: number,
) {
  const response = await serverRequest(
    `/post/${postId}/comments/${commentId}/replies/${replyId}/like`,
    {
      method: 'DELETE',
    },
  );
  const payload = await response.json();

  throwErrorOnErrorResponse(response, payload);

  return payload;
}

export async function deletePostAction(postId: number) {
  const response = await serverRequest(`/post/${postId}`, {
    method: 'DELETE',
  });
  const payload = await response.json();

  throwErrorOnErrorResponse(response, payload);
  return payload;
}
