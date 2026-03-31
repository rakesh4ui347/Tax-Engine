'use client';

import { useState, useMemo } from 'react';
import { useCompanies } from '@/hooks/useCompanies';
import { useTaxFilings, useMarkLiabilityPaid, TaxFiling } from '@/hooks/useReporting';
import { ReportFilters } from '@/types/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { DataTable, Column } from '@/components/reporting/DataTable';
import { formatCurrency, formatDate, downloadCsv } from '@/lib/utils';
import { CheckCircle, Download, AlertTriangle, Clock, DollarSign, FileCheck2 } from 'lucide-react';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';

type StatusTab = 'all' | 'pending' | 'overdue' | 'paid';

const bucketColor: Record<string, 'primary' | 'warning' | 'danger' | 'success' | 'purple'> = {
  FEDERAL: 'primary',
  FICA: 'warning',
  FUTA: 'danger',
  STATE: 'success',
  SUI: 'purple',
  LOCAL: 'purple',
};

function filingStatus(f: TaxFiling): 'paid' | 'overdue' | 'due-soon' | 'pending' {
  if (f.paidAt || f.filingStatus === 'SUBMITTED' || f.filingStatus === 'ACCEPTED') return 'paid';
  if (!f.dueDate) return 'pending';
  const due = new Date(f.dueDate);
  if (isPast(due)) return 'overdue';
  if (isWithinInterval(due, { start: new Date(), end: addDays(new Date(), 14) })) return 'due-soon';
  return 'pending';
}

export default function TaxFilingPage() {
  const { data: companies } = useCompanies();
  const defaultCompanyId = companies?.[0]?.id;
  const companyOptions = (companies ?? []).map((c) => ({ value: c.id, label: c.name }));

  const [filters, setFilters] = useState<ReportFilters>({
    year: new Date().getFullYear(),
  });
  const [activeTab, setActiveTab] = useState<StatusTab>('all');

  const activeFilters = { ...filters, companyId: filters.companyId ?? defaultCompanyId };
  const { data: filings = [], isLoading } = useTaxFilings(activeFilters);
  const { mutateAsync: markPaid, isPending: isMarking } = useMarkLiabilityPaid(activeFilters);

  const yearOptions = [2024, 2025, 2026].map((y) => ({ value: String(y), label: String(y) }));
  const quarterOptions = [
    { value: '', label: 'All Quarters' },
    { value: '1', label: 'Q1 (Jan–Mar)' },
    { value: '2', label: 'Q2 (Apr–Jun)' },
    { value: '3', label: 'Q3 (Jul–Sep)' },
    { value: '4', label: 'Q4 (Oct–Dec)' },
  ];

  const annotated = useMemo(
    () => filings.map((f) => ({ ...f, _status: filingStatus(f) })),
    [filings],
  );

  const filtered = useMemo(() => {
    if (activeTab === 'all') return annotated;
    if (activeTab === 'paid') return annotated.filter((f) => f._status === 'paid');
    if (activeTab === 'overdue') return annotated.filter((f) => f._status === 'overdue');
    return annotated.filter((f) => f._status === 'pending' || f._status === 'due-soon');
  }, [annotated, activeTab]);

  const totals = useMemo(() => {
    const total = filings.reduce((s, f) => s + f.amount, 0);
    const paid = annotated.filter((f) => f._status === 'paid').reduce((s, f) => s + f.amount, 0);
    const overdue = annotated.filter((f) => f._status === 'overdue').reduce((s, f) => s + f.amount, 0);
    const pending = annotated.filter((f) => f._status !== 'paid').reduce((s, f) => s + f.amount, 0);
    return { total, paid, overdue, pending };
  }, [filings, annotated]);

  const tabs: { key: StatusTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: annotated.length },
    { key: 'pending', label: 'Pending', count: annotated.filter((f) => f._status === 'pending' || f._status === 'due-soon').length },
    { key: 'overdue', label: 'Overdue', count: annotated.filter((f) => f._status === 'overdue').length },
    { key: 'paid', label: 'Paid', count: annotated.filter((f) => f._status === 'paid').length },
  ];

  const columns: Column<typeof filtered[0]>[] = [
    {
      key: 'taxCode',
      header: 'Tax Code',
      render: (r) => <span className="font-mono text-xs font-semibold text-slate-700">{r.taxCode}</span>,
    },
    {
      key: 'liabilityBucket',
      header: 'Bucket',
      render: (r) => (
        <Badge variant={bucketColor[r.liabilityBucket] ?? 'default'}>{r.liabilityBucket}</Badge>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (r) => <span className="text-sm text-slate-600">{r.period}</span>,
    },
    {
      key: 'state',
      header: 'State / Locality',
      render: (r) => (
        <span className="text-sm text-slate-600">
          {r.state ?? 'Federal'}{r.locality ? ` / ${r.locality}` : ''}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (r) => <span className="font-mono font-bold text-slate-900">{formatCurrency(r.amount)}</span>,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (r) => {
        if (!r.dueDate) return <span className="text-slate-400 text-xs">—</span>;
        const isOvr = r._status === 'overdue';
        const isSoon = r._status === 'due-soon';
        return (
          <span className={`text-sm font-medium ${isOvr ? 'text-danger-600' : isSoon ? 'text-warning-600' : 'text-slate-600'}`}>
            {isOvr && <AlertTriangle className="inline w-3 h-3 mr-1" />}
            {formatDate(r.dueDate)}
          </span>
        );
      },
    },
    {
      key: 'filingStatus',
      header: 'Status',
      render: (r) => {
        const st = r._status;
        if (st === 'paid') return <Badge variant="success" dot>Paid</Badge>;
        if (st === 'overdue') return <Badge variant="danger" dot>Overdue</Badge>;
        if (st === 'due-soon') return <Badge variant="warning" dot>Due Soon</Badge>;
        return <Badge variant="default" dot>Pending</Badge>;
      },
    },
    {
      key: 'id',
      header: '',
      render: (r) => {
        if (r._status === 'paid') {
          return (
            <span className="flex items-center gap-1 text-xs text-success-600">
              <CheckCircle className="w-3.5 h-3.5" />
              {r.paidAt ? format(new Date(r.paidAt), 'MMM d') : 'Paid'}
            </span>
          );
        }
        return (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => markPaid(r.id)}
            loading={isMarking}
          >
            Mark Paid
          </Button>
        );
      },
    },
  ];

  const handleExport = () => {
    const headers = ['Tax Code', 'Bucket', 'Period', 'State', 'Amount', 'Due Date', 'Status', 'Paid At'];
    const rows = filtered.map((f) => [
      f.taxCode, f.liabilityBucket, f.period,
      f.state ?? 'Federal', f.amount.toFixed(2),
      f.dueDate ? formatDate(f.dueDate) : '',
      f._status, f.paidAt ? formatDate(f.paidAt) : '',
    ]);
    downloadCsv(`tax-filings-${activeFilters.year}.csv`, [headers, ...rows]);
  };

  return (
    <div>
      <PageHeader
        title="Tax Filing"
        description="Track, manage, and record tax payments by jurisdiction and period"
        breadcrumbs={[{ label: 'Tax Filing' }]}
        actions={
          <Button size="sm" icon={Download} onClick={handleExport} disabled={!filtered.length}>
            Export CSV
          </Button>
        }
      />

      <div className="px-6 py-6 space-y-5">
        {/* Filters */}
        <Card padding="md">
          <div className="flex flex-wrap items-end gap-4">
            {companyOptions.length > 1 && (
              <div className="w-52">
                <Select
                  label="Company"
                  options={companyOptions}
                  value={activeFilters.companyId ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, companyId: e.target.value || undefined }))}
                />
              </div>
            )}
            <div className="w-32">
              <Select
                label="Year"
                options={yearOptions}
                value={String(filters.year ?? new Date().getFullYear())}
                onChange={(e) => setFilters((f) => ({ ...f, year: Number(e.target.value) }))}
              />
            </div>
            <div className="w-44">
              <Select
                label="Quarter"
                options={quarterOptions}
                value={filters.quarter ? String(filters.quarter) : ''}
                onChange={(e) => setFilters((f) => ({ ...f, quarter: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Card padding="md">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <DollarSign className="w-4.5 h-4.5 text-slate-500" />
              </div>
              <span className="text-xs text-slate-400 font-medium">Total Obligations</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(totals.total)}</p>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-success-50 flex items-center justify-center">
                <CheckCircle className="w-4.5 h-4.5 text-success-600" />
              </div>
              <span className="text-xs text-slate-400 font-medium">Paid</span>
            </div>
            <p className="text-xl font-bold text-success-700">{formatCurrency(totals.paid)}</p>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-warning-50 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-warning-600" />
              </div>
              <span className="text-xs text-slate-400 font-medium">Pending</span>
            </div>
            <p className="text-xl font-bold text-warning-700">{formatCurrency(totals.pending)}</p>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-danger-50 flex items-center justify-center">
                <AlertTriangle className="w-4.5 h-4.5 text-danger-600" />
              </div>
              <span className="text-xs text-slate-400 font-medium">Overdue</span>
            </div>
            <p className="text-xl font-bold text-danger-700">{formatCurrency(totals.overdue)}</p>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                activeTab === t.key
                  ? 'border-primary-500 text-primary-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === t.key ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          keyExtractor={(r) => r.id}
          emptyMessage={
            activeTab === 'all'
              ? 'No tax filings found. Run payroll to generate tax liabilities.'
              : `No ${activeTab} filings for the selected period.`
          }
        />
      </div>
    </div>
  );
}
