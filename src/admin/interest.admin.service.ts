import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Pool, DatabaseError } from 'pg';
import { CLS_ADMIN_POOL } from '@/admin-auth/admin-jwt.strategy';
import { InterestNotFoundError } from './domain/interest-not-found.error';
import { InterestAlreadyExistsError } from './domain/interest-already-exists.error';
import { CreateInterestDto } from './dto/create-interest.dto';
import { UpdateInterestDto } from './dto/update-interest.dto';
import { InterestsQueryDto } from './dto/interests-query.dto';

export interface Interest {
  id: string;
  name: string;
}

@Injectable()
export class InterestAdminService {
  constructor(private readonly cls: ClsService) {}

  private get pool(): Pool {
    return this.cls.get<Pool>(CLS_ADMIN_POOL);
  }

  async findInterests(query: InterestsQueryDto): Promise<{ interests: Interest[]; total: number }> {
    const { offset = 0, limit = 20, search } = query;
    const params: unknown[] = [];
    let paramIndex = 1;

    let whereClause = '';
    if (search) {
      whereClause = `WHERE LOWER(name) LIKE LOWER($${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countSql = `SELECT COUNT(*) FROM interests ${whereClause}`;
    const sql = `
      SELECT id, name FROM interests
      ${whereClause}
      ORDER BY name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    try {
      const [countResult, listResult] = await Promise.all([
        this.pool.query<{ count: string }>(countSql, search ? [params[0]] : []),
        this.pool.query<Interest>(sql, params),
      ]);

      return {
        interests: listResult.rows,
        total: parseInt(countResult.rows[0].count, 10),
      };
    } catch (error) {
      throw this.mapPgError(error, '');
    }
  }

  async createInterest(dto: CreateInterestDto): Promise<Interest> {
    try {
      const result = await this.pool.query<{ id: string }>(
        'SELECT admin.create_interest($1) AS id',
        [dto.name],
      );
      return {
        id: result.rows[0].id,
        name: dto.name,
      };
    } catch (error) {
      throw this.mapPgError(error, dto.name);
    }
  }

  async updateInterest(id: string, dto: UpdateInterestDto): Promise<void> {
    try {
      await this.pool.query('SELECT admin.update_interest($1, $2)', [id, dto.name]);
    } catch (error) {
      throw this.mapPgError(error, dto.name, id);
    }
  }

  async deleteInterest(id: string): Promise<void> {
    try {
      await this.pool.query('SELECT admin.delete_interest($1)', [id]);
    } catch (error) {
      throw this.mapPgError(error, '', id);
    }
  }

  private mapPgError(error: unknown, name: string, id?: string): Error {
    if (error instanceof DatabaseError || (error instanceof Error && 'message' in error)) {
      const message = (error as Error).message;

      if (
        message.includes('Interest already exists') ||
        message.includes('Interest name already exists')
      ) {
        return new InterestAlreadyExistsError(name);
      }
      if (message.includes('Interest not found')) {
        return new InterestNotFoundError(id || '');
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
