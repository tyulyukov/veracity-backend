import { Module } from '@nestjs/common';
import { ClsModule as NestClsModule } from 'nestjs-cls';
import { Request } from 'express';

@Module({
  imports: [
    NestClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: Request) =>
          (req.headers['x-request-id'] as string) ?? crypto.randomUUID(),
        setup: (cls, req: Request) => {
          cls.set('ip', req.ip);
          cls.set('userAgent', req.headers['user-agent']);
        },
      },
    }),
  ],
})
export class ClsModule {}
