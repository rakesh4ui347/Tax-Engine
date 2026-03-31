'use client';

import { useState } from 'react';
import { useEmployees } from '@/hooks/useEmployees';
import { useCompanies } from '@/hooks/useCompanies';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Users, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { EmployeeType } from '@/types/api';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: EmployeeType.FTE, label: 'Salaried (FTE)' },
  { value: EmployeeType.HOURLY, label: 'Hourly' },
  { value: EmployeeType.CONTRACTOR, label: 'Contractor' },
];

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const { data: companies } = useCompanies();
  const companyId = selectedCompanyId || companies?.[0]?.id;
  const { data: employees, isLoading } = useEmployees(companyId);

  const companyOptions = (companies ?? []).map((c) => ({ value: c.id, label: c.name }));

  const filtered = (employees ?? []).filter((emp) => {
    const matchesType = !typeFilter || emp.employeeType === typeFilter;
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      emp.firstName.toLowerCase().includes(query) ||
      emp.lastName.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.employeeNumber?.toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        description={`Manage your workforce — ${employees?.length ?? 0} employees total`}
        actions={
          <Link href={`/employees/new${companyId ? `?companyId=${companyId}` : ''}`}>
            <Button icon={Plus}>Add Employee</Button>
          </Link>
        }
      />

      <div className="px-6 py-6">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Search by name, email, or employee number..."
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
          <div className="w-40">
            <Select
              options={typeOptions}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            />
          </div>
          <span className="text-sm text-slate-400 ml-auto">
            {filtered.length} of {employees?.length ?? 0}
          </span>
        </div>

        {isLoading ? (
          <EmployeeTable employees={[]} loading />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees found"
            description={
              search || typeFilter
                ? 'Try adjusting your search or filters'
                : 'Add your first employee to get started'
            }
            action={
              !search && !typeFilter ? (
                <Link href="/employees/new">
                  <Button icon={Plus}>Add Employee</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <EmployeeTable employees={filtered} />
        )}
      </div>
    </div>
  );
}
