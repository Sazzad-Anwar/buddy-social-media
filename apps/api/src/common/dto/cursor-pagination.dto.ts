import { createZodDto } from 'nestjs-zod';
import { cursorPaginationSchema } from '@repo/types';

export class CursorPaginationDto extends createZodDto(cursorPaginationSchema) {}

