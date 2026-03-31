import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateW4Dto } from './dto/create-w4.dto';
import { CreateDeductionDto } from './dto/create-deduction.dto';

const ALGORITHM = 'aes-256-gcm';

function encryptSSN(ssn: string): string {
  const rawKey = process.env.SSN_ENCRYPTION_KEY || '0000000000000000000000000000000000000000000000000000000000000000';
  const key = Buffer.from(rawKey, 'hex').subarray(0, 32);
  if (key.length < 32) {
    throw new Error(
      `SSN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Got ${key.length} bytes from key "${rawKey.slice(0, 8)}...". ` +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(ssn, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSSN(encryptedSSN: string): string {
  try {
    if (!encryptedSSN.includes(':')) return encryptedSSN; // legacy plain or demo
    const [ivHex, authTagHex, dataHex] = encryptedSSN.split(':');
    const key = Buffer.from(
      process.env.SSN_ENCRYPTION_KEY || '0000000000000000000000000000000000000000000000000000000000000000',
      'hex',
    ).subarray(0, 32);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(data).toString('utf8') + decipher.final('utf8');
  } catch {
    return '[ENCRYPTED]';
  }
}

function maskSSN(ssn: string): string {
  const decrypted = decryptSSN(ssn);
  if (decrypted === '[ENCRYPTED]') return '***-**-****';
  return '***-**-' + decrypted.replace(/-/g, '').slice(-4);
}

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({
      where: { companyId_employeeNumber: { companyId, employeeNumber: dto.employeeNumber } },
    });
    if (existing) {
      throw new ConflictException(
        `Employee number ${dto.employeeNumber} already exists in this company`,
      );
    }

    if (dto.employeeType === 'FTE' && !dto.annualSalary) {
      throw new BadRequestException('Annual salary is required for FTE employees');
    }
    if (dto.employeeType === 'HOURLY' && !dto.hourlyRate) {
      throw new BadRequestException('Hourly rate is required for HOURLY employees');
    }

    const encryptedSSN = encryptSSN(dto.ssn);

    const employee = await this.prisma.employee.create({
      data: {
        companyId,
        employeeNumber: dto.employeeNumber,
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        ssn: encryptedSSN,
        dateOfBirth: new Date(dto.dateOfBirth),
        hireDate: new Date(dto.hireDate),
        terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
        email: dto.email,
        phone: dto.phone,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        zip: dto.zip,
        employeeType: dto.employeeType || 'FTE',
        annualSalary: dto.annualSalary,
        payFrequency: dto.payFrequency,
        hourlyRate: dto.hourlyRate,
        defaultHours: dto.defaultHours ?? 80,
        overtimeEligible: dto.overtimeEligible ?? false,
        residentState: dto.residentState,
        workState: dto.workState,
      },
    });

    return this.maskEmployeeSSN(employee);
  }

  async findAll(companyId: string, includeInactive = false) {
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        isActive: includeInactive ? undefined : true,
      },
      include: {
        w4Profile: true,
        deductions: { where: { isActive: true } },
        _count: { select: { payStubs: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return employees.map((e) => this.maskEmployeeSSN(e));
  }

  async findOne(companyId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      include: {
        w4Profile: true,
        deductions: true,
        payStubs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { payrollRun: { select: { periodStart: true, periodEnd: true, payDate: true } } },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found in company ${companyId}`);
    }

    return this.maskEmployeeSSN(employee);
  }

  async update(companyId: string, employeeId: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...dto,
        terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
      },
    });

    return this.maskEmployeeSSN(updated);
  }

  async getW4(companyId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    return this.prisma.w4Profile.findUnique({ where: { employeeId } });
  }

  async upsertW4(companyId: string, employeeId: string, dto: CreateW4Dto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    return this.prisma.w4Profile.upsert({
      where: { employeeId },
      update: {
        taxYear: dto.taxYear,
        filingStatus: dto.filingStatus,
        multipleJobs: dto.multipleJobs ?? false,
        claimDependents: dto.claimDependents ?? 0,
        otherIncome: dto.otherIncome ?? 0,
        deductionsAmount: dto.deductionsAmount ?? 0,
        additionalWithholding: dto.additionalWithholding ?? 0,
        exemptFromFIT: dto.exemptFromFIT ?? false,
        exemptFromFICA: dto.exemptFromFICA ?? false,
        stateFilingStatus: dto.stateFilingStatus,
        stateAllowances: dto.stateAllowances ?? 0,
        stateAdditionalWH: dto.stateAdditionalWH ?? 0,
      },
      create: {
        employeeId,
        taxYear: dto.taxYear,
        filingStatus: dto.filingStatus,
        multipleJobs: dto.multipleJobs ?? false,
        claimDependents: dto.claimDependents ?? 0,
        otherIncome: dto.otherIncome ?? 0,
        deductionsAmount: dto.deductionsAmount ?? 0,
        additionalWithholding: dto.additionalWithholding ?? 0,
        exemptFromFIT: dto.exemptFromFIT ?? false,
        exemptFromFICA: dto.exemptFromFICA ?? false,
        stateFilingStatus: dto.stateFilingStatus,
        stateAllowances: dto.stateAllowances ?? 0,
        stateAdditionalWH: dto.stateAdditionalWH ?? 0,
      },
    });
  }

  async addDeduction(companyId: string, employeeId: string, dto: CreateDeductionDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    if (!dto.amount && !dto.percentage) {
      throw new BadRequestException('Either amount or percentage must be specified');
    }

    return this.prisma.employeeDeduction.create({
      data: {
        employeeId,
        code: dto.code,
        description: dto.description,
        amount: dto.amount,
        percentage: dto.percentage,
        preTax: dto.preTax ?? true,
        employeeShare: dto.employeeShare ?? 1.0,
        employerShare: dto.employerShare ?? 0.0,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
    });
  }

  async updateDeduction(deductionId: string, dto: Partial<CreateDeductionDto>) {
    return this.prisma.employeeDeduction.update({
      where: { id: deductionId },
      data: {
        ...dto,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
    });
  }

  async deleteDeduction(deductionId: string) {
    return this.prisma.employeeDeduction.update({
      where: { id: deductionId },
      data: { isActive: false },
    });
  }

  async getPayStubs(companyId: string, employeeId: string, limit = 10) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    return this.prisma.payStub.findMany({
      where: { employeeId },
      include: {
        payrollRun: {
          select: { id: true, periodStart: true, periodEnd: true, payDate: true, status: true },
        },
        taxLines: true,
        deductionLines: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private maskEmployeeSSN(employee: any) {
    return {
      ...employee,
      ssn: maskSSN(employee.ssn),
    };
  }
}
