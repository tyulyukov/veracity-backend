import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  LOCAL = 'local',
  PRODUCTION = 'production',
}

export class EnvVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.LOCAL;

  @IsInt()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value, 10))
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  POSTGRES_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value, 10))
  POSTGRES_PORT: number = 5432;

  @IsString()
  @IsNotEmpty()
  POSTGRES_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_DATABASE: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  POSTGRES_LOGGING: boolean = false;

  @IsString()
  @IsNotEmpty()
  USER_JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  USER_JWT_EXPIRES_IN: string = '7d';

  @IsString()
  @IsNotEmpty()
  ADMIN_JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  ADMIN_JWT_EXPIRES_IN: string = '8h';

  @IsString()
  @IsNotEmpty()
  OWNER_EMAIL: string;

  @IsString()
  @IsNotEmpty()
  OWNER_PASSWORD: string;
}

export function validateEnv(config: Record<string, unknown>): EnvVariables {
  const validated = plainToInstance(EnvVariables, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    const messages = errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; ');
    throw new Error(`Config validation failed: ${messages}`);
  }

  return validated;
}
