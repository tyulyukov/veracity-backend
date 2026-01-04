import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CurrentAdminPayload } from '@/common/decorator/current-admin.decorator';
import { InsufficientPermissionsError } from '@/admin-auth/domain/insufficient-permissions.error';

export const ADMIN_ROLES_KEY = 'adminRoles';
export const RequireAdminRoles = (...roles: Array<'moderator' | 'owner'>) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Array<'moderator' | 'owner'>>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const admin = request.user as CurrentAdminPayload;

    if (admin.role === 'owner') {
      return true;
    }

    if (!requiredRoles.includes(admin.role)) {
      throw new InsufficientPermissionsError();
    }

    return true;
  }
}
