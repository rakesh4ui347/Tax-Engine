import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCompanyDto) {
    const existing = await this.prisma.company.findUnique({ where: { ein: dto.ein } });
    if (existing) {
      throw new ConflictException(`Company with EIN ${dto.ein} already exists`);
    }

    const org = await this.prisma.organization.findFirst({
      where: { id: dto.organizationId, deletedAt: null },
    });
    if (!org) {
      throw new NotFoundException(`Organization ${dto.organizationId} not found`);
    }

    return this.prisma.company.create({
      data: {
        ...dto,
        nextPayDate: dto.nextPayDate ? new Date(dto.nextPayDate) : undefined,
      },
    });
  }

  async findAll(organizationId?: string, user?: any) {
    const where: any = { deletedAt: null };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    // Non-admin users can only see companies they belong to
    if (user && !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const userCompanies = await this.prisma.userCompany.findMany({
        where: { userId: user.id },
        select: { companyId: true },
      });
      where.id = { in: userCompanies.map((uc) => uc.companyId) };
    }

    return this.prisma.company.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        companyStates: true,
        _count: {
          select: { employees: true, payrollRuns: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user?: any) {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
      include: {
        organization: true,
        companyStates: true,
        _count: {
          select: { employees: true, payrollRuns: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company ${id} not found`);
    }

    if (user && !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const membership = await this.prisma.userCompany.findFirst({
        where: { userId: user.id, companyId: id },
      });
      if (!membership) {
        throw new ForbiddenException('Access denied to this company');
      }
    }

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findFirst({ where: { id, deletedAt: null } });
    if (!company) throw new NotFoundException(`Company ${id} not found`);

    return this.prisma.company.update({
      where: { id },
      data: {
        ...dto,
        nextPayDate: dto.nextPayDate ? new Date(dto.nextPayDate) : undefined,
      },
    });
  }

  async softDelete(id: string) {
    const company = await this.prisma.company.findFirst({ where: { id, deletedAt: null } });
    if (!company) throw new NotFoundException(`Company ${id} not found`);

    return this.prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addState(
    companyId: string,
    state: string,
    suiAccountNumber?: string,
    suiRate?: number,
    filingFrequency?: string,
  ) {
    const company = await this.prisma.company.findFirst({ where: { id: companyId, deletedAt: null } });
    if (!company) throw new NotFoundException(`Company ${companyId} not found`);

    return this.prisma.companyState.upsert({
      where: { companyId_state: { companyId, state } },
      update: { suiAccountNumber, suiRate, filingFrequency },
      create: {
        companyId,
        state,
        suiAccountNumber,
        suiRate: suiRate ?? 0,
        filingFrequency: filingFrequency ?? 'QUARTERLY',
      },
    });
  }

  async getStates(companyId: string) {
    return this.prisma.companyState.findMany({
      where: { companyId },
    });
  }
}
