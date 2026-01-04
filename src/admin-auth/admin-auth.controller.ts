import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AppConfigService } from '@/common/config/config.service';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '@/common/const/cookie.const';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly configService: AppConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login as an admin' })
  @ApiOkResponse({ description: 'Login successful' })
  async login(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const accessToken = await this.adminAuthService.login(dto);

    res.cookie(ADMIN_ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: this.configService.isProduction,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
    });

    return { message: 'Login successful' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout' })
  @ApiOkResponse({ description: 'Logout successful' })
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    res.clearCookie(ADMIN_ACCESS_TOKEN_COOKIE);
    return { message: 'Logout successful' };
  }
}
