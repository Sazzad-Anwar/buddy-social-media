import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateUserDto, UpdateUserDto, type User } from "./dto";
import { PrismaService } from "../db.service";
import { Role } from "../enums/role.enum";

@Injectable()
export class UserService {
  constructor(private readonly db: PrismaService) {}

  public async findOneAndReturn(id: number) {
    const user = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
    if (!user?.id) {
      throw new NotFoundException("User is not found");
    }
    return user;
  }

  public isLoggedInUser(loggedInUser: User, id: number) {
    if (
      id !== loggedInUser.id &&
      loggedInUser.role !== (Role.ADMIN as string)
    ) {
      throw new ForbiddenException();
    }
  }

  async create(createUserDto: CreateUserDto) {
    return await this.db.user.create({
      data: createUserDto,
    });
  }

  async findAll() {
    return await this.db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
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

    return await this.db.user.update({
      where: { id },
      data: {
        name: updateUserDto.name ?? user.name,
        email: updateUserDto?.email ?? user.email,
        role: updateUserDto?.role ?? user.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  async remove(id: number, loggedInUser: User) {
    this.isLoggedInUser(loggedInUser, id);
    await this.findOneAndReturn(id);
    return await this.db.user.delete({
      where: { id },
      select: {
        id: true,
      },
    });
  }
}
