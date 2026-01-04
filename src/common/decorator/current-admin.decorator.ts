import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentAdminPayload {
  email: string;
  role: 'moderator' | 'owner';
}

export const CurrentAdmin = createParamDecorator(
  (
    data: keyof CurrentAdminPayload | undefined,
    ctx: ExecutionContext,
  ): CurrentAdminPayload | string => {
    const request = ctx.switchToHttp().getRequest();
    const admin = request.user as CurrentAdminPayload;

    if (data) {
      return admin[data];
    }

    return admin;
  },
);
