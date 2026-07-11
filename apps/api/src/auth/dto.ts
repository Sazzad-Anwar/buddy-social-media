import { createZodDto } from 'nestjs-zod';
import { loginSchema, refreshTokenSchema } from '@repo/types';

// class is required for using DTO as a type
export class LoginDto extends createZodDto(loginSchema) {}
export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {}
