'use client';

import {
  addCommentAction,
  loadCommentsAction,
  type CommentPage,
} from '../../action';
import { avatarUrl } from 'lib/constants';
import Image from 'next/image';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { CommentItem } from './comment-item';
import { useCurrentUserStore } from 'store/current-user.store';
import type { CommentCard } from '@repo/types';

type Props = {
  postId: number;
  setCommentCount: Dispatch<SetStateAction<number>>;
  totalComments: number;
};

type CommentPageKey = readonly [
  'comments',
  number,
  string | null,
  number,
  number,
];

export default function CommentArea({
  postId,
  setCommentCount,
  totalComments,
}: Props) {
  const user = useCurrentUserStore((state) => state.user);
  const [content, setContent] = useState('');
  const limit = 10;
  const {
    data: pages,
    size,
    setSize,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWRInfinite<CommentPage>(
    (pageIndex, previousPageData) => {
      if (previousPageData && !previousPageData.hasNextPage) {
        return null;
      }

      const cursor =
        pageIndex === 0 ? null : (previousPageData?.nextCursor ?? null);

      return ['comments', postId, cursor, limit, pageIndex] as CommentPageKey;
    },
    async (key) => {
      const [, currentPostId, cursor, currentLimit] = key as CommentPageKey;
      return await loadCommentsAction(currentPostId, cursor, currentLimit);
    },
    {
      revalidateFirstPage: false,
      persistSize: true,
    },
  );

  const comments = useMemo(
    () => pages?.flatMap((page) => page.items) ?? [],
    [pages],
  );

  const lastPage = pages?.[pages.length - 1];
  const hasNextPage = lastPage?.hasNextPage ?? false;
  const loadingMore = isValidating && size > 1;

  const loadMore = () => {
    if (!hasNextPage || loadingMore) {
      return;
    }

    setSize(size + 1);
  };

  const postComment = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return;
    }

    const optimisticComment: CommentCard = {
      id: -Date.now(),
      postId,
      content: trimmedContent,
      repliesCount: 0,
      likesCount: 0,
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
      likedByMe: false,
    };

    setContent('');
    setCommentCount(totalComments + 1);

    await mutate(
      (currentPages): CommentPage[] | undefined => {
        if (!currentPages || currentPages.length === 0) {
          return [
            {
              items: [optimisticComment],
              nextCursor: null,
              hasNextPage: false,
            },
          ];
        }

        const [firstPage, ...restPages] = currentPages;

        if (!firstPage) {
          return [
            {
              items: [optimisticComment],
              nextCursor: null,
              hasNextPage: false,
            },
          ];
        }

        return [
          {
            items: [optimisticComment, ...firstPage.items],
            nextCursor: firstPage.nextCursor,
            hasNextPage: firstPage.hasNextPage,
          },
          ...restPages,
        ];
      },
      { revalidate: false },
    );

    try {
      const createdComment = await addCommentAction(postId, trimmedContent);

      await mutate(
        (currentPages) => {
          if (!currentPages) return currentPages;

          return currentPages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === optimisticComment.id ? createdComment : item,
            ),
          }));
        },
        { revalidate: false },
      );
    } catch (error) {
      console.log(error);

      await mutate(
        (currentPages) => {
          if (!currentPages) return currentPages;

          return currentPages.map((page) => ({
            ...page,
            items: page.items.filter(
              (item) => item.id !== optimisticComment.id,
            ),
          }));
        },
        { revalidate: false },
      );

      setContent(trimmedContent);
      setCommentCount(totalComments);
    }
  };

  return (
    <div className="_padd_b24">
      <div className="_feed_inner_timeline_cooment_area">
        <div className="_feed_inner_comment_box">
          <form className="_feed_inner_comment_box_form">
            <div className="_feed_inner_comment_box_content">
              <div className="_feed_inner_comment_box_content_image">
                <Image
                  height={25}
                  width={25}
                  src={avatarUrl + (user?.firstName as string)}
                  alt="user-profile"
                  className="_comment_img"
                  unoptimized
                />
              </div>
              <div className="_feed_inner_comment_box_content_txt">
                <textarea
                  className="form-control _comment_textarea"
                  placeholder="Write a comment"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void postComment();
                    }
                  }}
                />
              </div>
            </div>
            {/*<div className="_feed_inner_comment_box_icon">
              <button
                type="button"
                className="_feed_inner_comment_box_icon_btn"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill="#000"
                    fillOpacity=".46"
                    fillRule="evenodd"
                    d="M13.167 6.534a.5.5 0 01.5.5c0 3.061-2.35 5.582-5.333 5.837V14.5a.5.5 0 01-1 0v-1.629C4.35 12.616 2 10.096 2 7.034a.5.5 0 011 0c0 2.679 2.168 4.859 4.833 4.859 2.666 0 4.834-2.18 4.834-4.86a.5.5 0 01.5-.5zM7.833.667a3.218 3.218 0 013.208 3.22v3.126c0 1.775-1.439 3.22-3.208 3.22a3.218 3.218 0 01-3.208-3.22V3.887c0-1.776 1.44-3.22 3.208-3.22zm0 1a2.217 2.217 0 00-2.208 2.22v3.126c0 1.223.991 2.22 2.208 2.22a2.217 2.217 0 002.208-2.22V3.887c0-1.224-.99-2.22-2.208-2.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="_feed_inner_comment_box_icon_btn"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill="#000"
                    fillOpacity=".46"
                    fillRule="evenodd"
                    d="M10.867 1.333c2.257 0 3.774 1.581 3.774 3.933v5.435c0 2.352-1.517 3.932-3.774 3.932H5.101c-2.254 0-3.767-1.58-3.767-3.932V5.266c0-2.352 1.513-3.933 3.767-3.933h5.766zm0 1H5.101c-1.681 0-2.767 1.152-2.767 2.933v5.435c0 1.782 1.086 2.932 2.767 2.932h5.766c1.685 0 2.774-1.15 2.774-2.932V5.266c0-1.781-1.089-2.933-2.774-2.933zm.426 5.733l.017.015.013.013.009.008.037.037c.12.12.453.46 1.443 1.477a.5.5 0 11-.716.697S10.73 8.91 10.633 8.816a.614.614 0 00-.433-.118.622.622 0 00-.421.225c-1.55 1.88-1.568 1.897-1.594 1.922a1.456 1.456 0 01-2.057-.021s-.62-.63-.63-.642c-.155-.143-.43-.134-.594.04l-1.02 1.076a.498.498 0 01-.707.018.499.499 0 01-.018-.706l1.018-1.075c.54-.573 1.45-.6 2.025-.06l.639.647c.178.18.467.184.646.008l1.519-1.843a1.618 1.618 0 011.098-.584c.433-.038.854.088 1.19.363zM5.706 4.42c.921 0 1.67.75 1.67 1.67 0 .92-.75 1.67-1.67 1.67-.92 0-1.67-.75-1.67-1.67 0-.921.75-1.67 1.67-1.67zm0 1a.67.67 0 10.001 1.34.67.67 0 00-.002-1.34z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>*/}
          </form>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <>
          {comments.length !== 0 ? (
            <div className="_timline_comment_main">
              <div className="_previous_comment">
                {hasNextPage ? (
                  <button
                    type="button"
                    className="_previous_comment_txt"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading comments...' : 'View more comments'}
                  </button>
                ) : null}
              </div>

              {comments.map((comment) => (
                <CommentItem
                  key={'comment-' + comment.id}
                  postId={postId}
                  comment={comment}
                />
              ))}

              {error ? (
                <p className="_previous_comment_txt">
                  {error instanceof Error
                    ? error.message
                    : 'Failed to load comments'}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Loader() {
  return (
    <div className="_timline_comment_main">
      <div className="_comment_main">
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
    </div>
  );
}
