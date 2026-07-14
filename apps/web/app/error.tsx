'use client';

import ThemeToggle from './(home)/components/theme-toogle';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div id="theme-root" className="_layout _layout_main_wrapper">
      <ThemeToggle />
      <div className="_main_layout">
        <div className="container _custom_container">
          <div className="_layout_inner_wrap">
            <div className="row">
              <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12" />
              <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
                <div
                  className="_layout_middle_wrap mt-5"
                  style={{
                    height: 'calc(100dvh - 110px)',
                  }}
                >
                  <div className="_layout_middle_inner">
                    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_t24 _mar_b16">
                      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
                        <div className="py-5">
                          <div className="_feed_inner_timeline_post_box d-flex flex-column ">
                            <h2 className="_left_inner_area_suggest_content_title _title5 mb-3">
                              Something went wrong
                            </h2>
                            <p className="_feed_inner_timeline_post_box_para text-capitalize mb-4">
                              An unexpected error occurred. Please try again.
                            </p>
                            <button
                              onClick={() => reset()}
                              className="_right_info_btn_link _right_info_btn_link_active"
                            >
                              <span>Try again</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
