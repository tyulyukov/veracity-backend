import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { AppConfigService } from '@/common/config/config.service';
import { SessionExpiredError } from './domain/session-expired.error';

interface PoolEntry {
  pool: Pool;
  lastAccess: Date;
}

@Injectable()
export class UserPoolRegistry implements OnModuleDestroy {
  private readonly pools = new Map<string, PoolEntry>();
  private readonly maxSize = 500;
  private readonly ttlMs = 20 * 60 * 1000;
  private readonly locks = new Map<string, Promise<Pool>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly configService: AppConfigService) {
    this.cleanupInterval = setInterval(() => this.evictStale(), 60000);
  }

  getPoolById(userId: string): Pool {
    const entry = this.pools.get(userId);
    if (!entry) {
      throw new SessionExpiredError();
    }
    entry.lastAccess = new Date();
    return entry.pool;
  }

  async createPoolForUser(userId: string, email: string, password: string): Promise<Pool> {
    const existing = this.pools.get(userId);
    if (existing) {
      existing.lastAccess = new Date();
      return existing.pool;
    }

    const existingLock = this.locks.get(userId);
    if (existingLock) {
      return existingLock;
    }

    const promise = this.createPool(userId, email, password);
    this.locks.set(userId, promise);

    try {
      return await promise;
    } finally {
      this.locks.delete(userId);
    }
  }

  private async createPool(userId: string, email: string, password: string): Promise<Pool> {
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

    this.pools.set(userId, { pool, lastAccess: new Date() });
    return pool;
  }

  hasPool(userId: string): boolean {
    return this.pools.has(userId);
  }

  removePool(userId: string): void {
    const entry = this.pools.get(userId);
    if (entry) {
      entry.pool.end().catch(() => {});
      this.pools.delete(userId);
    }
  }

  private evictStale(): void {
    const now = Date.now();
    for (const [userId, entry] of this.pools) {
      if (now - entry.lastAccess.getTime() > this.ttlMs) {
        entry.pool.end().catch(() => {});
        this.pools.delete(userId);
      }
    }
  }

  private evictOldest(): void {
    let oldest: { userId: string; time: number } | null = null;
    for (const [userId, entry] of this.pools) {
      const time = entry.lastAccess.getTime();
      if (!oldest || time < oldest.time) {
        oldest = { userId, time };
      }
    }
    if (oldest) {
      this.removePool(oldest.userId);
    }
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.cleanupInterval);
    const promises = Array.from(this.pools.values()).map((entry) => entry.pool.end());
    await Promise.all(promises);
    this.pools.clear();
  }
}
