import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../db.service';

type RequestWithUser = Request & {
  user?: { id?: number };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private db: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Retrieve required roles metadata for the route
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user } = request;

    if (!user?.id) {
      return false;
    }

    // Fetch user from database using user.id as ID
    const dbUser = await this.db.users.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return false;
    }

    // Check if user's role matches any of the required roles
    return requiredRoles.includes(dbUser.role as Role);
  }
}
