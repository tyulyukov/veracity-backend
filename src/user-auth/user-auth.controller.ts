import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AppConfigService } from '@/common/config/config.service';
import { USER_ACCESS_TOKEN_COOKIE } from '@/common/const/cookie.const';
import { UserAuthService } from './user-auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

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
  async register(@Body() dto: RegisterDto): Promise<{ userId: string }> {
    return this.userAuthService.register(dto);
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
}
