import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { Pool } from 'pg';
import { PG_GUEST_POOL } from '@/common/db/pg-guest.module';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    @Inject(PG_GUEST_POOL) private readonly pool: Pool,
  ) {}

  @Get('healthz')
  @ApiOperation({ summary: 'Liveness probe' })
  liveness() {
    return { status: 'ok' };
  }

  @Get('readyz')
  @ApiOperation({ summary: 'Readiness probe' })
  @HealthCheck()
  readiness() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        try {
          await this.pool.query('SELECT 1');
          return { database: { status: 'up' } };
        } catch {
          return { database: { status: 'down' } };
        }
      },
    ]);
  }
}
