import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '24h',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const saltRounds = parseInt(this.configService.get('API_KEY_SALT_ROUNDS') || '10');
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || 'EMPLOYEE',
        organizationId: dto.organizationId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        createdAt: true,
      },
    });

    return user;
  }

  async createApiKey(
    userId: string,
    orgId: string,
    name: string,
    scopes: string[],
  ): Promise<{ rawKey: string; apiKey: any }> {
    const rawBytes = crypto.randomBytes(32);
    const rawKey = 'pk_live_' + rawBytes.toString('hex');
    const keyPrefix = rawKey.substring(0, 16);

    const saltRounds = parseInt(this.configService.get('API_KEY_SALT_ROUNDS') || '10');
    const keyHash = await bcrypt.hash(rawKey, saltRounds);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId: orgId,
        userId,
        name,
        keyHash,
        keyPrefix,
        scopes,
      },
    });

    return { rawKey, apiKey };
  }

  async validateApiKey(rawKey: string) {
    if (!rawKey.startsWith('pk_live_')) {
      return null;
    }

    const keyPrefix = rawKey.substring(0, 16);

    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        keyPrefix,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            organizationId: true,
            isActive: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    for (const apiKey of apiKeys) {
      const valid = await bcrypt.compare(rawKey, apiKey.keyHash);
      if (valid) {
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          return null;
        }

        await this.prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        });

        return apiKey.user;
      }
    }

    return null;
  }

  async revokeApiKey(apiKeyId: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { isActive: false },
    });
  }

  async listApiKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        lastLoginAt: true,
        createdAt: true,
        companies: {
          include: {
            company: {
              select: { id: true, name: true, ein: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
