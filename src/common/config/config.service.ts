import { Injectable } from '@nestjs/common';
import { EnvVariables, Environment, validateEnv } from './env.validation';

export interface AppConfig {
  nodeEnv: Environment;
  port: number;
}

export interface PostgresConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  logging: boolean;
}

@Injectable()
export class AppConfigService {
  private readonly env: EnvVariables;

  constructor() {
    this.env = validateEnv(process.env);
  }

  get app(): AppConfig {
    return {
      nodeEnv: this.env.NODE_ENV,
      port: this.env.PORT,
    };
  }

  get postgres(): PostgresConfig {
    return {
      host: this.env.POSTGRES_HOST,
      port: this.env.POSTGRES_PORT,
      username: this.env.POSTGRES_USERNAME,
      password: this.env.POSTGRES_PASSWORD,
      database: this.env.POSTGRES_DATABASE,
      logging: this.env.POSTGRES_LOGGING,
    };
  }

  get isLocal(): boolean {
    return this.env.NODE_ENV === Environment.LOCAL;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === Environment.PRODUCTION;
  }
}
