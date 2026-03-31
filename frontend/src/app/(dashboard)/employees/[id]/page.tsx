'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEmployee } from '@/hooks/useEmployees';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { EmployeeType } from '@/types/api';
import {
  FileText, CreditCard, User, Building2, MapPin,
  Calendar, Edit, ArrowLeft,
} from 'lucide-react';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId') ?? undefined;
  const { data: emp, isLoading } = useEmployee(id, companyId);

  if (isLoading) return <PageLoader />;
  if (!emp) return null;

  return (
    <div>
      <PageHeader
        title={`${emp.firstName} ${emp.lastName}`}
        description={`${emp.employeeNumber} · ${emp.email}`}
        breadcrumbs={[
          { label: 'Employees', href: '/employees' },
          { label: `${emp.firstName} ${emp.lastName}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/employees">
              <Button variant="secondary" size="sm" icon={ArrowLeft}>Back</Button>
            </Link>
            <Link href={`/employees/${id}/edit?companyId=${companyId}`}>
              <Button variant="secondary" size="sm" icon={Edit}>
                Edit
              </Button>
            </Link>
          </div>
        }
      />

      <div className="px-6 py-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Profile */}
        <div className="xl:col-span-2 space-y-5">
          {/* Personal Info */}
          <Card padding="md">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Personal Information
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-slate-400 mb-0.5">Full Name</dt>
                <dd className="text-sm font-medium text-slate-900">{emp.firstName} {emp.lastName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 mb-0.5">Email</dt>
                <dd className="text-sm text-slate-700">{emp.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 mb-0.5">SSN</dt>
                <dd className="text-sm font-mono text-slate-700">{emp.ssn ?? '***-**-****'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 mb-0.5">Employee #</dt>
                <dd className="text-sm text-slate-700">{emp.employeeNumber ?? '—'}</dd>
              </div>
            </dl>
          </Card>

          {/* Employment */}
          <Card padding="md">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              Employment Details
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-slate-400 mb-0.5">Type</dt>
                <dd>
                  <Badge variant={emp.employeeType === EmployeeType.HOURLY ? 'primary' : 'purple'}>
                    {emp.employeeType}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 mb-0.5">Pay Frequency</dt>
                <dd className="text-sm text-slate-700">{emp.payFrequency}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 mb-0.5">Compensation</dt>
                <dd className="text-sm font-mono font-bold text-slate-900">
                  {emp.employeeType === EmployeeType.FTE
                    ? `${formatCurrency(emp.annualSalary ?? 0)}/yr`
                    : `${formatCurrency(emp.hourlyRate ?? 0)}/hr`}
                </dd>
              </div>
              {emp.employeeType === EmployeeType.HOURLY && (
                <>
                  <div>
                    <dt className="text-xs text-slate-400 mb-0.5">Default Hours</dt>
                    <dd className="text-sm text-slate-700">{emp.defaultHours ?? 40} hrs/wk</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400 mb-0.5">Overtime Eligible</dt>
                    <dd>
                      <Badge variant={emp.overtimeEligible ? 'success' : 'default'}>
                        {emp.overtimeEligible ? 'Yes' : 'No'}
                      </Badge>
                    </dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-xs text-slate-400 mb-0.5">Status</dt>
                <dd>
                  <Badge variant={emp.isActive ? 'success' : 'default'} dot>
                    {emp.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </dd>
              </div>
            </dl>
          </Card>

          {/* Location */}
          <Card padding="md">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              State Assignment
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-slate-400 mb-0.5">Resident State</dt>
                <dd className="text-sm font-medium text-slate-900 bg-slate-100 inline-flex px-2 py-0.5 rounded">
                  {emp.residentState}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 mb-0.5">Work State</dt>
                <dd className="text-sm font-medium text-slate-900 bg-slate-100 inline-flex px-2 py-0.5 rounded">
                  {emp.workState}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        {/* Right: Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link href={`/employees/${id}/w4?companyId=${companyId}`} className="w-full">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-50 border border-slate-100 hover:border-primary-200 transition text-left group">
                  <FileText className="w-4 h-4 text-primary-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">W-4 Profile</p>
                    <p className="text-xs text-slate-400">
                      {emp.w4Profile ? `${emp.w4Profile.filingStatus}` : 'Not configured'}
                    </p>
                  </div>
                </button>
              </Link>
              <Link href={`/employees/${id}/deductions?companyId=${companyId}`} className="w-full">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-50 border border-slate-100 hover:border-primary-200 transition text-left">
                  <CreditCard className="w-4 h-4 text-primary-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Deductions</p>
                    <p className="text-xs text-slate-400">
                      {emp.deductions?.length ?? 0} active deduction(s)
                    </p>
                  </div>
                </button>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Dates
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-slate-400">Hire Date</dt>
                <dd className="text-sm font-medium text-slate-900">{formatDate(emp.hireDate)}</dd>
              </div>
              {emp.terminationDate && (
                <div>
                  <dt className="text-xs text-slate-400">Termination Date</dt>
                  <dd className="text-sm font-medium text-danger-600">{formatDate(emp.terminationDate)}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-400">Created</dt>
                <dd className="text-sm text-slate-500">{formatDate(emp.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
