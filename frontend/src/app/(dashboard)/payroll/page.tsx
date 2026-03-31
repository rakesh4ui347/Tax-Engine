'use client';

import { useState } from 'react';
import { usePayrollRuns } from '@/hooks/usePayroll';
import { useCompanies } from '@/hooks/useCompanies';
import { PayrollRunCard } from '@/components/payroll/PayrollRunCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { PayrollRunStatus } from '@/types/api';
import { Plus, Search, CreditCard } from 'lucide-react';
import Link from 'next/link';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: PayrollRunStatus.DRAFT, label: 'Draft' },
  { value: PayrollRunStatus.PENDING_APPROVAL, label: 'Pending Approval' },
  { value: PayrollRunStatus.APPROVED, label: 'Approved' },
  { value: PayrollRunStatus.COMPLETED, label: 'Completed' },
  { value: PayrollRunStatus.FAILED, label: 'Failed' },
];

export default function PayrollPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const { data: companies } = useCompanies();
  const companyId = selectedCompanyId || companies?.[0]?.id;
  const { data: runs, isLoading } = usePayrollRuns(companyId);

  const companyOptions = [
    ...(companies ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  const filtered = (runs ?? [])?.filter((run) => {
    const matchesStatus = !statusFilter || run.status === statusFilter;
    const matchesSearch = !search ||
      run.company?.name?.toLowerCase().includes(search.toLowerCase()) ||
      run.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div>
      <PageHeader
        title="Payroll Runs"
        description="Manage and track all payroll processing runs"
        actions={
          <Link href={`/payroll/new${companyId ? `?companyId=${companyId}` : ''}`}>
            <Button icon={Plus}>New Run</Button>
          </Link>
        }
      />

      <div className="px-6 py-6">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Search by company or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={Search}
            />
          </div>
          {companies && companies.length > 1 && (
            <div className="w-56">
              <Select
                options={companyOptions}
                value={selectedCompanyId || companies[0]?.id || ''}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
              />
            </div>
          )}
          <div className="w-48">
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payroll runs found"
            description={
              search || statusFilter
                ? 'Try adjusting your filters'
                : 'Create your first payroll run to get started'
            }
            action={
              !search && !statusFilter ? (
                <Link href={`/payroll/new${companyId ? `?companyId=${companyId}` : ''}`}>
                  <Button icon={Plus}>Create Payroll Run</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((run) => (
              <PayrollRunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
