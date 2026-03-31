'use client';

import { useState } from 'react';
import { usePayrollRegister } from '@/hooks/useReporting';
import { useCompanies } from '@/hooks/useCompanies';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReportFiltersBar } from '@/components/reporting/ReportFilters';
import { DataTable, Column } from '@/components/reporting/DataTable';
import { ReportFilters, PayrollRegisterRow } from '@/types/api';
import { formatCurrency, downloadCsv } from '@/lib/utils';
import { Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

const columns: Column<PayrollRegisterRow>[] = [
  { key: 'employeeName', header: 'Employee' },
  { key: 'period', header: 'Period' },
  { key: 'regularHours', header: 'Reg. Hrs', align: 'right' },
  { key: 'overtimeHours', header: 'OT Hrs', align: 'right' },
  {
    key: 'grossPay',
    header: 'Gross Pay',
    align: 'right',
    render: (r) => <span className="font-mono">{formatCurrency(r.grossPay)}</span>,
  },
  {
    key: 'federalIncomeTax',
    header: 'FIT',
    align: 'right',
    render: (r) => <span className="font-mono text-slate-500">{formatCurrency(r.federalIncomeTax)}</span>,
  },
  {
    key: 'socialSecurity',
    header: 'SS Tax',
    align: 'right',
    render: (r) => <span className="font-mono text-slate-500">{formatCurrency(r.socialSecurity)}</span>,
  },
  {
    key: 'medicare',
    header: 'Medicare',
    align: 'right',
    render: (r) => <span className="font-mono text-slate-500">{formatCurrency(r.medicare)}</span>,
  },
  {
    key: 'stateTax',
    header: 'State Tax',
    align: 'right',
    render: (r) => <span className="font-mono text-slate-500">{formatCurrency(r.stateTax)}</span>,
  },
  {
    key: 'totalDeductions',
    header: 'Deductions',
    align: 'right',
    render: (r) => <span className="font-mono text-warning-600">{formatCurrency(r.totalDeductions)}</span>,
  },
  {
    key: 'netPay',
    header: 'Net Pay',
    align: 'right',
    render: (r) => <span className="font-mono font-bold text-success-700">{formatCurrency(r.netPay)}</span>,
  },
];

export default function PayrollRegisterPage() {
  const { data: companies } = useCompanies();
  const defaultCompanyId = companies?.[0]?.id;
  const [filters, setFilters] = useState<ReportFilters>({ year: new Date().getFullYear() });

  const activeFilters = { ...filters, companyId: filters.companyId ?? defaultCompanyId };
  const { data: rows, isLoading } = usePayrollRegister(activeFilters);
  const companyOptions = (companies ?? []).map((c) => ({ value: c.id, label: c.name }));

  const totals = rows?.reduce(
    (acc, r) => ({
      gross: acc.gross + r.grossPay,
      fit: acc.fit + r.federalIncomeTax,
      ss: acc.ss + r.socialSecurity,
      medicare: acc.medicare + r.medicare,
      state: acc.state + r.stateTax,
      deductions: acc.deductions + r.totalDeductions,
      net: acc.net + r.netPay,
    }),
    { gross: 0, fit: 0, ss: 0, medicare: 0, state: 0, deductions: 0, net: 0 },
  );

  const handleExport = () => {
    if (!rows) return;
    const headers = ['Employee', 'Period', 'Regular Hrs', 'OT Hrs', 'Gross', 'FIT', 'SS', 'Medicare', 'State Tax', 'Deductions', 'Net'];
    const csvRows = rows.map((r) => [
      r.employeeName, r.period, String(r.regularHours ?? ''), String(r.overtimeHours ?? ''),
      r.grossPay.toFixed(2), r.federalIncomeTax.toFixed(2), r.socialSecurity.toFixed(2),
      r.medicare.toFixed(2), r.stateTax.toFixed(2), r.totalDeductions.toFixed(2), r.netPay.toFixed(2),
    ]);
    downloadCsv(`payroll-register-${format(new Date(), 'yyyy-MM-dd')}.csv`, [headers, ...csvRows]);
  };

  return (
    <div>
      <PageHeader
        title="Payroll Register"
        description="Detailed per-employee payroll breakdown"
        breadcrumbs={[
          { label: 'Reports', href: '/reporting' },
          { label: 'Payroll Register' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/reporting">
              <Button variant="secondary" size="sm" icon={ArrowLeft}>Back</Button>
            </Link>
            <Button size="sm" icon={Download} onClick={handleExport} disabled={!rows?.length}>
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="px-6 py-6 space-y-5">
        <Card padding="md">
          <ReportFiltersBar
            filters={activeFilters}
            onChange={setFilters}
            onReset={() => setFilters({ year: new Date().getFullYear() })}
            showCompany
            companies={companyOptions}
            showDateRange
            showYear
          />
        </Card>

        <DataTable
          columns={columns}
          data={rows ?? []}
          loading={isLoading}
          keyExtractor={(r) => `${r.employeeId}-${r.period}`}
          emptyMessage="No payroll register data for the selected period"
          footer={
            totals && rows && rows.length > 0 ? (
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Totals ({rows.length} employees)</span>
                <div className="flex gap-6">
                  <span>Gross: {formatCurrency(totals.gross)}</span>
                  <span>Taxes: {formatCurrency(totals.fit + totals.ss + totals.medicare + totals.state)}</span>
                  <span>Deductions: {formatCurrency(totals.deductions)}</span>
                  <span className="text-success-700">Net: {formatCurrency(totals.net)}</span>
                </div>
              </div>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
