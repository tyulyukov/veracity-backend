import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../config/config.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        type: 'postgres',
        host: configService.postgres.host,
        port: configService.postgres.port,
        username: configService.postgres.username,
        password: configService.postgres.password,
        database: configService.postgres.database,
        logging: configService.postgres.logging,
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
