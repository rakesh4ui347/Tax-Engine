import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({ where: { ein: dto.ein } });
    if (existing) {
      throw new ConflictException(`Organization with EIN ${dto.ein} already exists`);
    }

    return this.prisma.organization.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.organization.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { companies: true, users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: {
        companies: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            ein: true,
            payFrequency: true,
            state: true,
          },
        },
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        apiKeys: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            keyPrefix: true,
            scopes: true,
            createdAt: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    return org;
  }

  async update(id: string, dto: Partial<CreateOrganizationDto>) {
    const org = await this.prisma.organization.findFirst({ where: { id, deletedAt: null } });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);

    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async softDelete(id: string) {
    const org = await this.prisma.organization.findFirst({ where: { id, deletedAt: null } });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);

    return this.prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
