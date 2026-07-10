import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaService } from './db.service';
import { APP_PIPE, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/role.guard';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({isGlobal:true}), AuthModule, UserModule],
  controllers: [AppController],
  providers: [
    PrismaService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
