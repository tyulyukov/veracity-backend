import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AppConfigService } from '@/common/config/config.service';
import { USER_ACCESS_TOKEN_COOKIE } from '@/common/const/cookie.const';
import { UserAuthService } from './user-auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('User Auth')
@Controller('users/auth')
export class UserAuthController {
  constructor(
    private readonly userAuthService: UserAuthService,
    private readonly configService: AppConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'User registered successfully' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ userId: string }> {
    const { userId, accessToken } = await this.userAuthService.register(dto);

    res.cookie(USER_ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: this.configService.isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { userId };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login as a user' })
  @ApiOkResponse({ description: 'Login successful' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const accessToken = await this.userAuthService.login(dto);

    res.cookie(USER_ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: this.configService.isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { message: 'Login successful' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout' })
  @ApiOkResponse({ description: 'Logout successful' })
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    res.clearCookie(USER_ACCESS_TOKEN_COOKIE);
    return { message: 'Logout successful' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiOkResponse({ description: 'OTP sent if user exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.userAuthService.requestPasswordReset(dto.email);
    return { message: 'If an account exists, an OTP has been sent' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiOkResponse({ description: 'Password reset successful' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.userAuthService.resetPassword(dto.email, dto.code, dto.newPassword);
    return { message: 'Password reset successful' };
  }
}
