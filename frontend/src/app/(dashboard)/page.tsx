'use client';

import { useDashboardKpi, usePayrollChartData, usePayrollRuns } from '@/hooks/usePayroll';
import { useCompanies } from '@/hooks/useCompanies';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { PayrollChart } from '@/components/dashboard/PayrollChart';
import { TaxLiabilityChart } from '@/components/dashboard/TaxLiabilityChart';
import { RecentRuns } from '@/components/dashboard/RecentRuns';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  Users,
  Receipt,
  Clock,
  Plus,
  RefreshCw,
} from 'lucide-react';

const TAX_COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#8b5cf6', '#ef4444'];

export default function DashboardPage() {
  const { data: companies } = useCompanies();
  const companyId = companies?.[0]?.id;
  const { data: kpi, isLoading: kpiLoading, refetch: refetchKpi } = useDashboardKpi();
  const { data: chartData, isLoading: chartLoading } = usePayrollChartData();
  const { data: runs, isLoading: runsLoading } = usePayrollRuns(companyId);

  // Derive tax breakdown from recent run data or placeholder
  const taxBreakdown = [
    { name: 'Fed. Income Tax', value: kpi?.totalTaxesWithheld ? kpi.totalTaxesWithheld * 0.42 : 0, color: TAX_COLORS[0] },
    { name: 'Social Security', value: kpi?.totalTaxesWithheld ? kpi.totalTaxesWithheld * 0.29 : 0, color: TAX_COLORS[1] },
    { name: 'Medicare', value: kpi?.totalTaxesWithheld ? kpi.totalTaxesWithheld * 0.07 : 0, color: TAX_COLORS[2] },
    { name: 'State Tax', value: kpi?.totalTaxesWithheld ? kpi.totalTaxesWithheld * 0.19 : 0, color: TAX_COLORS[3] },
    { name: 'Other', value: kpi?.totalTaxesWithheld ? kpi.totalTaxesWithheld * 0.03 : 0, color: TAX_COLORS[4] },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="px-6 py-6 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Overview of your payroll operations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => refetchKpi()}
            >
              Refresh
            </Button>
            <Button size="sm" icon={Plus} onClick={() => window.location.href = '/payroll/new'}>
              New Payroll Run
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="Payroll This Month"
            value={kpi ? formatCurrency(kpi.totalPayrollThisMonth) : '$—'}
            change={kpi?.payrollChange}
            changeLabel="vs last month"
            icon={DollarSign}
            iconColor="text-primary-600"
            iconBg="bg-primary-50"
            loading={kpiLoading}
          />
          <KpiCard
            title="Total Employees"
            value={kpi ? kpi.totalEmployees.toLocaleString() : '—'}
            change={kpi?.employeeChange}
            changeLabel="vs last month"
            icon={Users}
            iconColor="text-success-600"
            iconBg="bg-success-50"
            loading={kpiLoading}
          />
          <KpiCard
            title="Taxes Withheld"
            value={kpi ? formatCurrency(kpi.totalTaxesWithheld) : '$—'}
            change={kpi?.taxChange}
            changeLabel="vs last month"
            icon={Receipt}
            iconColor="text-warning-600"
            iconBg="bg-warning-50"
            loading={kpiLoading}
          />
          <KpiCard
            title="Pending Approvals"
            value={kpi ? kpi.pendingApprovals.toString() : '—'}
            icon={Clock}
            iconColor="text-danger-600"
            iconBg="bg-danger-50"
            loading={kpiLoading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2" padding="md">
            <CardHeader
              title="Payroll History"
              description="Gross pay, net pay, and taxes for the last 6 runs"
            />
            <PayrollChart data={chartData ?? []} loading={chartLoading} />
          </Card>

          <Card padding="md">
            <CardHeader
              title="Tax Breakdown"
              description="Distribution of withheld taxes this month"
            />
            <TaxLiabilityChart data={taxBreakdown} loading={kpiLoading} />
          </Card>
        </div>

        {/* Recent Runs */}
        <Card padding="none">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Recent Payroll Runs</h3>
              <p className="text-sm text-slate-500 mt-0.5">The 5 most recent payroll runs</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/payroll'}
            >
              View all
            </Button>
          </div>
          <RecentRuns runs={runs ?? []} loading={runsLoading} />
        </Card>
      </div>
    </div>
  );
}
