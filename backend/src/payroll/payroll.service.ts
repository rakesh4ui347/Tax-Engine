import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import * as dayjs from 'dayjs';
import { PrismaService } from '../prisma/prisma.service';
import { TaxEngineService } from '../tax-engine/tax-engine.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AuditService } from '../audit/audit.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { ApprovePayrollDto } from './dto/approve-payroll.dto';
import { TaxEngineInput, PAY_PERIODS_PER_YEAR } from '../tax-engine/types';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private prisma: PrismaService,
    private taxEngine: TaxEngineService,
    private webhooks: WebhooksService,
    private audit: AuditService,
  ) {}

  // ─── Create Run ────────────────────────────────────────────────────────────

  async createRun(companyId: string, dto: CreatePayrollRunDto, userId: string) {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.prisma.payrollRun.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        if (existing.companyId !== companyId) {
          throw new ForbiddenException('Idempotency key belongs to different company');
        }
        return existing;
      }
    }

    const company = await this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
    });
    if (!company) throw new NotFoundException(`Company ${companyId} not found`);

    const run = await this.prisma.payrollRun.create({
      data: {
        companyId,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        payDate: new Date(dto.payDate),
        payFrequency: dto.payFrequency,
        status: 'DRAFT',
        idempotencyKey: dto.idempotencyKey,
      },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      resource: 'PayrollRun',
      resourceId: run.id,
      newValue: { status: run.status, companyId, periodStart: dto.periodStart },
    });

    await this.webhooks.dispatch(companyId, 'PAYROLL_RUN_CREATED', {
      payrollRunId: run.id,
      companyId,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
    });

    return run;
  }

  // ─── Calculate Run ─────────────────────────────────────────────────────────

  async calculateRun(payrollRunId: string): Promise<any> {
    return this.prisma.$transaction(
      async (tx) => {
        // 1. Load payroll run
        const run = await tx.payrollRun.findUnique({
          where: { id: payrollRunId },
          include: { company: { include: { companyStates: true } } },
        });

        if (!run) throw new NotFoundException(`Payroll run ${payrollRunId} not found`);

        if (!['DRAFT', 'PENDING_APPROVAL'].includes(run.status)) {
          throw new BadRequestException(
            `Run is in status ${run.status} and cannot be recalculated`,
          );
        }

        // 2. Load all active employees for this company
        const employees = await tx.employee.findMany({
          where: { companyId: run.companyId, isActive: true },
          include: {
            w4Profile: true,
            deductions: {
              where: {
                isActive: true,
                effectiveFrom: { lte: run.payDate },
                OR: [
                  { effectiveTo: null },
                  { effectiveTo: { gte: run.payDate } },
                ],
              },
            },
          },
        });

        if (employees.length === 0) {
          throw new BadRequestException('No active employees found for this company');
        }

        // 3. Get federal and state tax configs
        const taxYear = dayjs(run.payDate).year();
        const federalConfig = await this.taxEngine.getFederalConfig(taxYear);

        // 4. Compute YTD for each employee (wages and taxes from prior runs this year)
        const ytdData = await this.computeYTDData(tx, run.companyId, payrollRunId, taxYear);

        let totalGross = new Decimal(0);
        let totalNet = new Decimal(0);
        let totalTax = new Decimal(0);
        let totalDeductions = new Decimal(0);

        // Aggregate tax liabilities by key
        const liabilityAgg: Record<
          string,
          {
            taxCode: string;
            state: string | null;
            locality: string | null;
            amount: Decimal;
            liabilityBucket: string;
          }
        > = {};

        // 5. Process each employee
        for (const employee of employees) {
          try {
            const result = await this.processEmployee(
              tx,
              employee,
              run,
              federalConfig,
              ytdData,
              taxYear,
            );

            totalGross = totalGross.plus(result.grossPay);
            totalNet = totalNet.plus(result.netPay);
            totalTax = totalTax.plus(result.totalEmployeeTax);
            totalDeductions = totalDeductions.plus(result.totalDeductions);

            // Aggregate tax liabilities
            for (const line of result.taxLines) {
              const key = `${line.taxCode}:${line.state ?? ''}:${line.locality ?? ''}`;
              if (!liabilityAgg[key]) {
                liabilityAgg[key] = {
                  taxCode: line.taxCode,
                  state: line.state ?? null,
                  locality: line.locality ?? null,
                  amount: new Decimal(0),
                  liabilityBucket: line.liabilityBucket,
                };
              }
              liabilityAgg[key].amount = liabilityAgg[key].amount.plus(line.amount);
            }
          } catch (err) {
            this.logger.error(
              `Error processing employee ${employee.id}: ${err.message}`,
            );
            throw err;
          }
        }

        // 6. Upsert TaxLiability rows
        const period = this.getPeriodKey(run.payDate, run.payFrequency as any);

        for (const [, liability] of Object.entries(liabilityAgg)) {
          const dueDate = this.computeLiabilityDueDate(
            run.payDate,
            liability.taxCode,
          );

          await tx.taxLiability.upsert({
            where: {
              companyId_payrollRunId_taxCode_state_locality: {
                companyId: run.companyId,
                payrollRunId,
                taxCode: liability.taxCode as any,
                state: liability.state ?? '',
                locality: liability.locality ?? '',
              },
            },
            update: {
              amount: liability.amount.toDecimalPlaces(2).toNumber(),
            },
            create: {
              companyId: run.companyId,
              payrollRunId,
              taxCode: liability.taxCode as any,
              taxYear,
              period,
              state: liability.state,
              locality: liability.locality,
              amount: liability.amount.toDecimalPlaces(2).toNumber(),
              liabilityBucket: liability.liabilityBucket as any,
              dueDate,
            },
          });
        }

        // 7. Update run totals and status
        const updatedRun = await tx.payrollRun.update({
          where: { id: payrollRunId },
          data: {
            totalGross: totalGross.toDecimalPlaces(2).toNumber(),
            totalNet: totalNet.toDecimalPlaces(2).toNumber(),
            totalTax: totalTax.toDecimalPlaces(2).toNumber(),
            totalDeductions: totalDeductions.toDecimalPlaces(2).toNumber(),
            status: 'PENDING_APPROVAL',
          },
        });

        return updatedRun;
      },
      { timeout: 120000 }, // 2-minute timeout for large payrolls
    );
  }

  private async processEmployee(
    tx: any,
    employee: any,
    run: any,
    federalConfig: any,
    ytdData: Map<string, any>,
    taxYear: number,
  ) {
    const payFrequency = (employee.payFrequency || run.payFrequency) as keyof typeof PAY_PERIODS_PER_YEAR;
    const periodsPerYear = PAY_PERIODS_PER_YEAR[payFrequency] || 26;

    // Compute gross pay
    let grossPay: Decimal;
    let regularPay: Decimal;
    let overtimePay = new Decimal(0);
    let bonusPay = new Decimal(0);

    if (employee.employeeType === 'FTE' && employee.annualSalary) {
      grossPay = new Decimal(employee.annualSalary.toString()).dividedBy(periodsPerYear);
      regularPay = grossPay;
    } else if (employee.employeeType === 'HOURLY' && employee.hourlyRate) {
      const hours = new Decimal(employee.defaultHours?.toString() || '80');
      const rate = new Decimal(employee.hourlyRate.toString());
      regularPay = hours.times(rate);
      grossPay = regularPay; // No OT for default calculation
    } else if (employee.employeeType === 'CONTRACTOR' && employee.hourlyRate) {
      const hours = new Decimal(employee.defaultHours?.toString() || '80');
      const rate = new Decimal(employee.hourlyRate.toString());
      grossPay = hours.times(rate);
      regularPay = grossPay;
    } else {
      throw new BadRequestException(
        `Employee ${employee.id} has insufficient pay configuration`,
      );
    }

    grossPay = grossPay.toDecimalPlaces(2);
    regularPay = regularPay.toDecimalPlaces(2);

    // Compute pre-tax deductions
    let preTaxDeductionAmount = new Decimal(0);
    const deductionDetails: Array<{
      code: string;
      description: string;
      amount: Decimal;
      preTax: boolean;
    }> = [];

    for (const deduction of employee.deductions) {
      let deductionAmt: Decimal;
      if (deduction.amount) {
        deductionAmt = new Decimal(deduction.amount.toString())
          .times(deduction.employeeShare.toString())
          .toDecimalPlaces(2);
      } else if (deduction.percentage) {
        deductionAmt = grossPay
          .times(deduction.percentage.toString())
          .times(deduction.employeeShare.toString())
          .toDecimalPlaces(2);
      } else {
        continue;
      }

      deductionDetails.push({
        code: deduction.code,
        description: deduction.description,
        amount: deductionAmt,
        preTax: deduction.preTax,
      });

      if (deduction.preTax) {
        preTaxDeductionAmount = preTaxDeductionAmount.plus(deductionAmt);
      }
    }

    const ytd = ytdData.get(employee.id) || {
      ytdWages: 0,
      ytdSS: 0,
      ytdMedicare: 0,
      ytdFUTA: 0,
      ytdStateWages: {},
      ytdStateTax: {},
    };

    // Get state configs
    const workStateConfig = await this.taxEngine.getStateConfig(
      employee.workState,
      taxYear,
    );
    const residentStateConfig =
      employee.residentState !== employee.workState
        ? await this.taxEngine.getStateConfig(employee.residentState, taxYear)
        : workStateConfig;

    const taxInput: TaxEngineInput = {
      employeeId: employee.id,
      companyId: run.companyId,
      taxYear,
      payFrequency: payFrequency as any,
      grossPay: grossPay.toNumber(),
      regularPay: regularPay.toNumber(),
      overtimePay: overtimePay.toNumber(),
      bonusPay: bonusPay.toNumber(),
      preTaxDeductions: preTaxDeductionAmount.toNumber(),
      residentState: employee.residentState,
      workState: employee.workState,
      ytdWages: ytd.ytdWages,
      ytdSS: ytd.ytdSS,
      ytdMedicare: ytd.ytdMedicare,
      ytdFUTA: ytd.ytdFUTA,
      ytdStateWages: ytd.ytdStateWages,
      ytdStateTax: ytd.ytdStateTax,
      w4: employee.w4Profile
        ? {
            filingStatus: employee.w4Profile.filingStatus,
            multipleJobs: employee.w4Profile.multipleJobs,
            claimDependents: Number(employee.w4Profile.claimDependents),
            otherIncome: Number(employee.w4Profile.otherIncome),
            deductionsAmount: Number(employee.w4Profile.deductionsAmount),
            additionalWithholding: Number(employee.w4Profile.additionalWithholding),
            exemptFromFIT: employee.w4Profile.exemptFromFIT,
            exemptFromFICA: employee.w4Profile.exemptFromFICA,
            stateFilingStatus: employee.w4Profile.stateFilingStatus || undefined,
            stateAllowances: employee.w4Profile.stateAllowances,
            stateAdditionalWH: Number(employee.w4Profile.stateAdditionalWH),
          }
        : {
            filingStatus: 'SINGLE',
            multipleJobs: false,
            claimDependents: 0,
            otherIncome: 0,
            deductionsAmount: 0,
            additionalWithholding: 0,
            exemptFromFIT: false,
            exemptFromFICA: false,
          },
      federalConfig,
      stateConfig: residentStateConfig,
      workStateConfig,
    };

    const taxResult = await this.taxEngine.calculate(taxInput);

    // Compute totals from tax lines
    let totalEmployeeTax = new Decimal(taxResult.totalEmployeeTax);
    let totalEmployerTax = new Decimal(taxResult.totalEmployerTax);

    // Post-tax deductions
    const postTaxDeductions = deductionDetails
      .filter((d) => !d.preTax)
      .reduce((sum, d) => sum.plus(d.amount), new Decimal(0));

    const totalDeductionsForEmployee = preTaxDeductionAmount.plus(postTaxDeductions);

    // Net pay = gross - employee taxes - all deductions (pre and post tax)
    const netPay = grossPay
      .minus(totalEmployeeTax)
      .minus(totalDeductionsForEmployee)
      .toDecimalPlaces(2);

    // YTD values (including this period)
    const ytdGross = new Decimal(ytd.ytdWages).plus(grossPay).toDecimalPlaces(2);
    const ytdTax = new Decimal(ytd.ytdSS + ytd.ytdMedicare)
      .plus(totalEmployeeTax)
      .toDecimalPlaces(2);
    const ytdNet = ytdGross.minus(ytdTax).minus(totalDeductionsForEmployee).toDecimalPlaces(2);

    // Upsert PayStub
    const payStub = await tx.payStub.upsert({
      where: {
        payrollRunId_employeeId: {
          payrollRunId: run.id,
          employeeId: employee.id,
        },
      },
      update: {
        grossPay: grossPay.toNumber(),
        netPay: netPay.toNumber(),
        regularPay: regularPay.toNumber(),
        overtimePay: overtimePay.toNumber(),
        bonusPay: bonusPay.toNumber(),
        totalEmployeeTax: totalEmployeeTax.toNumber(),
        totalEmployerTax: totalEmployerTax.toNumber(),
        totalDeductions: totalDeductionsForEmployee.toNumber(),
        ytdGross: ytdGross.toNumber(),
        ytdTax: ytdTax.toNumber(),
        ytdNet: ytdNet.toNumber(),
      },
      create: {
        payrollRunId: run.id,
        employeeId: employee.id,
        grossPay: grossPay.toNumber(),
        netPay: netPay.toNumber(),
        regularPay: regularPay.toNumber(),
        overtimePay: overtimePay.toNumber(),
        bonusPay: bonusPay.toNumber(),
        totalEmployeeTax: totalEmployeeTax.toNumber(),
        totalEmployerTax: totalEmployerTax.toNumber(),
        totalDeductions: totalDeductionsForEmployee.toNumber(),
        ytdGross: ytdGross.toNumber(),
        ytdTax: ytdTax.toNumber(),
        ytdNet: ytdNet.toNumber(),
      },
    });

    // Delete existing tax lines for this stub and recreate
    await tx.taxLine.deleteMany({ where: { payStubId: payStub.id } });
    for (const line of taxResult.taxLines) {
      await tx.taxLine.create({
        data: {
          payStubId: payStub.id,
          taxCode: line.taxCode as any,
          taxYear,
          description: line.description,
          taxableWage: line.taxableWage,
          amount: line.amount,
          isEmployee: line.isEmployee,
          liabilityBucket: line.liabilityBucket as any,
          state: line.state,
          locality: line.locality,
        },
      });
    }

    // Delete existing deduction lines and recreate
    await tx.deductionLine.deleteMany({ where: { payStubId: payStub.id } });
    for (const ded of deductionDetails) {
      await tx.deductionLine.create({
        data: {
          payStubId: payStub.id,
          code: ded.code,
          description: ded.description,
          amount: ded.amount.toNumber(),
          preTax: ded.preTax,
        },
      });
    }

    return {
      grossPay,
      netPay,
      totalEmployeeTax,
      totalEmployerTax,
      totalDeductions: totalDeductionsForEmployee,
      taxLines: taxResult.taxLines,
    };
  }

  private async computeYTDData(
    tx: any,
    companyId: string,
    currentRunId: string,
    taxYear: number,
  ): Promise<Map<string, any>> {
    const yearStart = new Date(`${taxYear}-01-01`);
    const yearEnd = new Date(`${taxYear}-12-31T23:59:59`);

    // Get all completed pay stubs for this company this year (excluding current run)
    const payStubs = await tx.payStub.findMany({
      where: {
        payrollRunId: { not: currentRunId },
        payrollRun: {
          companyId,
          status: 'COMPLETED',
          payDate: { gte: yearStart, lte: yearEnd },
        },
      },
      include: {
        taxLines: true,
      },
    });

    const ytdMap = new Map<string, any>();

    for (const stub of payStubs) {
      const empId = stub.employeeId;
      if (!ytdMap.has(empId)) {
        ytdMap.set(empId, {
          ytdWages: 0,
          ytdSS: 0,
          ytdMedicare: 0,
          ytdFUTA: 0,
          ytdStateWages: {},
          ytdStateTax: {},
        });
      }

      const ytd = ytdMap.get(empId);
      ytd.ytdWages += Number(stub.grossPay);

      for (const line of stub.taxLines) {
        if (line.taxCode === 'SS_EMPLOYEE') {
          ytd.ytdSS += Number(line.taxableWage);
        }
        if (line.taxCode === 'MEDICARE_EMPLOYEE') {
          ytd.ytdMedicare += Number(line.taxableWage);
        }
        if (line.taxCode === 'FUTA') {
          ytd.ytdFUTA += Number(line.taxableWage);
        }
        if (line.taxCode === 'SIT' && line.state) {
          ytd.ytdStateWages[line.state] =
            (ytd.ytdStateWages[line.state] || 0) + Number(line.taxableWage);
          ytd.ytdStateTax[line.state] =
            (ytd.ytdStateTax[line.state] || 0) + Number(line.amount);
        }
        if (line.taxCode === 'SUI_EMPLOYER' && line.state) {
          ytd.ytdStateWages[line.state] =
            (ytd.ytdStateWages[line.state] || 0) + Number(line.taxableWage);
        }
      }
    }

    return ytdMap;
  }

  private getPeriodKey(payDate: Date, payFrequency: string): string {
    const d = dayjs(payDate);
    const year = d.year();
    const quarter = Math.ceil((d.month() + 1) / 3);
    const month = String(d.month() + 1).padStart(2, '0');

    if (payFrequency === 'MONTHLY') return `${year}-${month}`;
    return `${year}-Q${quarter}`;
  }

  private computeLiabilityDueDate(payDate: Date, taxCode: string): Date {
    const d = dayjs(payDate);
    // Federal deposits: 941 taxes due next business day (semi-weekly) or 15th of month after quarter
    // Simplified: return 15 days after pay date for FEDERAL/FICA, end of next month for FUTA
    if (['FIT', 'SS_EMPLOYEE', 'SS_EMPLOYER', 'MEDICARE_EMPLOYEE', 'MEDICARE_EMPLOYER', 'ADDL_MEDICARE'].includes(taxCode)) {
      return d.add(3, 'day').toDate();
    }
    if (taxCode === 'FUTA') {
      return d.add(1, 'month').date(31).toDate();
    }
    // State: quarterly
    return d.add(1, 'month').date(15).toDate();
  }

  // ─── Approve Run ────────────────────────────────────────────────────────────

  async approveRun(runId: string, approverId: string, dto: ApprovePayrollDto) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
    });

    if (!run) throw new NotFoundException(`Payroll run ${runId} not found`);

    if (run.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(
        `Run must be in PENDING_APPROVAL status to approve. Current: ${run.status}`,
      );
    }

    // Verify approver has APPROVER role
    const approver = await this.prisma.user.findUnique({
      where: { id: approverId },
    });

    if (!approver || !['APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(approver.role)) {
      throw new ForbiddenException('User does not have APPROVER role');
    }

    const [updatedRun] = await this.prisma.$transaction([
      this.prisma.payrollRun.update({
        where: { id: runId },
        data: { status: 'APPROVED' },
      }),
      this.prisma.payrollApproval.create({
        data: {
          payrollRunId: runId,
          approverId,
          status: 'APPROVED',
          notes: dto.notes,
        },
      }),
    ]);

    await this.audit.log({
      userId: approverId,
      action: 'APPROVE',
      resource: 'PayrollRun',
      resourceId: runId,
      newValue: { status: 'APPROVED', notes: dto.notes },
    });

    await this.webhooks.dispatch(run.companyId, 'PAYROLL_RUN_APPROVED', {
      payrollRunId: runId,
      approverId,
    });

    return updatedRun;
  }

  // ─── Process (Submit) Run ──────────────────────────────────────────────────

  async processRun(runId: string, userId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
    });

    if (!run) throw new NotFoundException(`Payroll run ${runId} not found`);

    if (run.status !== 'APPROVED') {
      throw new BadRequestException(
        `Run must be APPROVED before processing. Current: ${run.status}`,
      );
    }

    const processing = await this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: 'PROCESSING' },
    });

    try {
      // Simulate disbursement processing (in real system, this calls ACH/payroll processor)
      this.logger.log(`Processing payroll run ${runId} for disbursement`);

      // Mark as completed
      const completed = await this.prisma.payrollRun.update({
        where: { id: runId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      });

      await this.audit.log({
        userId,
        action: 'PROCESS',
        resource: 'PayrollRun',
        resourceId: runId,
        newValue: { status: 'COMPLETED', processedAt: new Date().toISOString() },
      });

      await this.webhooks.dispatch(run.companyId, 'PAYROLL_RUN_COMPLETED', {
        payrollRunId: runId,
        processedAt: new Date().toISOString(),
      });

      return completed;
    } catch (err) {
      await this.prisma.payrollRun.update({
        where: { id: runId },
        data: { status: 'FAILED' },
      });

      await this.webhooks.dispatch(run.companyId, 'PAYROLL_RUN_FAILED', {
        payrollRunId: runId,
        error: err.message,
      });

      throw err;
    }
  }

  // ─── Void Run ───────────────────────────────────────────────────────────────

  async voidRun(runId: string, userId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
    });

    if (!run) throw new NotFoundException(`Payroll run ${runId} not found`);

    if (['VOIDED', 'PROCESSING'].includes(run.status)) {
      throw new BadRequestException(`Cannot void a run in ${run.status} status`);
    }

    const voided = await this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: 'VOIDED' },
    });

    await this.audit.log({
      userId,
      action: 'VOID',
      resource: 'PayrollRun',
      resourceId: runId,
      oldValue: { status: run.status },
      newValue: { status: 'VOIDED' },
    });

    return voided;
  }

  // ─── Query Methods ──────────────────────────────────────────────────────────

  async getRunById(runId: string, companyId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, companyId },
      include: {
        payStubs: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
                employeeType: true,
              },
            },
            taxLines: true,
            deductionLines: true,
          },
        },
        approvals: {
          include: {
            approver: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        taxLiabilities: true,
      },
    });

    if (!run) throw new NotFoundException(`Payroll run ${runId} not found`);

    return run;
  }

  async listRuns(
    companyId: string,
    filters: {
      status?: string;
      periodStart?: string;
      periodEnd?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const where: any = { companyId };

    if (filters.status) where.status = filters.status;
    if (filters.periodStart)
      where.periodStart = { gte: new Date(filters.periodStart) };
    if (filters.periodEnd)
      where.periodEnd = { lte: new Date(filters.periodEnd) };

    const [runs, total] = await Promise.all([
      this.prisma.payrollRun.findMany({
        where,
        include: {
          _count: { select: { payStubs: true } },
        },
        orderBy: { payDate: 'desc' },
        take: filters.limit ?? 20,
        skip: filters.offset ?? 0,
      }),
      this.prisma.payrollRun.count({ where }),
    ]);

    return { runs, total, limit: filters.limit ?? 20, offset: filters.offset ?? 0 };
  }

  async getPayStubsForRun(runId: string, companyId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, companyId },
    });
    if (!run) throw new NotFoundException(`Payroll run ${runId} not found`);

    return this.prisma.payStub.findMany({
      where: { payrollRunId: runId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            employeeType: true,
            residentState: true,
            workState: true,
          },
        },
        taxLines: true,
        deductionLines: true,
      },
      orderBy: [
        { employee: { lastName: 'asc' } },
        { employee: { firstName: 'asc' } },
      ],
    });
  }
}
