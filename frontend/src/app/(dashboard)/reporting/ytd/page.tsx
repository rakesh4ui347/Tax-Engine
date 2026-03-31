'use client';

import { useState } from 'react';
import { useYtdSummary } from '@/hooks/useReporting';
import { useCompanies } from '@/hooks/useCompanies';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReportFiltersBar } from '@/components/reporting/ReportFilters';
import { DataTable, Column } from '@/components/reporting/DataTable';
import { ReportFilters, YtdSummaryRow } from '@/types/api';
import { formatCurrency, downloadCsv } from '@/lib/utils';
import { Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

const columns: Column<YtdSummaryRow>[] = [
  { key: 'employeeName', header: 'Employee' },
  {
    key: 'ytdGross',
    header: 'YTD Gross',
    align: 'right',
    render: (r) => <span className="font-mono font-semibold">{formatCurrency(r.ytdGross)}</span>,
  },
  {
    key: 'ytdFit',
    header: 'Fed. Income Tax',
    align: 'right',
    render: (r) => <span className="font-mono text-slate-500">{formatCurrency(r.ytdFit)}</span>,
  },
  {
    key: 'ytdSocialSecurity',
    header: 'Soc. Security',
    align: 'right',
    render: (r) => <span className="font-mono text-slate-500">{formatCurrency(r.ytdSocialSecurity)}</span>,
  },
  {
    key: 'ytdMedicare',
    header: 'Medicare',
    align: 'right',
    render: (r) => <span className="font-mono text-slate-500">{formatCurrency(r.ytdMedicare)}</span>,
  },
  {
    key: 'ytdStateTax',
    header: 'State Tax',
    align: 'right',
    render: (r) => <span className="font-mono text-slate-500">{formatCurrency(r.ytdStateTax)}</span>,
  },
  {
    key: 'ytdDeductions',
    header: 'Deductions',
    align: 'right',
    render: (r) => <span className="font-mono text-warning-600">{formatCurrency(r.ytdDeductions)}</span>,
  },
  {
    key: 'ytdNet',
    header: 'YTD Net',
    align: 'right',
    render: (r) => <span className="font-mono font-bold text-success-700">{formatCurrency(r.ytdNet)}</span>,
  },
];

export default function YtdPage() {
  const { data: companies } = useCompanies();
  const defaultCompanyId = companies?.[0]?.id;
  const [filters, setFilters] = useState<ReportFilters>({ year: new Date().getFullYear() });

  const activeFilters = { ...filters, companyId: filters.companyId ?? defaultCompanyId };
  const { data: rows, isLoading } = useYtdSummary(activeFilters);
  const companyOptions = (companies ?? []).map((c) => ({ value: c.id, label: c.name }));

  const totals = rows?.reduce(
    (acc, r) => ({
      gross: acc.gross + r.ytdGross,
      fit: acc.fit + r.ytdFit,
      ss: acc.ss + r.ytdSocialSecurity,
      medicare: acc.medicare + r.ytdMedicare,
      state: acc.state + r.ytdStateTax,
      deductions: acc.deductions + r.ytdDeductions,
      net: acc.net + r.ytdNet,
    }),
    { gross: 0, fit: 0, ss: 0, medicare: 0, state: 0, deductions: 0, net: 0 },
  );

  const handleExport = () => {
    if (!rows) return;
    const headers = ['Employee', 'YTD Gross', 'FIT', 'Social Security', 'Medicare', 'State Tax', 'Deductions', 'YTD Net'];
    const csvRows = rows.map((r) => [
      r.employeeName, r.ytdGross.toFixed(2), r.ytdFit.toFixed(2),
      r.ytdSocialSecurity.toFixed(2), r.ytdMedicare.toFixed(2),
      r.ytdStateTax.toFixed(2), r.ytdDeductions.toFixed(2), r.ytdNet.toFixed(2),
    ]);
    downloadCsv(`ytd-summary-${filters.year}-${format(new Date(), 'yyyyMMdd')}.csv`, [headers, ...csvRows]);
  };

  return (
    <div>
      <PageHeader
        title="Year-to-Date Summary"
        description="Per-employee YTD earnings and withholdings for W-2 preparation"
        breadcrumbs={[
          { label: 'Reports', href: '/reporting' },
          { label: 'YTD Summary' },
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
            showYear
          />
        </Card>

        <DataTable
          columns={columns}
          data={rows ?? []}
          loading={isLoading}
          keyExtractor={(r) => r.employeeId}
          emptyMessage="No YTD data available for the selected year"
          footer={
            totals && rows && rows.length > 0 ? (
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Company Totals — {rows.length} employees</span>
                <div className="flex gap-4">
                  <span>Gross: {formatCurrency(totals.gross)}</span>
                  <span>All Taxes: {formatCurrency(totals.fit + totals.ss + totals.medicare + totals.state)}</span>
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
