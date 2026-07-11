import { createZodDto } from 'nestjs-zod';
import { createPostSchema } from '@repo/types';

export class CreatePostDto extends createZodDto(createPostSchema) {}
