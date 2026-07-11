import { createZodDto } from 'nestjs-zod';
import { createUserSchema } from '@repo/types';

// class is required for using DTO as a type
export class CreateUserDto extends createZodDto(createUserSchema) {}
export class UpdateUserDto extends createZodDto(createUserSchema.partial()) {}
