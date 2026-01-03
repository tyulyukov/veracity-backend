import { Module } from '@nestjs/common';
import { IncomingMessage } from 'http';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { AppConfigService } from '@/common/config/config.service';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.isLocal ? 'debug' : 'info',
          autoLogging: !config.isLocal,
          transport: config.isLocal
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
          genReqId: (req: IncomingMessage) =>
            (req.headers['x-request-id'] as string) ?? crypto.randomUUID(),
        },
      }),
    }),
  ],
})
export class LoggerModule {}
