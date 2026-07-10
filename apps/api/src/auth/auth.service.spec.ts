import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../db.service';
import { JwtService } from '@nestjs/jwt';
import type { IResult } from 'ua-parser-js';
import * as bcrypt from 'bcrypt';

/**
 * Unit tests that focus **only** on the `login` method of `AuthService`.
 * All external dependencies (Prisma, JWT, password validation) are mocked
 * so no real database or token generation occurs.
 */
const mockPrisma = {
  $transaction: jest.fn(),
  user: {
    findUnique: jest.fn(),
    // `create` is used in the registration flow
    create: jest.fn(),
  },
  refreshToken: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
    findUnique: jest.fn(),
  },
} as any;

const mockJwt = {
  sign: jest.fn(),
} as any;

const loginDto = { email: 'john@gmail.com', password: 'password' };
// The user object returned by Prisma. Include an `id` because the service
// uses it when signing the JWT and when generating the refresh token.
const createUserDto = {
  id: 1,
  firstName: 'John',
  lastName: 'John',
  email: 'john@gmail.com',
  password: 'password', // plain for the test; we will mock bcrypt.compare
};
const userAgent = { browser: { name: 'Chrome' } } as IResult;
const fakeRefresh = { id: 1, token: 'refresh_token' };

describe('AuthService.login', () => {
  let authService: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should return access and refresh tokens on success', async () => {
    // Arrange: mock DB lookup, password check, JWT signing and refresh token creation
    mockPrisma.user.findUnique.mockResolvedValue(createUserDto);
    // Mock bcrypt.compare to always succeed for the test password.
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    // Mock the internal hashRefreshToken to avoid dealing with $transaction.
    jest
      .spyOn(authService, 'hashRefreshToken')
      .mockResolvedValue('refresh_token');
    mockJwt.sign.mockReturnValue('access_token');

    // Act
    const result = await authService.login(loginDto, userAgent);

    // Assert: result shape and that collaborators were called correctly
    expect(result).toEqual({
      access_token: 'access_token',
      refresh_token: 'refresh_token',
    });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: loginDto.email },
    });
    // The service signs the JWT with only the `sub` claim.
    expect(mockJwt.sign).toHaveBeenCalledWith(
      { sub: createUserDto.id },
      { expiresIn: '15m' },
    );
  });

  it('should throw NotFoundException when user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null); // user not found

    await expect(authService.login(loginDto, userAgent)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('Should throw BadRequestException when password does not match', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(createUserDto);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(authService.login(loginDto, userAgent)).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('AuthService.registration', () => {
  let authService: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should register a new user and return tokens', async () => {
    // No existing user
    mockPrisma.user.findUnique.mockResolvedValue(null);

    // Mock user creation – the service expects the created user to have an id
    const createdUser = { ...createUserDto, id: 2 };
    mockPrisma.user.create.mockResolvedValue(createdUser);

    // Mock bcrypt helpers
    jest.spyOn(bcrypt, 'genSalt').mockResolvedValue('salt' as never);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword' as never);

    // Mock internal hashRefreshToken and JWT sign
    jest
      .spyOn(authService, 'hashRefreshToken')
      .mockResolvedValue('refresh_token');
    mockJwt.sign.mockReturnValue('access_token');

    // Act
    const result = await authService.register(createUserDto, userAgent);

    // Assert
    expect(result).toEqual({
      access_token: 'access_token',
      refresh_token: 'refresh_token',
    });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: createUserDto.email },
    });
    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(bcrypt.genSalt).toHaveBeenCalled();
    expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 'salt');
    expect(mockJwt.sign).toHaveBeenCalledWith(
      { sub: createdUser.id },
      { expiresIn: '15m' },
    );
  });

  it('should throw ConflictException when user already exists', async () => {
    // Simulate existing user
    mockPrisma.user.findUnique.mockResolvedValue(createUserDto);

    await expect(
      authService.register(createUserDto, userAgent),
    ).rejects.toThrow(ConflictException);
  });
});

describe('AuthService.hashRefreshToken', () => {
  let authService: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should create a new token when no existing token is found for the device', async () => {
    mockPrisma.refreshToken.findFirst.mockResolvedValue(null);
    mockPrisma.refreshToken.create.mockResolvedValue(fakeRefresh);

    const token = await authService.hashRefreshToken(userAgent, 1, 'login');

    expect(token).toBeDefined();
    expect(mockPrisma.refreshToken.findFirst).toHaveBeenCalledWith({
      where: { userId: 1, deviceName: 'Unknown' },
    });
    expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalled();
  });

  it('should update existing token when a token is found for the device', async () => {
    mockPrisma.refreshToken.findFirst.mockResolvedValue({
      id: 10,
      token: 'old_token',
    });
    mockPrisma.refreshToken.update.mockResolvedValue({
      id: 10,
      token: 'new_token',
    });

    const token = await authService.hashRefreshToken(userAgent, 1, 'login');

    expect(token).toBeDefined();
    expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: expect.objectContaining({ isRevoked: false }),
    });
    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalled();
  });

  it('should not delete expired tokens when actionType is register', async () => {
    mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

    await authService.hashRefreshToken(userAgent, 1, 'register');

    expect(mockPrisma.refreshToken.deleteMany).not.toHaveBeenCalled();
  });

  it('should construct deviceName correctly from userAgent device info', async () => {
    const uaWithDevice = {
      device: { model: 'iPhone', type: 'mobile' },
    } as IResult;
    mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

    await authService.hashRefreshToken(uaWithDevice, 1, 'login');

    expect(mockPrisma.refreshToken.findFirst).toHaveBeenCalledWith({
      where: { userId: 1, deviceName: 'iPhone mobile' },
    });
  });
});

describe('AuthService.regenerateTokens', () => {
  let authService: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should regenerate tokens when a valid, non-expired, non-revoked token is provided', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const tokenRecord = {
      userId: 1,
      token: 'valid_token',
      isRevoked: false,
      expiresAt: futureDate,
    };

    mockPrisma.refreshToken.findUnique.mockResolvedValue(tokenRecord);
    jest
      .spyOn(authService, 'hashRefreshToken')
      .mockResolvedValue('new_refresh_token');
    mockJwt.sign.mockReturnValue('new_access_token');

    const result = await authService.regenerateTokens('valid_token', userAgent);

    expect(result).toEqual({
      access_token: 'new_access_token',
      refresh_token: 'new_refresh_token',
    });
    expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { token: 'valid_token' },
      include: { user: true },
    });
  });

  it('should throw UnauthorizedException when token record is not found', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(
      authService.regenerateTokens('invalid_token', userAgent),
    ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
  });

  it('should throw UnauthorizedException when token is revoked', async () => {
    const tokenRecord = {
      userId: 1,
      token: 'revoked_token',
      isRevoked: true,
      expiresAt: new Date(Date.now() + 100000),
    };

    mockPrisma.refreshToken.findUnique.mockResolvedValue(tokenRecord);

    await expect(
      authService.regenerateTokens('revoked_token', userAgent),
    ).rejects.toThrow(
      new UnauthorizedException('Refresh token has been revoked'),
    );
  });

  it('should throw UnauthorizedException when token is expired', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const tokenRecord = {
      userId: 1,
      token: 'expired_token',
      isRevoked: false,
      expiresAt: pastDate,
    };

    mockPrisma.refreshToken.findUnique.mockResolvedValue(tokenRecord);

    await expect(
      authService.regenerateTokens('expired_token', userAgent),
    ).rejects.toThrow(new UnauthorizedException('Refresh token has expired'));
  });
});
