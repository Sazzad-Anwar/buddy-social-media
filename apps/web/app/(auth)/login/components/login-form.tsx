'use client';

import { useForm, Controller } from 'react-hook-form';
import { LoginDto, loginSchema } from '@repo/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from 'lib/utils';
import { loginAction } from 'app/(auth)/action';

export default function LoginForm() {
  const form = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'sazzadzihan@gmail.com',
      password: 'password',
    },
  });

  const onSubmit = async (loginData: LoginDto) => {
    await loginAction(loginData);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="_social_login_form">
      <div className="row">
        {/* ---------- Email ---------- */}
        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
          <Controller
            control={form.control}
            name="email"
            render={({ field, formState }) => (
              <div className="_social_login_form_input _mar_b14">
                <label
                  className={cn(
                    '_social_login_label _mar_b8',
                    formState.errors.email ? '_label_error' : null,
                  )}
                >
                  Email
                </label>
                <input
                  type="email"
                  {...field}
                  className={cn(
                    'form-control _social_login_input',
                    formState.errors.email ? '_input_error' : null,
                  )}
                />
                {formState.errors.email ? (
                  <span className="_label_error" style={{ fontSize: 12 }}>
                    {formState.errors.email.message}
                  </span>
                ) : null}
              </div>
            )}
          />
        </div>

        {/* ---------- Password ---------- */}
        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
          <Controller
            control={form.control}
            name="password"
            render={({ field, formState }) => (
              <div className="_social_login_form_input _mar_b14">
                <label
                  className={cn(
                    '_social_login_label _mar_b8',
                    formState.errors.password ? '_label_error' : null,
                  )}
                >
                  Password
                </label>
                <input
                  type="password"
                  {...field}
                  className={cn(
                    'form-control _social_login_input',
                    formState.errors.password ? '_input_error' : null,
                  )}
                />
                {formState.errors.password ? (
                  <span className="_label_error" style={{ fontSize: 12 }}>
                    {formState.errors.password.message}
                  </span>
                ) : null}
              </div>
            )}
          />
        </div>
      </div>

      {/* ---------- Remember me / Forgot password ---------- */}
      <div className="row">
        <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
          <div className="form-check _social_login_form_check">
            <input
              className="form-check-input _social_login_form_check_input"
              type="radio"
              name="flexRadioDefault"
              id="flexRadioDefault2"
              defaultChecked
            />
            <label
              className="form-check-label _social_login_form_check_label"
              htmlFor="flexRadioDefault2"
            >
              Remember me
            </label>
          </div>
        </div>
        <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
          <div className="_social_login_form_left">
            <p className="_social_login_form_left_para">Forgot password?</p>
          </div>
        </div>
      </div>

      {/* ---------- Submit button ---------- */}
      <div className="row">
        <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
          <div className="_social_login_form_btn _mar_t40 _mar_b60">
            <button
              type="submit"
              className="_social_login_form_btn_link _btn1"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Logging...' : 'Login now'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
