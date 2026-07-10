import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateUserSchema = z.object({
  firstName: z.string().min(2, 'Name must be at least 2 characters long'),
  lastName: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.email(),
  password: z.string(),
});

export const UserSchema = CreateUserSchema.omit({
  password: true,
});

export type User = z.infer<typeof UserSchema> & {
  id: number;
};

// class is required for using DTO as a type
export class CreateUserDto extends createZodDto(CreateUserSchema) {}
export class UpdateUserDto extends createZodDto(CreateUserSchema.partial()) {}
