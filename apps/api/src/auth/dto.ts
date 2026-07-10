import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

const refreshTokenSchema = z.object({
  refresh_token: z.string(),
});

// class is required for using DTO as a type
export class LoginDto extends createZodDto(loginSchema) {}
export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {}
