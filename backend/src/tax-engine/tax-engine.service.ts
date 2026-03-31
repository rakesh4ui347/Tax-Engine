import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import { ReciprocityService } from './reciprocity.service';
import { calculateFederal } from './federal-calculator';
import { calculateState } from './state-calculator';
import { TaxEngineInput, TaxEngineOutput, TaxLine } from './types';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class TaxEngineService {
  private readonly logger = new Logger(TaxEngineService.name);

  constructor(
    private prisma: PrismaService,
    private reciprocityService: ReciprocityService,
  ) {}

  async getFederalConfig(taxYear: number) {
    const config = await this.prisma.federalTaxConfig.findUnique({
      where: { taxYear },
    });

    if (!config) {
      // Fall back to most recent available year
      const latest = await this.prisma.federalTaxConfig.findFirst({
        orderBy: { taxYear: 'desc' },
      });
      if (!latest) {
        throw new NotFoundException(`No federal tax config found for year ${taxYear}`);
      }
      this.logger.warn(
        `No federal config for ${taxYear}, using ${latest.taxYear}`,
      );
      return latest;
    }

    return config;
  }

  async getStateConfig(state: string, taxYear: number) {
    const config = await this.prisma.stateTaxConfig.findFirst({
      where: { state, taxYear },
    });

    if (!config) {
      // Try previous year
      const fallback = await this.prisma.stateTaxConfig.findFirst({
        where: { state },
        orderBy: { taxYear: 'desc' },
      });
      return fallback;
    }

    return config;
  }

  async calculate(input: TaxEngineInput): Promise<TaxEngineOutput> {
    const federalConfig =
      input.federalConfig || (await this.getFederalConfig(input.taxYear));

    const workStateConfig =
      input.workStateConfig || (await this.getStateConfig(input.workState, input.taxYear));

    const residentStateConfig =
      input.stateConfig ||
      (input.residentState !== input.workState
        ? await this.getStateConfig(input.residentState, input.taxYear)
        : workStateConfig);

    // Get SUI rate from company state registration
    const companyState = await this.prisma.companyState.findUnique({
      where: {
        companyId_state: {
          companyId: input.companyId,
          state: input.workState,
        },
      },
    });
    const suiRate = companyState ? Number(companyState.suiRate) : 0.027;

    // Check reciprocity
    const hasReciprocity = await this.reciprocityService.hasReciprocity(
      input.residentState,
      input.workState,
    );

    // Calculate federal taxes
    const federalLines = calculateFederal({
      ...input,
      federalConfig,
    });

    // Calculate state taxes
    const stateLines = calculateState({
      input: {
        ...input,
        federalConfig,
        stateConfig: residentStateConfig,
        workStateConfig,
      },
      hasReciprocity,
      workStateConfig,
      residentStateConfig,
      suiRate,
    });

    const allLines: TaxLine[] = [...federalLines, ...stateLines];

    // Compute totals
    let totalEmployeeTax = new Decimal(0);
    let totalEmployerTax = new Decimal(0);
    const taxableWagesByCode: Record<string, number> = {};

    for (const line of allLines) {
      if (line.isEmployee) {
        totalEmployeeTax = totalEmployeeTax.plus(line.amount);
      } else {
        totalEmployerTax = totalEmployerTax.plus(line.amount);
      }
      taxableWagesByCode[line.taxCode] = (taxableWagesByCode[line.taxCode] ?? 0) + line.taxableWage;
    }

    return {
      taxLines: allLines,
      totalEmployeeTax: totalEmployeeTax.toDecimalPlaces(2).toNumber(),
      totalEmployerTax: totalEmployerTax.toDecimalPlaces(2).toNumber(),
      taxableWagesByCode,
    };
  }

  async previewTax(
    employeeId: string,
    companyId: string,
    grossPay: number,
  ): Promise<TaxEngineOutput> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      include: {
        w4Profile: true,
        company: true,
      },
    });

    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    const taxYear = new Date().getFullYear();
    const payFrequency = (employee.payFrequency || employee.company.payFrequency) as any;

    const input: TaxEngineInput = {
      employeeId: employee.id,
      companyId,
      taxYear,
      payFrequency,
      grossPay,
      regularPay: grossPay,
      overtimePay: 0,
      bonusPay: 0,
      preTaxDeductions: 0,
      residentState: employee.residentState,
      workState: employee.workState,
      ytdWages: 0,
      ytdSS: 0,
      ytdMedicare: 0,
      ytdFUTA: 0,
      ytdStateWages: {},
      ytdStateTax: {},
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
      federalConfig: null,
      stateConfig: null,
    };

    return this.calculate(input);
  }
}
