import Image from 'next/image';
import LoginForm from './components/login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <section className="_social_login_wrapper _layout_main_wrapper">
      <div className="_shape_one">
        <Image
          height={0}
          width={0}
          src="/images/shape1.svg"
          alt="_shape_img"
          className="_shape_img"
        />
        <Image
          height={0}
          width={0}
          src="/images/dark_shape.svg"
          alt="_dark_shape"
          className="_dark_shape"
        />
      </div>
      <div className="_shape_two">
        <Image
          height={0}
          width={0}
          src="/images/shape2.svg"
          alt="_shape_img"
          className="_shape_img"
        />
        <Image
          height={0}
          width={0}
          src="/images/dark_shape1.svg"
          alt="_dark_shape"
          className="_dark_shape _dark_shape_opacity"
        />
      </div>
      <div className="_shape_three">
        <Image
          height={0}
          width={0}
          src="/images/shape3.svg"
          alt="_shape_img"
          className="_shape_img"
        />
        <Image
          height={0}
          width={0}
          src="/images/dark_shape2.svg"
          alt="_dark_shape"
          className="_dark_shape _dark_shape_opacity"
        />
      </div>
      <div className="_social_login_wrap">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
              <div className="_social_login_left">
                <div className="_social_login_left_image">
                  <Image
                    height={0}
                    width={633}
                    src="/images/login.png"
                    alt="_left_img"
                    className="_left_img"
                  />
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
              <div className="_social_login_content">
                <div className="_social_login_left_logo _mar_b28">
                  <Image
                    height={0}
                    width={0}
                    src="/images/logo.svg"
                    alt="_left_logo"
                    className="_left_logo"
                    loading="lazy"
                  />
                </div>
                <p className="_social_login_content_para _mar_b8">
                  Welcome back
                </p>
                <h4 className="_social_login_content_title _titl4 _mar_b50">
                  Login to your account
                </h4>
                <button
                  type="button"
                  className="_social_login_content_btn _mar_b40"
                >
                  <Image
                    height={0}
                    width={0}
                    src="/images/google.svg"
                    alt="_google_img"
                    className="_google_img"
                  />{' '}
                  <span>Or sign-in with google</span>
                </button>
                <div className="_social_login_content_bottom_txt _mar_b40">
                  <span>Or</span>
                </div>
                <LoginForm />
                <div className="row">
                  <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                    <div className="_social_login_bottom_txt">
                      <p className="_social_login_bottom_txt_para">
                        Dont have an account?{' '}
                        <Link href="/registration">Create New Account</Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
