import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { UAParser } from 'ua-parser-js';
import { LoginDto, RefreshTokenDto } from './dto';
import { Public } from '../decorators/isPublic.decorator';
import { CreateUserDto } from '../user/dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() createuserDTO: CreateUserDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const userAgentName = new UAParser(userAgent).getResult();
    const result = await this.authService.register(
      createuserDTO,
      userAgentName,
    );

    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ access_token: result.access_token });
  }

  @Public()
  @Post('login')
  async login(
    @Body() loginDTO: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const userAgentName = new UAParser(userAgent).getResult();
    const result = await this.authService.login(loginDTO, userAgentName);

    res.cookie('refresh_token', result?.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({ access_token: result?.access_token });
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies.refresh_token;
    const userAgent = req.headers['user-agent'];
    const userAgentName = new UAParser(userAgent).getResult();
    const result = await this.authService.regenerateTokens(
      refreshToken,
      userAgentName,
    );

    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.json({ access_token: result.access_token });
  }
}
