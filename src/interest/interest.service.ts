import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_GUEST_POOL } from '@/common/db/pg-guest.module';

export interface Interest {
  id: string;
  name: string;
}

@Injectable()
export class InterestService {
  constructor(@Inject(PG_GUEST_POOL) private readonly guestPool: Pool) {}

  async findAll(): Promise<Interest[]> {
    const result = await this.guestPool.query<Interest>(
      'SELECT id, name FROM interests ORDER BY name',
    );
    return result.rows;
  }
}
