import { createZodDto } from 'nestjs-zod';
import { replyThreadQuerySchema } from '@repo/types';

export class ReplyThreadQueryDto extends createZodDto(replyThreadQuerySchema) {}
