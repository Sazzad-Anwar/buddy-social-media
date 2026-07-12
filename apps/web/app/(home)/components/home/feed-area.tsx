'use client';

import Image from 'next/image';
import PostCard from '../post/post-card';
import { useEffect, useRef, useState } from 'react';
import type { FeedPage, PostCard as FeedPost } from '@repo/types';
import { loadFeedPageAction } from '../../action';

const PAGE_SIZE = 20;

type FeedAreaProps = {
  initialFeed: FeedPage;
};

function mergePosts(current: FeedPost[], next: FeedPost[]) {
  const seen = new Set(current.map((post) => post.id));
  const merged = [...current];

  for (const post of next) {
    if (!seen.has(post.id)) {
      seen.add(post.id);
      merged.push(post);
    }
  }

  return merged;
}

function getLikedByLabel(post: FeedPost) {
  const likedUsers = post.likedUsers.slice(0, 5);

  if (likedUsers.length === 0) {
    return 'No likes yet';
  }

  const names = likedUsers.map((user) => `${user.firstName} ${user.lastName}`);
  const remaining = Math.max(post.likesCount - likedUsers.length, 0);

  return remaining > 0
    ? `Liked by ${names.join(', ')} and ${remaining} more`
    : `Liked by ${names.join(', ')}`;
}

function PostImage({ post }: { post: FeedPost }) {
  if (post.imageStatus !== 'READY' || !post.imageUrl) {
    return (
      <div className="_feed_inner_timeline_image flex min-h-[240px] items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        {post.imageStatus === 'PENDING'
          ? 'Image is processing'
          : post.imageStatus === 'FAILED'
            ? 'Image failed to load'
            : 'No image'}
      </div>
    );
  }

  return (
    <div className="_feed_inner_timeline_image">
      <Image
        width={498}
        height={328}
        src={post.imageUrl}
        alt="Post media"
        className="_time_img"
      />
    </div>
  );
}

export default function FeedArea({ initialFeed }: FeedAreaProps) {
  const [items, setItems] = useState<FeedPost[]>(initialFeed.items);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialFeed.nextCursor,
  );
  const [hasNextPage, setHasNextPage] = useState(initialFeed.hasNextPage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasNextPage) {
      return;
    }

    let cancelled = false;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry?.isIntersecting || loadingRef.current || !nextCursor) {
          return;
        }

        setIsLoading(true);
        setError(null);
        loadingRef.current = true;

        try {
          const payload = await loadFeedPageAction(nextCursor, PAGE_SIZE);

          if (cancelled) {
            return;
          }

          setItems((current) => mergePosts(current, payload.items));
          setNextCursor(payload.nextCursor);
          setHasNextPage(payload.hasNextPage);
        } catch (loadError) {
          if (!cancelled) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : 'Failed to load more posts',
            );
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
            loadingRef.current = false;
          }
        }
      },
      {
        rootMargin: '400px 0px',
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);

    return () => {
      cancelled = true;
      observer.unobserve(sentinel);
      observer.disconnect();
    };
  }, [hasNextPage, nextCursor]);

  return (
    <div>
      {items.map((item) => (
        <PostCard key={item.id} postItem={item} />
      ))}
    </div>
  );
}
