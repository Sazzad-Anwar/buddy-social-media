import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@repo/types';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CursorPaginationDto } from '../common/dto/cursor-pagination.dto';

export type AuthRequest = Request & {
  user: User;
};

@Controller('post/:postId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  create(
    @Param('postId', ParseIntPipe) postId: number,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: AuthRequest,
  ) {
    return this.commentService.create(postId, createCommentDto, req.user);
  }

  @Get()
  findAll(
    @Param('postId', ParseIntPipe) postId: number,
    @Req() req: AuthRequest,
    @Query() query: CursorPaginationDto,
  ) {
    return this.commentService.findAll(postId, req.user, query);
  }

  @Post(':commentId/like')
  like(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() req: AuthRequest,
  ) {
    return this.commentService.like(postId, commentId, req.user);
  }

  @Delete(':commentId/like')
  unlike(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() req: AuthRequest,
  ) {
    return this.commentService.unlike(postId, commentId, req.user);
  }
}
