import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../db.service';
import { JwtService } from '@nestjs/jwt';
import type { IResult } from 'ua-parser-js';
import * as crypto from 'crypto';
import { CreateUserDto } from '../user/dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto';
import { Role } from '../enums/role.enum';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY_DAYS = 7;
const ACCESS_TOKEN_EXPIRY = '15m';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Generates a cryptographically secure random token.
   */
  private async generateRawToken(): Promise<string> {
    try {
      return crypto.randomBytes(64).toString('hex');
    } catch (err) {
      throw new BadRequestException('Unable to generate refresh token');
    }
  }

  /**
   * Hashes a token using SHA-256.
   */
  private async hashToken(rawToken: string): Promise<string> {
    try {
      return crypto.createHash('sha256').update(rawToken).digest('hex');
    } catch (err) {
      throw new BadRequestException('Unable to hash refresh token');
    }
  }

  /**
   * Stores or updates a refresh token in the database.
   */
  private async storeRefreshToken(
    userId: number,
    deviceName: string,
    hashedToken: string,
    expiresAt: Date,
    actionType: 'register' | 'login' = 'login',
  ): Promise<void> {
    await this.db.$transaction(async (prisma) => {
      const existing = await prisma.refreshToken.findFirst({
        where: { userId, deviceName },
      });
      if (existing) {
        await prisma.refreshToken.update({
          where: { id: existing.id },
          data: { token: hashedToken, expiresAt, isRevoked: false },
        });
      } else {
        await prisma.refreshToken.create({
          data: { userId, token: hashedToken, deviceName, expiresAt },
        });
      }

      // Clean up expired tokens for the current user
      if (actionType === 'login') {
        await prisma.refreshToken.deleteMany({
          where: { userId, expiresAt: { lt: new Date() } },
        });
      }
    });
  }

  /**
   * Generates, hashes, and stores a refresh token.
   * Returns the hashed token (to be returned to the client).
   */
  public async hashRefreshToken(
    userAgent: IResult,
    userId: number,
    actionType: 'register' | 'login' = 'login',
  ): Promise<string> {
    const deviceModel = userAgent.device?.model ?? '';
    const deviceType = userAgent.device?.type ?? '';
    const deviceName = `${deviceModel} ${deviceType}`.trim() || 'Unknown';
    const rawToken = await this.generateRawToken();
    const hashedToken = await this.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);
    await this.storeRefreshToken(
      userId,
      deviceName,
      hashedToken,
      expiresAt,
      actionType,
    );
    return hashedToken;
  }

  /**
   * Checks if a user exists by email.
   */
  public async checkUserExists(email: string) {
    const user = await this.db.users.findUnique({ where: { email } });
    return { user, isExist: !!user };
  }

  /**
   * Registers a new user and returns tokens.
   */
  async register(userDto: CreateUserDto, userAgent: IResult) {
    const { isExist } = await this.checkUserExists(userDto.email);
    if (isExist) {
      throw new ConflictException('User already exists');
    }
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(userDto.password, salt);
    const user = await this.db.users.create({
      data: {
        firstName: userDto.firstName,
        lastName: userDto.lastName,
        email: userDto.email,
        role: Role.USER,
        password: hash,
      },
    });
    const refreshToken = await this.hashRefreshToken(
      userAgent,
      user.id,
      'register',
    );
    return {
      access_token: this.jwt.sign(
        { sub: user.id },
        { expiresIn: ACCESS_TOKEN_EXPIRY },
      ),
      refresh_token: refreshToken,
    };
  }

  /**
   * Authenticates a user and returns tokens.
   */
  async login(loginDto: LoginDto, userAgent: IResult) {
    const { user, isExist } = await this.checkUserExists(loginDto.email);
    if (!isExist || !user) {
      throw new NotFoundException('User does not exist');
    }
    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Invalid credentials');
    }
    const refreshToken = await this.hashRefreshToken(
      userAgent,
      user.id,
      'login',
    );
    return {
      access_token: this.jwt.sign(
        { sub: user.id },
        { expiresIn: ACCESS_TOKEN_EXPIRY },
      ),
      refresh_token: refreshToken,
    };
  }

  /**
   * Regenerates tokens using a refresh token.
   */
  async regenerateTokens(refreshToken: string, userAgent: IResult) {
    const tokenRecord = await this.db.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (tokenRecord.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }
    const newRefreshToken = await this.hashRefreshToken(
      userAgent,
      tokenRecord.userId,
      'login',
    );
    return {
      access_token: this.jwt.sign(
        { sub: tokenRecord.userId },
        { expiresIn: ACCESS_TOKEN_EXPIRY },
      ),
      refresh_token: newRefreshToken,
    };
  }
}
