import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUserPayload } from '@/common/decorator/current-user.decorator';
import { InactiveUserError } from '@/user-auth/domain/inactive-user.error';

@Injectable()
export class ActiveUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUserPayload;

    if (user.status !== 'active') {
      throw new InactiveUserError();
    }

    return true;
  }
}
