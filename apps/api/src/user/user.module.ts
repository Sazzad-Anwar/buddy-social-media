import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { PrismaService } from "../db.service";
// import { RolesGuard } from '../auth/role.guard';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    PrismaService,

    // {
    //   provide: APP_GUARD,
    //   useClass: RolesGuard,
    // },
  ],
  exports: [UserService],
})
export class UserModule {}
