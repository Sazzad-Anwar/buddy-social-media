'use client';

import {
  addReplyAction,
  loadRepliesAction,
  likeReplyAction,
  unlikeReplyAction,
  type ReplyPage,
} from '../../action';
import { avatarUrl } from 'lib/constants';
import dayjs from 'dayjs';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from 'lib/utils';
import useSWRInfinite from 'swr/infinite';
import type { ReplyCard } from '@repo/types';
import { useCurrentUserStore } from 'store/current-user.store';

type Props = {
  postId: number;
  commentId: number;
  commentAuthorName: string;
  replyCount: number;
  isReplying: boolean;
  replyContent: string;
  onReplyContentChange: (value: string) => void;
  onToggleReplying: () => void;
  onReplySubmitted: () => void;
  replyFocusKey: number;
};

type ReplyPageKey = readonly [
  'replies',
  number,
  number,
  string | null,
  number,
  number,
];

export function ReplyThread({
  postId,
  commentId,
  commentAuthorName,
  replyCount,
  isReplying,
  replyContent,
  onReplyContentChange,
  onToggleReplying,
  onReplySubmitted,
  replyFocusKey,
}: Props) {
  const replyLimit = 5;
  const user = useCurrentUserStore((state) => state.user);

  const {
    data: replyPages,
    size: replySize,
    setSize: setReplySize,
    error: replyError,
    isLoading: isReplyLoading,
    isValidating: isReplyValidating,
    mutate: mutateReplies,
  } = useSWRInfinite<ReplyPage>(
    (pageIndex, previousPageData) => {
      if (previousPageData && !previousPageData.hasNextPage) {
        return null;
      }

      const cursor =
        pageIndex === 0 ? null : (previousPageData?.nextCursor ?? null);

      return [
        'replies',
        postId,
        commentId,
        cursor,
        replyLimit,
        pageIndex,
      ] as ReplyPageKey;
    },
    async (key) => {
      const [, currentPostId, currentCommentId, cursor, currentLimit] =
        key as ReplyPageKey;

      return await loadRepliesAction(
        currentPostId,
        currentCommentId,
        cursor,
        currentLimit,
      );
    },
    {
      revalidateFirstPage: false,
      persistSize: true,
    },
  );

  const replies = useMemo(
    () => replyPages?.flatMap((page) => page.items) ?? [],
    [replyPages],
  );

  const replyLastPage = replyPages?.[replyPages.length - 1];
  const hasNextReplyPage = replyLastPage?.hasNextPage ?? false;
  const loadingMoreReplies = isReplyValidating && replySize > 1;

  const submitReply = async () => {
    const trimmedReply = replyContent.trim();
    if (!trimmedReply) {
      return;
    }

    const optimisticId = -Date.now();

    const optimisticReply: ReplyCard = {
      id: optimisticId,
      commentId,
      parentReplyId: null,
      content: trimmedReply,
      repliesCount: 0,
      likesCount: 0,
      likedByMe: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: user
        ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
          }
        : {
            id: 0,
            firstName: 'Unknown',
            lastName: '',
            email: '',
            role: 'USER',
          },
      likedUsers: [],
    };

    // Step 1: Inject optimistic into SWR cache
    await mutateReplies(
      (currentPages): ReplyPage[] | undefined => {
        if (!currentPages || currentPages.length === 0) {
          return [
            {
              items: [optimisticReply],
              nextCursor: null,
              hasNextPage: false,
            },
          ];
        }

        const [firstPage, ...restPages] = currentPages;

        if (!firstPage) {
          return [
            {
              items: [optimisticReply],
              nextCursor: null,
              hasNextPage: false,
            },
          ];
        }

        return [
          {
            items: [optimisticReply, ...firstPage.items],
            nextCursor: firstPage.nextCursor,
            hasNextPage: firstPage.hasNextPage,
          },
          ...restPages,
        ];
      },
      { revalidate: false },
    );

    onReplySubmitted();

    try {
      const createdReply = await addReplyAction(
        postId,
        commentId,
        trimmedReply,
      );

      // Step 2: Replace optimistic with real reply
      await mutateReplies(
        (currentPages) => {
          if (!currentPages) return currentPages;

          return currentPages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === optimisticId ? createdReply : item,
            ),
          }));
        },
        { revalidate: false },
      );
    } catch (error) {
      console.log(error);

      // Step 3: Remove optimistic on error
      await mutateReplies(
        (currentPages) => {
          if (!currentPages) return currentPages;

          return currentPages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.id !== optimisticId),
          }));
        },
        { revalidate: false },
      );

      throw error;
    }
  };

  return (
    <>
      <ReplyHeader
        replyCount={replyCount}
        onToggleReplying={onToggleReplying}
      />

      {isReplying ? (
        <ReplyComposer
          commentAuthorName={commentAuthorName}
          replyContent={replyContent}
          userFirstName={user?.firstName ?? ''}
          userLastName={user?.lastName ?? ''}
          onReplyContentChange={onReplyContentChange}
          onSubmitReply={submitReply}
          replyFocusKey={replyFocusKey}
        />
      ) : null}

      {isReplyLoading && replies.length === 0 ? <ReplyLoading /> : null}

      {replies.length > 0 ? (
        <div className="space-y-4 border-l border-slate-200 pl-4">
          {replies.map((reply) => (
            <ReplyItem
              key={`reply-${reply.id}`}
              postId={postId}
              commentId={commentId}
              reply={reply}
            />
          ))}
          {hasNextReplyPage ? (
            <button
              type="button"
              className="_previous_comment_txt"
              onClick={() => {
                if (!loadingMoreReplies) {
                  setReplySize(replySize + 1);
                }
              }}
              disabled={loadingMoreReplies}
            >
              {loadingMoreReplies ? 'Loading replies...' : 'View more replies'}
            </button>
          ) : null}
        </div>
      ) : null}

      {replyError instanceof Error ? (
        <p className="mt-2 text-center text-sm text-danger">
          {replyError.message}
        </p>
      ) : null}
    </>
  );
}

type ReplyHeaderProps = {
  replyCount: number;
  onToggleReplying: () => void;
};

function ReplyHeader({ replyCount, onToggleReplying }: ReplyHeaderProps) {
  return (
    <div className="_comment_reply mt-2">
      <div className="_comment_reply_num">
        <ul className="_comment_reply_list">
          {replyCount > 0 ? (
            <li>
              <span>
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </span>
            </li>
          ) : null}
          <li>
            <span
              onClick={onToggleReplying}
              className="border-0 bg-transparent p-0"
            >
              Reply.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

type ReplyComposerProps = {
  commentAuthorName: string;
  replyContent: string;
  userFirstName: string;
  userLastName: string;
  onReplyContentChange: (value: string) => void;
  onSubmitReply: () => Promise<void>;
  replyFocusKey: number;
};

function ReplyComposer({
  commentAuthorName,
  replyContent,
  userFirstName,
  onReplyContentChange,
  onSubmitReply,
  replyFocusKey,
}: ReplyComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [replyFocusKey]);

  return (
    <div className="_feed_inner_comment_box mt-2 mb-4">
      <div className="_feed_inner_comment_box_content">
        <div className="_feed_inner_comment_box_content_image">
          <Image
            height={24}
            width={24}
            src={avatarUrl + userFirstName}
            alt="_comment_img"
            className="_comment_img"
            unoptimized
          />
        </div>
        <div className="_feed_inner_comment_box_content_txt">
          <textarea
            ref={textareaRef}
            className="form-control _comment_textarea"
            placeholder={`Reply to ${commentAuthorName}`}
            value={replyContent}
            onChange={(e) => onReplyContentChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void onSubmitReply();
              }
            }}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}

type ReplyItemProps = {
  postId: number;
  commentId: number;
  reply: ReplyCard;
};

function ReplyItem({ postId, commentId, reply }: ReplyItemProps) {
  const authorName = `${reply.author.firstName} ${reply.author.lastName}`;
  const [isLikedByMe, setIsLikedByMe] = useState(reply.likedByMe);
  const [likeCount, setLikeCount] = useState(reply.likesCount);
  const isTogglingLikeRef = useRef(false);

  useEffect(() => {
    setIsLikedByMe(reply.likedByMe);
    setLikeCount(reply.likesCount);
  }, [reply.id, reply.likedByMe, reply.likesCount]);

  const toggleReplyLike = async () => {
    if (isTogglingLikeRef.current) {
      return;
    }

    const previousLikedByMe = isLikedByMe;
    const previousLikeCount = likeCount;
    const nextLikedByMe = !isLikedByMe;
    const nextLikeCount = nextLikedByMe
      ? previousLikeCount + 1
      : previousLikeCount - 1;

    isTogglingLikeRef.current = true;
    setIsLikedByMe(nextLikedByMe);
    setLikeCount(nextLikeCount);

    try {
      if (nextLikedByMe) {
        await likeReplyAction(postId, commentId, reply.id);
      } else {
        await unlikeReplyAction(postId, commentId, reply.id);
      }
    } catch (error) {
      setIsLikedByMe(previousLikedByMe);
      setLikeCount(previousLikeCount);
      console.log(error);
    } finally {
      isTogglingLikeRef.current = false;
    }
  };

  return (
    <div className="_comment_main pl-8">
      <div className="_comment_image">
        <Link href="/" className="_comment_image_link">
          <Image
            height={34}
            width={34}
            src={avatarUrl + `${authorName}`}
            alt="reply-img"
            className="_comment_img1"
            unoptimized
          />
        </Link>
      </div>
      <div className="_comment_area">
        <div className="_comment_details">
          <div className="_comment_details_top">
            <div className="_comment_name">
              <Link href="/">
                <h4 className="_comment_name_title">{authorName}</h4>
              </Link>
            </div>
          </div>
          <div className="_comment_status">
            <p className="_comment_status_text">
              <span>{reply.content}</span>
            </p>
          </div>
          {likeCount > 0 ? (
            <div className="_total_reactions">
              <div className="d-inline-flex align-items-center">
                <div className="_total_react">
                  <span
                    className={cn(
                      '_reaction_like',
                      isLikedByMe ? '_reaction_active' : '',
                    )}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="feather feather-thumbs-up"
                    >
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                  </span>{' '}
                </div>
                <span className="_total">{likeCount}</span>
              </div>
            </div>
          ) : null}
          <div className="_comment_reply">
            <div className="_comment_reply_num">
              <ul className="_comment_reply_list">
                <li>
                  <span
                    onClick={toggleReplyLike}
                    className="border-0 bg-transparent p-0"
                  >
                    {isLikedByMe ? 'Unlike.' : 'Like.'}
                  </span>
                </li>
                <li>
                  <span className="_time_link">
                    {dayjs(reply.createdAt).fromNow()}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReplyLoading() {
  return (
    <div className="_comment_main pl-8">
      <div className="_comment_image">
        <Link href="/" className="_comment_image_link">
          <Image
            height={40}
            width={40}
            src={avatarUrl + ``}
            alt="comment-img"
            className="_comment_img1"
            unoptimized
          />
        </Link>
      </div>
      <div className="_comment_area">
        <div style={{ height: 80 }} className="_comment_details"></div>
      </div>
    </div>
  );
}
