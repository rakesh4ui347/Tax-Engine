import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getKpi(user: any) {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const companyIds = await this.getAccessibleCompanyIds(user);
    if (companyIds.length === 0) {
      return { totalPayrollThisMonth: 0, totalEmployees: 0, totalTaxesWithheld: 0, pendingApprovals: 0, payrollChange: 0, employeeChange: 0, taxChange: 0 };
    }

    const [thisMonth, lastMonth, totalEmployees, lastMonthEmployees, pendingApprovals] =
      await Promise.all([
        this.prisma.payrollRun.aggregate({
          where: {
            companyId: { in: companyIds },
            payDate: { gte: thisMonthStart, lte: thisMonthEnd },
            status: { in: ['COMPLETED', 'APPROVED', 'PENDING_APPROVAL'] as any },
          },
          _sum: { totalGross: true, totalTax: true },
        }),
        this.prisma.payrollRun.aggregate({
          where: {
            companyId: { in: companyIds },
            payDate: { gte: lastMonthStart, lte: lastMonthEnd },
            status: { in: ['COMPLETED', 'APPROVED', 'PENDING_APPROVAL'] as any },
          },
          _sum: { totalGross: true, totalTax: true },
        }),
        this.prisma.employee.count({
          where: { companyId: { in: companyIds }, isActive: true },
        }),
        this.prisma.employee.count({
          where: { companyId: { in: companyIds }, isActive: true, hireDate: { lte: lastMonthEnd } },
        }),
        this.prisma.payrollRun.count({
          where: { companyId: { in: companyIds }, status: 'PENDING_APPROVAL' as any },
        }),
      ]);

    const totalPayrollThisMonth = Number(thisMonth._sum.totalGross ?? 0);
    const totalPayrollLastMonth = Number(lastMonth._sum.totalGross ?? 0);
    const totalTaxesThisMonth = Number(thisMonth._sum.totalTax ?? 0);
    const totalTaxesLastMonth = Number(lastMonth._sum.totalTax ?? 0);

    const pct = (curr: number, prev: number) =>
      prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0;

    return {
      totalPayrollThisMonth,
      totalEmployees,
      totalTaxesWithheld: totalTaxesThisMonth,
      pendingApprovals,
      payrollChange: pct(totalPayrollThisMonth, totalPayrollLastMonth),
      employeeChange: pct(totalEmployees, lastMonthEmployees),
      taxChange: pct(totalTaxesThisMonth, totalTaxesLastMonth),
    };
  }

  async getPayrollChart(user: any) {
    const companyIds = await this.getAccessibleCompanyIds(user);
    if (companyIds.length === 0) return [];

    const runs = await this.prisma.payrollRun.findMany({
      where: {
        companyId: { in: companyIds },
        status: { in: ['COMPLETED', 'APPROVED', 'PENDING_APPROVAL'] as any },
      },
      orderBy: { payDate: 'desc' },
      take: 6,
      select: { payDate: true, totalGross: true, totalNet: true, totalTax: true },
    });

    return runs.reverse().map((run) => ({
      period: run.payDate.toISOString().slice(0, 10),
      gross: Number(run.totalGross),
      net: Number(run.totalNet),
      taxes: Number(run.totalTax),
    }));
  }

  private async getAccessibleCompanyIds(user: any): Promise<string[]> {
    if (!user) return [];

    if (['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const companies = await this.prisma.company.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });
      return companies.map((c) => c.id);
    }

    const userCompanies = await this.prisma.userCompany.findMany({
      where: { userId: user.id },
      select: { companyId: true },
    });
    return userCompanies.map((uc) => uc.companyId);
  }
}
