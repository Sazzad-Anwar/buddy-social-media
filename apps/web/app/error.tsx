'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="_social_login_wrapper">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-5 col-lg-6 col-md-8 col-sm-10">
            <div className="_social_login_content text-center">
              <h2 className="_social_login_content_title mb-3">
                Something went wrong
              </h2>
              <p className="_social_login_content_para mb-4">
                An unexpected error occurred. Please try again.
              </p>
              <button
                onClick={() => reset()}
                className="_social_login_content_btn mx-auto"
              >
                <span>Try again</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
