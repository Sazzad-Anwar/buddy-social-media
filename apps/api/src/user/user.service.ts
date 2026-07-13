import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto';
import { PrismaService } from '../db.service';
import { Role } from '../enums/role.enum';
import type { User } from '@repo/types';

@Injectable()
export class UserService {
  constructor(private readonly db: PrismaService) {}

  public async findOneAndReturn(id: number) {
    const user = await this.db.users.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
    if (!user?.id) {
      throw new NotFoundException('User is not found');
    }
    return user;
  }

  public isLoggedInUser(loggedInUser: User, id: number) {
    if (id !== loggedInUser.id) {
      throw new ForbiddenException();
    }
  }

  async create(createUserDto: CreateUserDto) {
    return await this.db.users.create({
      data: {
        ...createUserDto,
        email: createUserDto.email.toLowerCase(),
      },
    });
  }

  async findAll() {
    return await this.db.users.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }

  async findMe(loggedInUser: User) {
    return await this.findOneAndReturn(loggedInUser.id);
  }

  async findOne(id: number, loggedInUser: User) {
    this.isLoggedInUser(loggedInUser, id);
    return await this.findOneAndReturn(id);
  }

  async update(id: number, updateUserDto: UpdateUserDto, loggedInUser: User) {
    this.isLoggedInUser(loggedInUser, id);
    const user = await this.findOneAndReturn(id);

    return await this.db.users.update({
      where: { id },
      data: {
        firstName: updateUserDto.firstName ?? user.firstName,
        lastName: updateUserDto.lastName ?? user.lastName,
        email: updateUserDto?.email
          ? updateUserDto.email.toLowerCase()
          : user.email,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }

  async remove(id: number, loggedInUser: User) {
    this.isLoggedInUser(loggedInUser, id);
    await this.findOneAndReturn(id);
    return await this.db.users.delete({
      where: { id },
      select: {
        id: true,
      },
    });
  }
}
