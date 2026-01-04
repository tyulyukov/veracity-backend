import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { AppConfigService } from '@/common/config/config.service';
import { SessionExpiredError } from '@/user-auth/domain/session-expired.error';

interface PoolEntry {
  pool: Pool;
  lastAccess: Date;
}

@Injectable()
export class AdminPoolRegistry implements OnModuleDestroy {
  private readonly pools = new Map<string, PoolEntry>();
  private readonly maxSize = 50;
  private readonly ttlMs = 20 * 60 * 1000;
  private readonly locks = new Map<string, Promise<Pool>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly configService: AppConfigService) {
    this.cleanupInterval = setInterval(() => this.evictStale(), 60000);
  }

  getPoolByEmail(email: string): Pool {
    const entry = this.pools.get(email);
    if (!entry) {
      throw new SessionExpiredError();
    }
    entry.lastAccess = new Date();
    return entry.pool;
  }

  async createPoolForAdmin(email: string, password: string): Promise<Pool> {
    const existingLock = this.locks.get(email);
    if (existingLock) {
      return existingLock;
    }

    const promise = this.createPoolWithCredentialCheck(email, password);
    this.locks.set(email, promise);

    try {
      return await promise;
    } finally {
      this.locks.delete(email);
    }
  }

  private async createPoolWithCredentialCheck(email: string, password: string): Promise<Pool> {
    const existing = this.pools.get(email);

    if (existing) {
      const testPool = new Pool({
        host: this.configService.postgres.host,
        port: this.configService.postgres.port,
        database: this.configService.postgres.database,
        user: email,
        password: password,
        max: 1,
        idleTimeoutMillis: 1000,
      });

      try {
        await testPool.query('SELECT 1');
        await testPool.end();
        existing.lastAccess = new Date();
        return existing.pool;
      } catch {
        await testPool.end().catch(() => {});
        throw new Error('Invalid credentials');
      }
    }

    return this.createPool(email, password);
  }

  private async createPool(email: string, password: string): Promise<Pool> {
    if (this.pools.size >= this.maxSize) {
      this.evictOldest();
    }

    const pool = new Pool({
      host: this.configService.postgres.host,
      port: this.configService.postgres.port,
      database: this.configService.postgres.database,
      user: email,
      password: password,
      max: 2,
      idleTimeoutMillis: 60000,
    });

    await pool.query('SELECT 1');

    this.pools.set(email, { pool, lastAccess: new Date() });
    return pool;
  }

  hasPool(email: string): boolean {
    return this.pools.has(email);
  }

  removePool(email: string): void {
    const entry = this.pools.get(email);
    if (entry) {
      entry.pool.end().catch(() => {});
      this.pools.delete(email);
    }
  }

  private evictStale(): void {
    const now = Date.now();
    for (const [email, entry] of this.pools) {
      if (now - entry.lastAccess.getTime() > this.ttlMs) {
        entry.pool.end().catch(() => {});
        this.pools.delete(email);
      }
    }
  }

  private evictOldest(): void {
    let oldest: { email: string; time: number } | null = null;
    for (const [email, entry] of this.pools) {
      const time = entry.lastAccess.getTime();
      if (!oldest || time < oldest.time) {
        oldest = { email, time };
      }
    }
    if (oldest) {
      this.removePool(oldest.email);
    }
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.cleanupInterval);
    const promises = Array.from(this.pools.values()).map((entry) => entry.pool.end());
    await Promise.all(promises);
    this.pools.clear();
  }
}
