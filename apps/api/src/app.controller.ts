import { Controller, Get } from "@nestjs/common";
import { Public } from "./decorators/isPublic.decorator";

@Controller()
export class AppController {
  @Public()
  @Get()
  getRoot() {
    return {
      message: "hello from create-prisma + nest",
    };
  }
}
