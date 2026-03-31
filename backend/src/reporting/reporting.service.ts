import { Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import { stringify } from 'csv-stringify/sync';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  // ─── Payroll Register ─────────────────────────────────────────────────────

  async getPayrollRegister(companyId: string, payrollRunId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: payrollRunId, companyId },
    });
    if (!run) throw new NotFoundException(`Payroll run ${payrollRunId} not found`);

    const payStubs = await this.prisma.payStub.findMany({
      where: { payrollRunId },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            employeeType: true,
            residentState: true,
            workState: true,
            annualSalary: true,
            hourlyRate: true,
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

    return payStubs.map((stub) => {
      const taxes: Record<string, number> = {};
      let employerTaxTotal = 0;

      for (const tl of stub.taxLines) {
        const key = `${tl.taxCode}${tl.state ? `_${tl.state}` : ''}`;
        taxes[key] = (taxes[key] || 0) + Number(tl.amount);
        if (!tl.isEmployee) employerTaxTotal += Number(tl.amount);
      }

      const preTaxDeductions = stub.deductionLines
        .filter((d) => d.preTax)
        .reduce((sum, d) => sum + Number(d.amount), 0);

      const postTaxDeductions = stub.deductionLines
        .filter((d) => !d.preTax)
        .reduce((sum, d) => sum + Number(d.amount), 0);

      return {
        employeeNumber: stub.employee.employeeNumber,
        employeeName: `${stub.employee.firstName} ${stub.employee.lastName}`,
        employeeType: stub.employee.employeeType,
        residentState: stub.employee.residentState,
        workState: stub.employee.workState,
        regularPay: Number(stub.regularPay),
        overtimePay: Number(stub.overtimePay),
        bonusPay: Number(stub.bonusPay),
        grossPay: Number(stub.grossPay),
        preTaxDeductions,
        postTaxDeductions,
        totalDeductions: Number(stub.totalDeductions),
        employeeTaxes: Number(stub.totalEmployeeTax),
        employerTaxes: Number(stub.totalEmployerTax),
        netPay: Number(stub.netPay),
        ytdGross: Number(stub.ytdGross),
        ytdTax: Number(stub.ytdTax),
        ytdNet: Number(stub.ytdNet),
        taxBreakdown: taxes,
        deductionBreakdown: stub.deductionLines.map((d) => ({
          code: d.code,
          description: d.description,
          amount: Number(d.amount),
          preTax: d.preTax,
        })),
      };
    });
  }

  // ─── Tax Liability Summary ────────────────────────────────────────────────

  async getTaxLiabilitySummary(companyId: string, year: number, quarter?: number) {
    const where: any = {
      companyId,
      taxYear: year,
    };

    if (quarter) {
      where.period = { contains: `Q${quarter}` };
    }

    const liabilities = await this.prisma.taxLiability.findMany({
      where,
      orderBy: [{ liabilityBucket: 'asc' }, { taxCode: 'asc' }, { state: 'asc' }],
    });

    // Group by bucket
    const byBucket: Record<string, any> = {};
    let grandTotal = new Decimal(0);

    for (const liability of liabilities) {
      const bucket = liability.liabilityBucket;
      if (!byBucket[bucket]) {
        byBucket[bucket] = {
          bucket,
          items: [],
          subtotal: 0,
        };
      }

      byBucket[bucket].items.push({
        taxCode: liability.taxCode,
        state: liability.state,
        locality: liability.locality,
        period: liability.period,
        amount: Number(liability.amount),
        dueDate: liability.dueDate,
        paidAt: liability.paidAt,
        filingStatus: liability.filingStatus,
      });

      byBucket[bucket].subtotal = new Decimal(byBucket[bucket].subtotal)
        .plus(liability.amount)
        .toNumber();
      grandTotal = grandTotal.plus(liability.amount);
    }

    return {
      companyId,
      taxYear: year,
      quarter: quarter || null,
      liabilities: Object.values(byBucket),
      grandTotal: grandTotal.toDecimalPlaces(2).toNumber(),
      totalPaid: liabilities
        .filter((l) => l.paidAt)
        .reduce((sum, l) => sum + Number(l.amount), 0),
      totalPending: liabilities
        .filter((l) => !l.paidAt)
        .reduce((sum, l) => sum + Number(l.amount), 0),
    };
  }

  // ─── Employee YTD ─────────────────────────────────────────────────────────

  async getEmployeeYTD(companyId: string, employeeId: string, year: number) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        employeeType: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }

    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year}-12-31T23:59:59`);

    const payStubs = await this.prisma.payStub.findMany({
      where: {
        employeeId,
        payrollRun: {
          companyId,
          status: { in: ['APPROVED', 'PROCESSING', 'COMPLETED'] },
          payDate: { gte: yearStart, lte: yearEnd },
        },
      },
      include: {
        payrollRun: { select: { payDate: true, periodStart: true, periodEnd: true } },
        taxLines: true,
        deductionLines: true,
      },
      orderBy: { payrollRun: { payDate: 'asc' } },
    });

    // Aggregate YTD totals
    let ytdGross = new Decimal(0);
    let ytdNet = new Decimal(0);
    let ytdEmployeeTax = new Decimal(0);
    let ytdEmployerTax = new Decimal(0);
    let ytdDeductions = new Decimal(0);

    const ytdByTaxCode: Record<string, { amount: Decimal; taxableWage: Decimal }> = {};
    const ytdByDeductionCode: Record<string, Decimal> = {};

    for (const stub of payStubs) {
      ytdGross = ytdGross.plus(stub.grossPay);
      ytdNet = ytdNet.plus(stub.netPay);
      ytdEmployeeTax = ytdEmployeeTax.plus(stub.totalEmployeeTax);
      ytdEmployerTax = ytdEmployerTax.plus(stub.totalEmployerTax);
      ytdDeductions = ytdDeductions.plus(stub.totalDeductions);

      for (const tl of stub.taxLines) {
        const key = `${tl.taxCode}${tl.state ? `_${tl.state}` : ''}`;
        if (!ytdByTaxCode[key]) {
          ytdByTaxCode[key] = { amount: new Decimal(0), taxableWage: new Decimal(0) };
        }
        ytdByTaxCode[key].amount = ytdByTaxCode[key].amount.plus(tl.amount);
        ytdByTaxCode[key].taxableWage = ytdByTaxCode[key].taxableWage.plus(tl.taxableWage);
      }

      for (const ded of stub.deductionLines) {
        ytdByDeductionCode[ded.code] = (ytdByDeductionCode[ded.code] || new Decimal(0)).plus(
          ded.amount,
        );
      }
    }

    return {
      employee,
      year,
      payPeriods: payStubs.length,
      ytdGross: ytdGross.toDecimalPlaces(2).toNumber(),
      ytdNet: ytdNet.toDecimalPlaces(2).toNumber(),
      ytdEmployeeTax: ytdEmployeeTax.toDecimalPlaces(2).toNumber(),
      ytdEmployerTax: ytdEmployerTax.toDecimalPlaces(2).toNumber(),
      ytdDeductions: ytdDeductions.toDecimalPlaces(2).toNumber(),
      taxBreakdown: Object.fromEntries(
        Object.entries(ytdByTaxCode).map(([k, v]) => [
          k,
          {
            amount: v.amount.toDecimalPlaces(2).toNumber(),
            taxableWage: v.taxableWage.toDecimalPlaces(2).toNumber(),
          },
        ]),
      ),
      deductionBreakdown: Object.fromEntries(
        Object.entries(ytdByDeductionCode).map(([k, v]) => [
          k,
          v.toDecimalPlaces(2).toNumber(),
        ]),
      ),
      payPeriodDetails: payStubs.map((stub) => ({
        payDate: stub.payrollRun.payDate,
        periodStart: stub.payrollRun.periodStart,
        periodEnd: stub.payrollRun.periodEnd,
        grossPay: Number(stub.grossPay),
        netPay: Number(stub.netPay),
        employeeTax: Number(stub.totalEmployeeTax),
        deductions: Number(stub.totalDeductions),
      })),
    };
  }

  // ─── Export Payroll CSV ───────────────────────────────────────────────────

  async exportPayrollCsv(companyId: string, payrollRunId: string): Promise<string> {
    const register = await this.getPayrollRegister(companyId, payrollRunId);

    if (register.length === 0) {
      return 'No payroll data found';
    }

    const rows = register.map((r) => ({
      'Employee #': r.employeeNumber,
      'Employee Name': r.employeeName,
      'Type': r.employeeType,
      'Resident State': r.residentState,
      'Work State': r.workState,
      'Regular Pay': r.regularPay.toFixed(2),
      'Overtime Pay': r.overtimePay.toFixed(2),
      'Bonus Pay': r.bonusPay.toFixed(2),
      'Gross Pay': r.grossPay.toFixed(2),
      'Pre-Tax Deductions': r.preTaxDeductions.toFixed(2),
      'Employee Taxes': r.employeeTaxes.toFixed(2),
      'Post-Tax Deductions': r.postTaxDeductions.toFixed(2),
      'Net Pay': r.netPay.toFixed(2),
      'Employer Taxes': r.employerTaxes.toFixed(2),
      'YTD Gross': r.ytdGross.toFixed(2),
      'YTD Tax': r.ytdTax.toFixed(2),
      'YTD Net': r.ytdNet.toFixed(2),
    }));

    return stringify(rows, { header: true });
  }

  // ─── All-Employee YTD (for YTD report page) ───────────────────────────────

  async getAllEmployeesYTD(companyId: string, year: number) {
    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year}-12-31T23:59:59`);

    const payStubs = await this.prisma.payStub.findMany({
      where: {
        payrollRun: {
          companyId,
          status: { in: ['APPROVED', 'PROCESSING', 'COMPLETED'] },
          payDate: { gte: yearStart, lte: yearEnd },
        },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        taxLines: { select: { taxCode: true, amount: true, isEmployee: true, liabilityBucket: true, state: true } },
        deductionLines: { select: { amount: true } },
      },
    });

    // Aggregate per employee
    const byEmployee: Record<string, {
      employeeId: string;
      employeeName: string;
      ytdGross: Decimal;
      ytdNet: Decimal;
      ytdFit: Decimal;
      ytdSS: Decimal;
      ytdMedicare: Decimal;
      ytdStateTax: Decimal;
      ytdDeductions: Decimal;
    }> = {};

    for (const stub of payStubs) {
      const eid = stub.employeeId;
      if (!byEmployee[eid]) {
        byEmployee[eid] = {
          employeeId: eid,
          employeeName: `${stub.employee.firstName} ${stub.employee.lastName}`,
          ytdGross: new Decimal(0),
          ytdNet: new Decimal(0),
          ytdFit: new Decimal(0),
          ytdSS: new Decimal(0),
          ytdMedicare: new Decimal(0),
          ytdStateTax: new Decimal(0),
          ytdDeductions: new Decimal(0),
        };
      }

      const emp = byEmployee[eid];
      emp.ytdGross = emp.ytdGross.plus(stub.grossPay);
      emp.ytdNet = emp.ytdNet.plus(stub.netPay);
      emp.ytdDeductions = emp.ytdDeductions.plus(stub.totalDeductions);

      for (const tl of stub.taxLines) {
        if (!tl.isEmployee) continue;
        const amt = new Decimal(tl.amount);
        if (tl.taxCode === 'FIT') emp.ytdFit = emp.ytdFit.plus(amt);
        else if (tl.taxCode === 'SS_EMPLOYEE') emp.ytdSS = emp.ytdSS.plus(amt);
        else if (tl.taxCode === 'MEDICARE_EMPLOYEE' || tl.taxCode === 'ADDL_MEDICARE') emp.ytdMedicare = emp.ytdMedicare.plus(amt);
        else if (tl.liabilityBucket === 'STATE') emp.ytdStateTax = emp.ytdStateTax.plus(amt);
      }
    }

    return Object.values(byEmployee)
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName))
      .map((e) => ({
        employeeId: e.employeeId,
        employeeName: e.employeeName,
        ytdGross: e.ytdGross.toDecimalPlaces(2).toNumber(),
        ytdFit: e.ytdFit.toDecimalPlaces(2).toNumber(),
        ytdSocialSecurity: e.ytdSS.toDecimalPlaces(2).toNumber(),
        ytdMedicare: e.ytdMedicare.toDecimalPlaces(2).toNumber(),
        ytdStateTax: e.ytdStateTax.toDecimalPlaces(2).toNumber(),
        ytdDeductions: e.ytdDeductions.toDecimalPlaces(2).toNumber(),
        ytdNet: e.ytdNet.toDecimalPlaces(2).toNumber(),
      }));
  }

  // ─── Payroll Register by date range (for register report page) ────────────

  async getPayrollRegisterByFilters(companyId: string, startDate?: string, endDate?: string, year?: number) {
    const whereRun: any = {
      companyId,
      status: { in: ['APPROVED', 'PROCESSING', 'COMPLETED'] },
    };

    if (startDate || endDate) {
      whereRun.payDate = {};
      if (startDate) whereRun.payDate.gte = new Date(startDate);
      if (endDate) whereRun.payDate.lte = new Date(endDate);
    } else if (year) {
      whereRun.payDate = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31T23:59:59`),
      };
    }

    const payStubs = await this.prisma.payStub.findMany({
      where: { payrollRun: whereRun },
      include: {
        payrollRun: { select: { periodStart: true, periodEnd: true, payDate: true } },
        employee: { select: { id: true, firstName: true, lastName: true } },
        taxLines: { select: { taxCode: true, amount: true, isEmployee: true, liabilityBucket: true } },
        deductionLines: { select: { amount: true } },
      },
      orderBy: [
        { payrollRun: { payDate: 'asc' } },
        { employee: { lastName: 'asc' } },
      ],
    });

    return payStubs.map((stub) => {
      const taxes: Record<string, number> = {};
      for (const tl of stub.taxLines) {
        if (!tl.isEmployee) continue;
        taxes[tl.taxCode] = (taxes[tl.taxCode] || 0) + Number(tl.amount);
      }

      const ps = stub.payrollRun.periodStart;
      const pe = stub.payrollRun.periodEnd;
      const period = `${ps.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${pe.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

      const totalDeductions = stub.deductionLines.reduce((s, d) => s + Number(d.amount), 0);

      return {
        employeeId: stub.employeeId,
        employeeName: `${stub.employee.firstName} ${stub.employee.lastName}`,
        period,
        grossPay: Number(stub.grossPay),
        federalIncomeTax: taxes['FIT'] ?? 0,
        socialSecurity: taxes['SS_EMPLOYEE'] ?? 0,
        medicare: (taxes['MEDICARE_EMPLOYEE'] ?? 0) + (taxes['ADDL_MEDICARE'] ?? 0),
        stateTax: stub.taxLines
          .filter((tl) => tl.isEmployee && tl.liabilityBucket === 'STATE')
          .reduce((s, tl) => s + Number(tl.amount), 0),
        totalDeductions,
        netPay: Number(stub.netPay),
      };
    });
  }

  // ─── Tax liability summary formatted for frontend ─────────────────────────

  async getTaxLiabilitySummaryFormatted(companyId: string, year: number, quarter?: number) {
    const where: any = { companyId, taxYear: year };
    if (quarter) {
      where.period = { contains: `Q${quarter}` };
    }

    const liabilities = await this.prisma.taxLiability.findMany({
      where,
      orderBy: [{ liabilityBucket: 'asc' }, { taxCode: 'asc' }],
    });

    const TAX_CODE_DESCRIPTIONS: Record<string, string> = {
      FIT: 'Federal Income Tax',
      SS_EMPLOYEE: 'Social Security (Employee)',
      SS_EMPLOYER: 'Social Security (Employer)',
      MEDICARE_EMPLOYEE: 'Medicare (Employee)',
      MEDICARE_EMPLOYER: 'Medicare (Employer)',
      ADDL_MEDICARE: 'Additional Medicare',
      FUTA: 'Federal Unemployment Tax (FUTA)',
      SIT: 'State Income Tax',
      SUI_EMPLOYER: 'State Unemployment Insurance (Employer)',
      SUI_EMPLOYEE: 'State Unemployment Insurance (Employee)',
      SDI: 'State Disability Insurance',
      LOCAL: 'Local Earned Income Tax',
      CITY: 'City Income Tax',
    };

    // Group by bucket
    const byBucket: Record<string, {
      bucket: string;
      totalAmount: Decimal;
      paidAmount: Decimal;
      pendingAmount: Decimal;
      liabilities: any[];
    }> = {};

    for (const l of liabilities) {
      const bucket = l.liabilityBucket as string;
      if (!byBucket[bucket]) {
        byBucket[bucket] = {
          bucket,
          totalAmount: new Decimal(0),
          paidAmount: new Decimal(0),
          pendingAmount: new Decimal(0),
          liabilities: [],
        };
      }

      const isPaid = !!l.paidAt;
      const amt = new Decimal(l.amount);
      byBucket[bucket].totalAmount = byBucket[bucket].totalAmount.plus(amt);
      if (isPaid) byBucket[bucket].paidAmount = byBucket[bucket].paidAmount.plus(amt);
      else byBucket[bucket].pendingAmount = byBucket[bucket].pendingAmount.plus(amt);

      const jurisdiction = l.state ?? (bucket === 'FEDERAL' || bucket === 'FICA' ? 'Federal' : bucket);

      byBucket[bucket].liabilities.push({
        id: l.id,
        companyId: l.companyId,
        payrollRunId: l.payrollRunId,
        jurisdiction,
        taxCode: l.taxCode,
        description: TAX_CODE_DESCRIPTIONS[l.taxCode] ?? l.taxCode,
        bucket,
        amount: Number(l.amount),
        dueDate: l.dueDate?.toISOString(),
        isPaid,
        paidAt: l.paidAt?.toISOString(),
        period: l.period,
        createdAt: l.createdAt.toISOString(),
      });
    }

    return Object.values(byBucket).map((g) => ({
      bucket: g.bucket,
      totalAmount: g.totalAmount.toDecimalPlaces(2).toNumber(),
      paidAmount: g.paidAmount.toDecimalPlaces(2).toNumber(),
      pendingAmount: g.pendingAmount.toDecimalPlaces(2).toNumber(),
      liabilities: g.liabilities,
    }));
  }

  // ─── Company Summary Report ───────────────────────────────────────────────

  async getCompanySummary(companyId: string, year: number) {
    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year}-12-31T23:59:59`);

    const runs = await this.prisma.payrollRun.findMany({
      where: {
        companyId,
        payDate: { gte: yearStart, lte: yearEnd },
        status: { in: ['APPROVED', 'PROCESSING', 'COMPLETED'] },
      },
      orderBy: { payDate: 'asc' },
    });

    const totalGross = runs.reduce((sum, r) => sum + Number(r.totalGross), 0);
    const totalNet = runs.reduce((sum, r) => sum + Number(r.totalNet), 0);
    const totalTax = runs.reduce((sum, r) => sum + Number(r.totalTax), 0);
    const totalDeductions = runs.reduce((sum, r) => sum + Number(r.totalDeductions), 0);

    const activeEmployees = await this.prisma.employee.count({
      where: { companyId, isActive: true },
    });

    return {
      companyId,
      year,
      payrollRuns: runs.length,
      activeEmployees,
      totalGross: new Decimal(totalGross).toDecimalPlaces(2).toNumber(),
      totalNet: new Decimal(totalNet).toDecimalPlaces(2).toNumber(),
      totalTax: new Decimal(totalTax).toDecimalPlaces(2).toNumber(),
      totalDeductions: new Decimal(totalDeductions).toDecimalPlaces(2).toNumber(),
      runSummaries: runs.map((r) => ({
        id: r.id,
        payDate: r.payDate,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        totalGross: Number(r.totalGross),
        totalNet: Number(r.totalNet),
        totalTax: Number(r.totalTax),
      })),
    };
  }

  // ─── Tax Filing ────────────────────────────────────────────────────────────

  async getTaxFilings(companyId: string, year: number, quarter?: number) {
    const startMonth = quarter ? (quarter - 1) * 3 + 1 : 1;
    const endMonth = quarter ? quarter * 3 : 12;
    const startDate = new Date(`${year}-${String(startMonth).padStart(2, '0')}-01`);
    const endDate = new Date(`${year}-${String(endMonth).padStart(2, '0')}-${endMonth === 2 ? 28 : endMonth <= 7 ? (endMonth % 2 === 0 ? 30 : 31) : endMonth % 2 === 0 ? 31 : 30}`);

    const liabilities = await this.prisma.taxLiability.findMany({
      where: {
        companyId,
        taxYear: year,
        ...(quarter && {
          dueDate: { gte: startDate, lte: endDate },
        }),
      },
      orderBy: [{ dueDate: 'asc' }, { liabilityBucket: 'asc' }],
    });

    return liabilities.map((l) => ({
      id: l.id,
      companyId: l.companyId,
      payrollRunId: l.payrollRunId,
      taxCode: l.taxCode,
      taxYear: l.taxYear,
      period: l.period,
      state: l.state,
      locality: l.locality,
      amount: Number(l.amount),
      liabilityBucket: l.liabilityBucket,
      dueDate: l.dueDate,
      paidAt: l.paidAt,
      filingStatus: l.filingStatus,
      createdAt: l.createdAt,
    }));
  }

  async markLiabilityAsPaid(liabilityId: string, companyId: string) {
    const liability = await this.prisma.taxLiability.findFirst({
      where: { id: liabilityId, companyId },
    });
    if (!liability) throw new NotFoundException(`Tax liability ${liabilityId} not found`);

    return this.prisma.taxLiability.update({
      where: { id: liabilityId },
      data: {
        filingStatus: 'SUBMITTED',
        paidAt: new Date(),
      },
    });
  }
}
