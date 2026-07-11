import {
  Controller,
  Get,
  Param,
  Delete,
  Patch,
  Body,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import type { Request } from 'express';
import type { User } from '@repo/types';

export type AuthRequest = Request & {
  user: User;
};

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get('me')
  @Roles(Role.USER)
  find(@Req() req: AuthRequest) {
    return this.userService.findMe(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.userService.findOne(+id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: AuthRequest,
  ) {
    return this.userService.update(+id, updateUserDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.userService.remove(+id, req.user);
  }
}
