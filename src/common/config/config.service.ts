import { Injectable } from '@nestjs/common';
import { EnvVariables, Environment, validateEnv } from './env.validation';

export interface AppConfig {
  nodeEnv: Environment;
  port: number;
}

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  logging: boolean;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface OwnerConfig {
  email: string;
  password: string;
}

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
}

export interface OtpConfig {
  expiresInMinutes: number;
}

export interface R2Config {
  publicUrl: string;
  apiUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
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
      database: this.env.POSTGRES_DATABASE,
      logging: this.env.POSTGRES_LOGGING,
    };
  }

  get userJwt(): JwtConfig {
    return {
      secret: this.env.USER_JWT_SECRET,
      expiresIn: this.env.USER_JWT_EXPIRES_IN,
    };
  }

  get adminJwt(): JwtConfig {
    return {
      secret: this.env.ADMIN_JWT_SECRET,
      expiresIn: this.env.ADMIN_JWT_EXPIRES_IN,
    };
  }

  get owner(): OwnerConfig {
    return {
      email: this.env.OWNER_EMAIL,
      password: this.env.OWNER_PASSWORD,
    };
  }

  get isLocal(): boolean {
    return this.env.NODE_ENV === Environment.LOCAL;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === Environment.PRODUCTION;
  }

  get resend(): ResendConfig {
    return {
      apiKey: this.env.RESEND_API_KEY,
      fromEmail: this.env.RESEND_FROM_EMAIL,
    };
  }

  get otp(): OtpConfig {
    return {
      expiresInMinutes: this.env.OTP_EXPIRES_IN_MINUTES,
    };
  }

  get r2(): R2Config {
    return {
      publicUrl: this.env.CLOUDFLARE_R2_PUBLIC_URL,
      apiUrl: this.env.CLOUDFLARE_R2_API_URL,
      accessKeyId: this.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: this.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      bucket: this.env.CLOUDFLARE_R2_BUCKET,
    };
  }
}
