'use client';

import { useForm, Controller } from 'react-hook-form';
import { createUserSchema } from '@repo/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from 'lib/utils';
import { registerAction } from 'app/(auth)/action';
import { z } from 'zod';

const registrationSchema = createUserSchema
  .extend({
    confirmPassword: z.string().nonempty('Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegistrationFormValues = z.infer<typeof registrationSchema>;

export default function RegistrationForm() {
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegistrationFormValues) => {
    await registerAction({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="_social_registration_form"
    >
      <div className="row">
        {/* ---------- First Name ---------- */}
        <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
          <Controller
            control={form.control}
            name="firstName"
            render={({ field, formState }) => (
              <div className="_social_registration_form_input _mar_b14">
                <label
                  className={cn(
                    '_social_registration_label _mar_b8',
                    formState.errors.firstName ? '_label_error' : null,
                  )}
                >
                  First Name
                </label>
                <input
                  type="text"
                  {...field}
                  className={cn(
                    'form-control _social_registration_input',
                    formState.errors.firstName ? '_input_error' : null,
                  )}
                />
                {formState.errors.firstName ? (
                  <span className="_label_error" style={{ fontSize: 12 }}>
                    {formState.errors.firstName.message}
                  </span>
                ) : null}
              </div>
            )}
          />
        </div>

        {/* ---------- Last Name ---------- */}
        <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
          <Controller
            control={form.control}
            name="lastName"
            render={({ field, formState }) => (
              <div className="_social_registration_form_input _mar_b14">
                <label
                  className={cn(
                    '_social_registration_label _mar_b8',
                    formState.errors.lastName ? '_label_error' : null,
                  )}
                >
                  Last Name
                </label>
                <input
                  type="text"
                  {...field}
                  className={cn(
                    'form-control _social_registration_input',
                    formState.errors.lastName ? '_input_error' : null,
                  )}
                />
                {formState.errors.lastName ? (
                  <span className="_label_error" style={{ fontSize: 12 }}>
                    {formState.errors.lastName.message}
                  </span>
                ) : null}
              </div>
            )}
          />
        </div>

        {/* ---------- Email ---------- */}
        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
          <Controller
            control={form.control}
            name="email"
            render={({ field, formState }) => (
              <div className="_social_registration_form_input _mar_b14">
                <label
                  className={cn(
                    '_social_registration_label _mar_b8',
                    formState.errors.email ? '_label_error' : null,
                  )}
                >
                  Email
                </label>
                <input
                  type="email"
                  {...field}
                  className={cn(
                    'form-control _social_registration_input',
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
              <div className="_social_registration_form_input _mar_b14">
                <label
                  className={cn(
                    '_social_registration_label _mar_b8',
                    formState.errors.password ? '_label_error' : null,
                  )}
                >
                  Password
                </label>
                <input
                  type="password"
                  {...field}
                  className={cn(
                    'form-control _social_registration_input',
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

        {/* ---------- Repeat Password ---------- */}
        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
          <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field, formState }) => (
              <div className="_social_registration_form_input _mar_b14">
                <label
                  className={cn(
                    '_social_registration_label _mar_b8',
                    formState.errors.confirmPassword ? '_label_error' : null,
                  )}
                >
                  Repeat Password
                </label>
                <input
                  type="password"
                  {...field}
                  className={cn(
                    'form-control _social_registration_input',
                    formState.errors.confirmPassword ? '_input_error' : null,
                  )}
                />
                {formState.errors.confirmPassword ? (
                  <span className="_label_error" style={{ fontSize: 12 }}>
                    {formState.errors.confirmPassword.message}
                  </span>
                ) : null}
              </div>
            )}
          />
        </div>
      </div>

      {/* ---------- Terms & Conditions ---------- */}
      <div className="row">
        <div className="col-lg-12 col-xl-12 col-md-12 col-sm-12">
          <div className="form-check _social_registration_form_check">
            <input
              className="form-check-input _social_registration_form_check_input"
              type="radio"
              name="flexRadioDefault"
              id="flexRadioDefault2"
              defaultChecked
            />
            <label
              className="form-check-label _social_registration_form_check_label"
              htmlFor="flexRadioDefault2"
            >
              I agree to terms & conditions
            </label>
          </div>
        </div>
      </div>

      {/* ---------- Submit Button ---------- */}
      <div className="row">
        <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
          <div className="_social_registration_form_btn _mar_t40 _mar_b60">
            <button
              type="submit"
              className="_social_registration_form_btn_link _btn1"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Registering...' : 'Register now'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
