import { createZodDto } from 'nestjs-zod';
import { updatePostSchema } from '@repo/types';

export class UpdatePostDto extends createZodDto(updatePostSchema) {}
