import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="_social_login_wrapper">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-5 col-lg-6 col-md-8 col-sm-10">
            <div className="_social_login_content text-center">
              <h2 className="_social_login_content_title mb-3">
                Page not found
              </h2>
              <p className="_social_login_content_para mb-4">
                The page you are looking for does not exist or has been moved.
              </p>
              <Link
                href="/"
                className="_social_login_content_btn mx-auto d-inline-flex"
              >
                <span>Go home</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
