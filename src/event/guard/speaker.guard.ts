import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUserPayload } from '@/common/decorator/current-user.decorator';
import { UnauthorizedEventAccessError } from '@/event/domain/unauthorized-event-access.error';

@Injectable()
export class SpeakerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUserPayload;

    if (user.role !== 'speaker') {
      throw new UnauthorizedEventAccessError();
    }

    return true;
  }
}
