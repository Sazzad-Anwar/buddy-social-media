import { createZodDto } from 'nestjs-zod';
import { createReplySchema } from '@repo/types';

export class CreateReplyDto extends createZodDto(createReplySchema) {}
