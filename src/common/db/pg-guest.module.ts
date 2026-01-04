import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { AppConfigService } from '@/common/config/config.service';

export const PG_GUEST_POOL = 'PG_GUEST_POOL';

@Global()
@Module({
  providers: [
    {
      provide: PG_GUEST_POOL,
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService): Pool => {
        return new Pool({
          host: configService.postgres.host,
          port: configService.postgres.port,
          database: configService.postgres.database,
          user: 'guest',
          password: 'guest',
          max: 5,
          idleTimeoutMillis: 30000,
        });
      },
    },
  ],
  exports: [PG_GUEST_POOL],
})
export class PgGuestModule implements OnModuleDestroy {
  constructor(@Inject(PG_GUEST_POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}
