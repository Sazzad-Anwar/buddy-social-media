'use client';

import PostCard from '../post/post-card';
import { useEffect, useRef, useState } from 'react';
import type { FeedPage, PostCard as FeedPost } from '@repo/types';
import { loadFeedPageAction } from '../../action';
import { useRouter } from 'next/navigation';

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

export default function FeedArea({ initialFeed }: FeedAreaProps) {
  const router = useRouter();
  const [items, setItems] = useState<FeedPost[]>(initialFeed.items);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialFeed.nextCursor,
  );
  const [hasNextPage, setHasNextPage] = useState(initialFeed.hasNextPage);
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setItems(initialFeed.items);
    setNextCursor(initialFeed.nextCursor);
    setHasNextPage(initialFeed.hasNextPage);
  }, [initialFeed]);

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
        <PostCard
          key={item.id}
          postItem={item}
          onPostDeleted={() => router.refresh()}
        />
      ))}
    </div>
  );
}
