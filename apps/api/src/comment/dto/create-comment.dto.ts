import { createZodDto } from 'nestjs-zod';
import { createCommentSchema } from '@repo/types';

export class CreateCommentDto extends createZodDto(createCommentSchema) {}

