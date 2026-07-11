import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Invalid email address').nonempty('Email is required'),
  password: z.string().nonempty('Password is required'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string(),
});

export const createUserSchema = z.object({
  firstName: z.string().min(2, 'Name must be at least 2 characters long'),
  lastName: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.email('Invalid email address').nonempty('Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const UserSchema = createUserSchema.omit({
  password: true,
});

export type User = z.infer<typeof UserSchema> & {
  id: number;
};

export type LoginDto = z.infer<typeof loginSchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
