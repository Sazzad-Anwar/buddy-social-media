import Image from 'next/image';
import Link from 'next/link';
import RegistrationForm from './components/registration-form';

export default function RegistrationPage() {
  return (
    <section className="_social_registration_wrapper _layout_main_wrapper">
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
          alt="_dark_shape _dark_shape_opacity"
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
          alt="_dark_shape _dark_shape_opacity"
          className="_dark_shape _dark_shape_opacity"
        />
      </div>
      <div className="_social_registration_wrap">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
              <div className="_social_registration_right">
                <div className="_social_registration_right_image">
                  <Image
                    height={0}
                    width={633}
                    src="/images/registration.png"
                    alt="_social_registration_right_image"
                  />
                </div>
                <div className="_social_registration_right_image_dark">
                  <Image
                    height={0}
                    width={0}
                    src="/images/registration1.png"
                    alt="_social_registration_right_image_dark"
                  />
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
              <div className="_social_registration_content">
                <div className="_social_registration_right_logo _mar_b28">
                  <Image
                    height={0}
                    width={0}
                    src="/images/logo.svg"
                    alt="_right_logo"
                    className="_right_logo"
                    loading="lazy"
                  />
                </div>
                <p className="_social_registration_content_para _mar_b8">
                  Get Started Now
                </p>
                <h4 className="_social_registration_content_title _titl4 _mar_b50">
                  Registration
                </h4>
                {/*<button
                  type="button"
                  className="_social_registration_content_btn _mar_b40"
                >
                  <Image
                    height={0}
                    width={0}
                    src="/images/google.svg"
                    alt="_google_img"
                    className="_google_img"
                  />{' '}
                  <span>Register with google</span>
                </button>
                <div className="_social_registration_content_bottom_txt _mar_b40">
                  <span>Or</span>
                </div>*/}
                <RegistrationForm />
                <div className="row">
                  <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                    <div className="_social_registration_bottom_txt">
                      <p className="_social_registration_bottom_txt_para">
                        Already has an account? <Link href="/login">Login</Link>
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
