'use client';

import { type ReactNode, useCallback, useRef, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import type { LikeUsersPage } from '@repo/types';

type LikeUsersPageKey = readonly [string, string | null, number];

type Props = {
  children: ReactNode;
  likesCount: number;
  entityKey: string;
  fetchLikes: (cursor: string | null, limit: number) => Promise<LikeUsersPage>;
};

export function LikeTooltip({
  children,
  likesCount,
  entityKey,
  fetchLikes,
}: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: pages,
    size,
    setSize,
    isValidating,
  } = useSWRInfinite<LikeUsersPage>(
    (pageIndex, previousPageData) => {
      if (!isVisible) {
        return null;
      }
      if (previousPageData && !previousPageData.hasNextPage) {
        return null;
      }
      const cursor =
        pageIndex === 0 ? null : (previousPageData?.nextCursor ?? null);
      return [entityKey, cursor, pageIndex] as LikeUsersPageKey;
    },
    async (key) => {
      const [, cursor] = key as LikeUsersPageKey;
      return await fetchLikes(cursor, 20);
    },
    {
      revalidateFirstPage: false,
      revalidateIfStale: false,
    },
  );

  const likers = pages?.flatMap((page) => page.items) ?? [];
  const lastPage = pages?.[pages.length - 1];
  const hasNextPage = lastPage?.hasNextPage ?? false;

  const showTooltip = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 300);
  }, []);

  const hideTooltip = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 200);
  }, []);

  const keepVisible = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  if (likesCount === 0) {
    return <>{children}</>;
  }

  return (
    <div
      className="position-relative d-inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {isVisible ? (
        <div
          className="like-tooltip position-absolute mt-2 rounded-3 shadow-lg pb-1"
          style={{
            minWidth: 220,
            maxWidth: 300,
            left: 0,
            top: '100%',
            zIndex: 9999,
          }}
          onMouseEnter={keepVisible}
          onMouseLeave={hideTooltip}
        >
          <div
            className="like-tooltip-header px-3 py-2 fw-semibold"
            style={{ fontSize: 14 }}
          >
            <span className="like-tooltip-count">{likesCount}</span>{' '}
            {likesCount === 1 ? 'Like' : 'Likes'}
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {likers.map((liker) => (
              <div
                key={liker.id}
                className="px-3 py-1"
                style={{ fontSize: 13 }}
              >
                <span className="like-tooltip-name fw-medium">
                  {liker.firstName} {liker.lastName}
                </span>
              </div>
            ))}
            {isValidating && likers.length === 0 ? (
              <div
                className="like-tooltip-loading px-3 py-2"
                style={{ fontSize: 13 }}
              >
                Loading...
              </div>
            ) : null}
          </div>
          {hasNextPage ? (
            <button
              type="button"
              className="like-tooltip-more w-100 px-3 py-2 border-0 fw-medium"
              style={{ fontSize: 13, background: 'transparent' }}
              onClick={() => setSize(size + 1)}
              disabled={isValidating}
            >
              {isValidating ? 'Loading...' : 'Show more'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
