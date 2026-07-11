import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import type { Request } from 'express';
import type { User } from '@repo/types';
import { CursorPaginationDto } from '../common/dto/cursor-pagination.dto';
import type { UploadedImageLikeFile } from '../media/media.service';
import { MAX_POST_IMAGE_SIZE_BYTES } from './post.constants';

export type AuthRequest = Request & {
  user: User;
};

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_POST_IMAGE_SIZE_BYTES,
      },
    }),
  )
  create(
    @Body() createPostDto: CreatePostDto,
    @Req() req: AuthRequest,
    @UploadedFile() file?: UploadedImageLikeFile,
  ) {
    return this.postService.create(createPostDto, req.user, file);
  }

  @Get()
  findAll(@Req() req: AuthRequest, @Query() query: CursorPaginationDto) {
    return this.postService.findAll(req.user, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.postService.findOne(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @Req() req: AuthRequest,
  ) {
    return this.postService.update(id, updatePostDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.postService.remove(id, req.user);
  }

  @Post(':id/like')
  like(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.postService.like(id, req.user);
  }

  @Delete(':id/like')
  unlike(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.postService.unlike(id, req.user);
  }

  @Get(':id/likes')
  listLikes(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @Query() query: CursorPaginationDto,
  ) {
    return this.postService.listLikes(id, query, req.user);
  }
}
