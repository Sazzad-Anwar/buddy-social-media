import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { UAParser } from 'ua-parser-js';
import { LoginDto } from './dto';
import { Public } from '../decorators/isPublic.decorator';
import { CreateUserDto } from '../user/dto';
import {
  ACCESS_TOKEN_EXPIRY_IN_MINUTES,
  TOKEN_EXPIRY_DAYS,
} from '../lib/constants';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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
      path: '/',
      maxAge: TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ACCESS_TOKEN_EXPIRY_IN_MINUTES * 60 * 1000,
    });

    return res.json({ access_token: result.access_token });
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
      path: '/',
      maxAge: TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ACCESS_TOKEN_EXPIRY_IN_MINUTES * 60 * 1000,
    });

    return res.json({ access_token: result?.access_token });
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
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
      path: '/',
      maxAge: TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ACCESS_TOKEN_EXPIRY_IN_MINUTES * 60 * 1000,
    });

    return res.json({ access_token: result.access_token });
  }
}
