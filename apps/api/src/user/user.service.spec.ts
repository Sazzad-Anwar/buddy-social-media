jest.mock('../db.service');

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../db.service';
import { Role } from '../enums/role.enum';
import type { User } from '@repo/types';

const mockPrisma = {
  users: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as any;

const loggedInUser: User = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  role: 'USER',
  email: 'john@example.com',
};

const createUserDto = {
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  password: 'password123',
};

const selectedUser = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  role: Role.USER,
};

describe('UserService.findOneAndReturn', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService(mockPrisma as PrismaService);
  });

  it('should return a user when the user exists', async () => {
    mockPrisma.users.findUnique.mockResolvedValue(selectedUser);

    const result = await userService.findOneAndReturn(1);

    expect(result).toEqual(selectedUser);
    expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  });

  it('should throw NotFoundException when the user does not exist', async () => {
    mockPrisma.users.findUnique.mockResolvedValue(null);

    await expect(userService.findOneAndReturn(1)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('UserService.isLoggedInUser', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService(mockPrisma as PrismaService);
  });

  it('should not throw when logged in user matches the requested id', () => {
    expect(() => userService.isLoggedInUser(loggedInUser, 1)).not.toThrow();
  });

  it('should throw ForbiddenException when ids do not match', () => {
    expect(() => userService.isLoggedInUser(loggedInUser, 2)).toThrow(
      ForbiddenException,
    );
  });
});

describe('UserService.create', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService(mockPrisma as PrismaService);
  });

  it('should create a new user', async () => {
    mockPrisma.users.create.mockResolvedValue({
      id: 2,
      ...createUserDto,
      role: Role.USER,
    });

    const result = await userService.create(createUserDto as any);

    expect(result).toEqual({
      id: 2,
      ...createUserDto,
      role: Role.USER,
    });
    expect(mockPrisma.users.create).toHaveBeenCalledWith({
      data: createUserDto,
    });
  });
});

describe('UserService.findAll', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService(mockPrisma as PrismaService);
  });

  it('should return all users with selected fields', async () => {
    const users = [selectedUser];
    mockPrisma.users.findMany.mockResolvedValue(users);

    const result = await userService.findAll();

    expect(result).toEqual(users);
    expect(mockPrisma.users.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  });
});

describe('UserService.findMe', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService(mockPrisma as PrismaService);
  });

  it('should return the logged in user profile', async () => {
    const spy = jest
      .spyOn(userService, 'findOneAndReturn')
      .mockResolvedValue(selectedUser);

    const result = await userService.findMe(loggedInUser);

    expect(result).toEqual(selectedUser);
    expect(spy).toHaveBeenCalledWith(loggedInUser.id);
  });
});

describe('UserService.findOne', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService(mockPrisma as PrismaService);
  });

  it('should return a user when the requester is allowed', async () => {
    jest.spyOn(userService, 'isLoggedInUser').mockImplementation(() => {});
    const spy = jest
      .spyOn(userService, 'findOneAndReturn')
      .mockResolvedValue(selectedUser);

    const result = await userService.findOne(1, loggedInUser);

    expect(result).toEqual(selectedUser);
    expect(userService.isLoggedInUser).toHaveBeenCalledWith(loggedInUser, 1);
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('should throw ForbiddenException when the requester is not allowed', async () => {
    await expect(userService.findOne(2, loggedInUser)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('UserService.update', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService(mockPrisma as PrismaService);
  });

  it('should update only provided fields and keep existing values for omitted fields', async () => {
    jest.spyOn(userService, 'isLoggedInUser').mockImplementation(() => {});
    jest.spyOn(userService, 'findOneAndReturn').mockResolvedValue({
      ...selectedUser,
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
    });
    mockPrisma.users.update.mockResolvedValue({
      id: 1,
      firstName: 'Johnny',
      lastName: 'Doe',
      email: 'johnny@example.com',
      role: Role.USER,
    });

    const result = await userService.update(
      1,
      { firstName: 'Johnny', email: 'johnny@example.com' } as any,
      loggedInUser,
    );

    expect(result).toEqual({
      id: 1,
      firstName: 'Johnny',
      lastName: 'Doe',
      email: 'johnny@example.com',
      role: Role.USER,
    });
    expect(mockPrisma.users.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        firstName: 'Johnny',
        lastName: 'Doe',
        email: 'johnny@example.com',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  });

  it('should throw ForbiddenException when the requester is not allowed', async () => {
    await expect(
      userService.update(2, { firstName: 'Johnny' } as any, loggedInUser),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('UserService.remove', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService(mockPrisma as PrismaService);
  });

  it('should delete a user after confirming it exists', async () => {
    jest.spyOn(userService, 'isLoggedInUser').mockImplementation(() => {});
    jest.spyOn(userService, 'findOneAndReturn').mockResolvedValue(selectedUser);
    mockPrisma.users.delete.mockResolvedValue({ id: 1 });

    const result = await userService.remove(1, loggedInUser);

    expect(result).toEqual({ id: 1 });
    expect(mockPrisma.users.delete).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
      },
    });
  });

  it('should throw ForbiddenException when the requester is not allowed', async () => {
    await expect(userService.remove(2, loggedInUser)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
