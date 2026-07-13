'use client';

import type { CommentCard } from '@repo/types';
import type { ReplyCard } from '@repo/types';
import dayjs from 'dayjs';
import { avatarUrl } from 'lib/constants';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from 'lib/utils';
import { ReplyThread } from './reply-thread';
import {
  addReplyAction,
  likeCommentAction,
  unlikeCommentAction,
} from '../../action';
import { useEffect, useRef, useState } from 'react';

type Props = {
  postId: number;
  comment: CommentCard;
};

export function CommentItem({ postId, comment }: Props) {
  const authorName = `${comment.author.firstName} ${comment.author.lastName}`;
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isLikedByMe, setIsLikedByMe] = useState(comment.likedByMe);
  const [likeCount, setLikeCount] = useState(comment.likesCount);
  const [replyCount, setReplyCount] = useState(comment.repliesCount);
  const [replyRefreshKey, setReplyRefreshKey] = useState(0);
  const [replyFocusKey, setReplyFocusKey] = useState(0);
  const [optimisticReply, setOptimisticReply] = useState<ReplyCard | null>(
    null,
  );
  const isTogglingLikeRef = useRef(false);

  useEffect(() => {
    setIsLikedByMe(comment.likedByMe);
    setLikeCount(comment.likesCount);
  }, [comment.likedByMe, comment.likesCount, comment.id]);

  const toggleCommentLike = async () => {
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
        await likeCommentAction(postId, comment.id);
      } else {
        await unlikeCommentAction(postId, comment.id);
      }
    } catch (error) {
      setIsLikedByMe(previousLikedByMe);
      setLikeCount(previousLikeCount);
      console.log(error);
    } finally {
      isTogglingLikeRef.current = false;
    }
  };

  const submitReply = async () => {
    const trimmedReply = replyContent.trim();
    if (!trimmedReply || isSubmittingReply) {
      return;
    }

    try {
      setIsSubmittingReply(true);
      const createdReply = await addReplyAction(
        postId,
        comment.id,
        trimmedReply,
      );
      setReplyContent('');
      setReplyCount((current) => current + 1);
      setOptimisticReply(createdReply);
      setReplyRefreshKey((current) => current + 1);
      setReplyFocusKey((current) => current + 1);
    } catch (error) {
      console.log(error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="_comment_main">
        <div className="_comment_image">
          <Link href="/" className="_comment_image_link">
            <Image
              height={40}
              width={40}
              src={avatarUrl + `${authorName}`}
              alt="comment-img"
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
                <span>{comment.content}</span>
              </p>
            </div>
            {likeCount > 0 || replyCount > 0 ? (
              <div className="_total_reactions">
                {likeCount > 0 ? (
                  <div className="d-inline-flex align-items-center">
                    <div className="_total_react">
                      <button
                        type="button"
                        className="border-0 bg-transparent p-0"
                      >
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
                      </button>
                    </div>
                    <span className="_total">{likeCount}</span>
                  </div>
                ) : null}
                {replyCount > 0 ? (
                  <div className="d-inline-flex align-items-center">
                    <div className="_total_react ms-2">
                      <button
                        type="button"
                        className="border-0 bg-transparent p-0"
                      >
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
                          >
                            <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
                          </svg>
                        </span>
                      </button>
                    </div>
                    <span className="_total">{replyCount}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="_comment_reply">
              <div className="_comment_reply_num">
                <ul className="_comment_reply_list">
                  <li>
                    <span
                      className="border-0 bg-transparent p-0"
                      onClick={toggleCommentLike}
                    >
                      {isLikedByMe ? 'Unlike' : 'Like'}
                    </span>
                  </li>
                  <li>
                    <span
                      className="border-0 bg-transparent p-0"
                      onClick={() => {
                        setIsReplying((current) => {
                          const next = !current;
                          if (next) {
                            setReplyFocusKey((focus) => focus + 1);
                          }
                          return next;
                        });
                      }}
                    >
                      Reply.
                    </span>
                  </li>
                  <li>
                    <span className="_time_link">
                      {dayjs(comment.createdAt).fromNow()}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          {isReplying ? (
            <ReplyThread
              postId={postId}
              commentId={comment.id}
              commentAuthorName={authorName}
              replyCount={replyCount}
              isReplying={isReplying}
              replyContent={replyContent}
              isSubmittingReply={isSubmittingReply}
              onReplyContentChange={setReplyContent}
              onToggleReplying={() => setIsReplying((current) => !current)}
              onSubmitReply={submitReply}
              replyRefreshKey={replyRefreshKey}
              optimisticReply={optimisticReply}
              replyFocusKey={replyFocusKey}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
