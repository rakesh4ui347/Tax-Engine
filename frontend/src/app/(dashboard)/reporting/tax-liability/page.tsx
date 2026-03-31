'use client';

import { useState } from 'react';
import { useTaxLiabilitySummary } from '@/hooks/useReporting';
import { useCompanies } from '@/hooks/useCompanies';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ReportFiltersBar } from '@/components/reporting/ReportFilters';
import { DataTable, Column } from '@/components/reporting/DataTable';
import { ReportFilters, TaxLiabilitySummary, TaxLiability, TaxBucket } from '@/types/api';
import { formatCurrency, formatDate, downloadCsv } from '@/lib/utils';
import { Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

const bucketColors: Record<TaxBucket, 'primary' | 'warning' | 'success' | 'purple' | 'danger'> = {
  [TaxBucket.FEDERAL]: 'primary',
  [TaxBucket.FICA]: 'warning',
  [TaxBucket.FUTA]: 'danger',
  [TaxBucket.STATE]: 'success',
  [TaxBucket.SUI]: 'purple',
  [TaxBucket.LOCAL]: 'purple',
};

const liabilityColumns: Column<TaxLiability>[] = [
  { key: 'jurisdiction', header: 'Jurisdiction' },
  { key: 'taxCode', header: 'Tax Code' },
  { key: 'description', header: 'Description' },
  {
    key: 'bucket',
    header: 'Bucket',
    render: (r) => (
      <Badge variant={bucketColors[r.bucket]}>{r.bucket}</Badge>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    render: (r) => <span className="font-mono font-semibold">{formatCurrency(r.amount)}</span>,
  },
  {
    key: 'dueDate',
    header: 'Due Date',
    render: (r) => formatDate(r.dueDate),
  },
  {
    key: 'isPaid',
    header: 'Status',
    render: (r) => (
      <Badge variant={r.isPaid ? 'success' : 'warning'} dot>
        {r.isPaid ? 'Paid' : 'Pending'}
      </Badge>
    ),
  },
];

export default function TaxLiabilityPage() {
  const { data: companies } = useCompanies();
  const defaultCompanyId = companies?.[0]?.id;
  const [filters, setFilters] = useState<ReportFilters>({
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
  });

  const activeFilters = { ...filters, companyId: filters.companyId ?? defaultCompanyId };
  const { data: summaries, isLoading } = useTaxLiabilitySummary(activeFilters);
  const companyOptions = (companies ?? []).map((c) => ({ value: c.id, label: c.name }));

  const allLiabilities = summaries?.flatMap((s) => s.liabilities) ?? [];

  const bucketTotals = summaries?.reduce<Record<string, number>>((acc, s) => {
    acc[s.bucket] = (acc[s.bucket] ?? 0) + s.totalAmount;
    return acc;
  }, {}) ?? {};

  const grandTotal = Object.values(bucketTotals).reduce((a, b) => a + b, 0);

  const handleExport = () => {
    const headers = ['Jurisdiction', 'Tax Code', 'Description', 'Bucket', 'Amount', 'Due Date', 'Status'];
    const rows = allLiabilities.map((l) => [
      l.jurisdiction, l.taxCode, l.description, l.bucket,
      l.amount.toFixed(2), formatDate(l.dueDate), l.isPaid ? 'Paid' : 'Pending',
    ]);
    downloadCsv(`tax-liability-${format(new Date(), 'yyyy-MM-dd')}.csv`, [headers, ...rows]);
  };

  return (
    <div>
      <PageHeader
        title="Tax Liability Summary"
        description="Federal, state, and local tax liabilities with due dates"
        breadcrumbs={[
          { label: 'Reports', href: '/reporting' },
          { label: 'Tax Liability' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/reporting">
              <Button variant="secondary" size="sm" icon={ArrowLeft}>Back</Button>
            </Link>
            <Button size="sm" icon={Download} onClick={handleExport} disabled={!allLiabilities.length}>
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="px-6 py-6 space-y-5">
        {/* Filters */}
        <Card padding="md">
          <ReportFiltersBar
            filters={activeFilters}
            onChange={setFilters}
            onReset={() => setFilters({ year: new Date().getFullYear(), quarter: Math.ceil((new Date().getMonth() + 1) / 3) })}
            showCompany
            companies={companyOptions}
            showYear
            showQuarter
          />
        </Card>

        {/* Bucket Summary Cards */}
        {summaries && summaries.length > 0 && (
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            {Object.entries(bucketTotals).map(([bucket, amount]) => (
              <Card key={bucket} padding="md">
                <p className="text-xs text-slate-400 mb-1">{bucket}</p>
                <p className="text-base font-bold text-slate-900">{formatCurrency(amount)}</p>
                <div className="mt-2">
                  <Badge variant={bucketColors[bucket as TaxBucket]}>{bucket}</Badge>
                </div>
              </Card>
            ))}
            <Card padding="md" className="bg-slate-800 border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Grand Total</p>
              <p className="text-base font-bold text-white">{formatCurrency(grandTotal)}</p>
            </Card>
          </div>
        )}

        {/* Liabilities Table */}
        <DataTable
          columns={liabilityColumns}
          data={allLiabilities}
          loading={isLoading}
          keyExtractor={(r) => r.id}
          emptyMessage="No tax liabilities found for the selected period. Run payroll first."
        />
      </div>
    </div>
  );
}
