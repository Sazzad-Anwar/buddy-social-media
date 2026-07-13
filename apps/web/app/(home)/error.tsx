'use client';

export default function HomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24 text-center py-5">
        <h4 className="_feed_inner_timeline_post_box_title mb-3">
          Failed to load feed
        </h4>
        <p className="_feed_inner_timeline_post_box_para mb-4">
          {error.message || 'An error occurred while loading the feed.'}
        </p>
        <button
          onClick={() => reset()}
          className="_feed_inner_text_area_btn_link btn btn-primary"
        >
          <span>Try again</span>
        </button>
      </div>
    </div>
  );
}
