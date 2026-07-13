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
import { ReplyService } from './reply.service';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ReplyThreadQueryDto } from './dto/reply-thread-query.dto';

export type AuthRequest = Request & {
  user: User;
};

@Controller('post/:postId/comments/:commentId/replies')
export class ReplyController {
  constructor(private readonly replyService: ReplyService) {}

  @Post()
  create(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() createReplyDto: CreateReplyDto,
    @Req() req: AuthRequest,
  ) {
    return this.replyService.create(postId, commentId, createReplyDto, req.user);
  }

  @Get()
  findAll(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() req: AuthRequest,
    @Query() query: ReplyThreadQueryDto,
  ) {
    return this.replyService.findAll(postId, commentId, req.user, query);
  }

  @Post(':replyId/like')
  like(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Param('replyId', ParseIntPipe) replyId: number,
    @Req() req: AuthRequest,
  ) {
    return this.replyService.like(postId, commentId, replyId, req.user);
  }

  @Delete(':replyId/like')
  unlike(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Param('replyId', ParseIntPipe) replyId: number,
    @Req() req: AuthRequest,
  ) {
    return this.replyService.unlike(postId, commentId, replyId, req.user);
  }
}
