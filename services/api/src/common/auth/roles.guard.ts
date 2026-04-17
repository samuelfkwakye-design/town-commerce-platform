import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, AdminRole } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const adminUser = request.adminUser;

    if (!adminUser) {
      throw new ForbiddenException('Access denied');
    }

    const adminRole = adminUser.role as AdminRole | undefined;

    if (!adminRole) {
      throw new ForbiddenException('No role assigned');
    }

    if (!requiredRoles.includes(adminRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}