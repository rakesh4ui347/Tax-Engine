'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { usePayrollRun, usePayStubs, useCalculatePayrollRun } from '@/hooks/usePayroll';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RunStatusBadge } from '@/components/payroll/RunStatusBadge';
import { PayStubTable } from '@/components/payroll/PayStubTable';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatDate, formatDateRange, downloadCsv } from '@/lib/utils';
import { PayrollRunStatus } from '@/types/api';
import { CheckCircle, Download, Users, DollarSign, Receipt, ArrowLeft, Calculator } from 'lucide-react';
import Link from 'next/link';

export default function PayrollRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId') ?? undefined;
  const { canApprove } = useAuth();

  const { data: run, isLoading: runLoading } = usePayrollRun(id, companyId);
  const { data: payStubs, isLoading: stubsLoading } = usePayStubs(id, companyId);
  const { mutateAsync: calculateRun, isPending: isCalculating } = useCalculatePayrollRun(id, companyId);
  const { success, error } = useToast();

  if (runLoading) return <PageLoader />;
  if (!run) return null;

  const isDraft = run.status === PayrollRunStatus.DRAFT;
  const canApproveRun =
    canApprove && run.status === PayrollRunStatus.PENDING_APPROVAL;

  const handleCalculate = async () => {
    try {
      await calculateRun();
      success('Payroll calculated', 'Taxes and deductions have been computed. Ready for approval.');
    } catch {
      error('Calculation failed', 'Please check employee records and try again.');
    }
  };

  const handleExportCsv = () => {
    if (!payStubs) return;
    const headers = [
      'Employee', 'Gross Pay', 'Social Security', 'Medicare',
      'FIT', 'State Tax', 'Deductions', 'Net Pay',
    ];
    const rows = payStubs.map((stub) => {
      const ssTax = Number(stub.taxLines.find((t) => t.taxCode === 'SS_EMPLOYEE')?.amount ?? 0);
      const medicare = Number(stub.taxLines.find((t) => t.taxCode === 'MEDICARE_EMPLOYEE')?.amount ?? 0);
      const fit = Number(stub.taxLines.find((t) => t.taxCode === 'FIT')?.amount ?? 0);
      const stateTax = stub.taxLines
        .filter((t) => t.liabilityBucket === 'STATE' && t.isEmployee)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return [
        stub.employee ? `${stub.employee.firstName} ${stub.employee.lastName}` : stub.employeeId,
        Number(stub.grossPay).toFixed(2),
        ssTax.toFixed(2),
        medicare.toFixed(2),
        fit.toFixed(2),
        stateTax.toFixed(2),
        Number(stub.totalDeductions).toFixed(2),
        Number(stub.netPay).toFixed(2),
      ];
    });
    downloadCsv(`payroll-run-${id}.csv`, [headers, ...rows]);
  };

  return (
    <div>
      <PageHeader
        title={`Payroll Run — ${formatDateRange(run.periodStart, run.periodEnd)}`}
        description={`Pay date: ${formatDate(run.payDate)} · Created ${formatDate(run.createdAt)}`}
        breadcrumbs={[
          { label: 'Payroll Runs', href: '/payroll' },
          { label: `Run ${run.id.slice(0, 8)}...` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/payroll">
              <Button variant="secondary" size="sm" icon={ArrowLeft}>Back</Button>
            </Link>
            <Button variant="secondary" size="sm" icon={Download} onClick={handleExportCsv}>
              Export CSV
            </Button>
            {isDraft && (
              <Button size="sm" icon={Calculator} loading={isCalculating} onClick={handleCalculate}>
                Calculate Payroll
              </Button>
            )}
            {canApproveRun && (
              <Link href={`/payroll/${id}/approve?companyId=${companyId}`}>
                <Button size="sm" icon={CheckCircle}>
                  Approve Run
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="px-6 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Card padding="md" className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Gross Pay</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(run.totalGross)}</p>
            </div>
          </Card>
          <Card padding="md" className="flex items-center gap-4">
            <div className="w-10 h-10 bg-warning-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Receipt className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Taxes</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(run.totalTax)}</p>
            </div>
          </Card>
          <Card padding="md" className="flex items-center gap-4">
            <div className="w-10 h-10 bg-success-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Net Pay</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(run.totalNet)}</p>
            </div>
          </Card>
          <Card padding="md" className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Employees</p>
              <p className="text-lg font-bold text-slate-900">{run.payStubs?.length ?? run._count?.payStubs ?? 0}</p>
            </div>
          </Card>
        </div>

        {/* Status + Details */}
        <Card padding="md">
          <div className="flex items-center gap-4 mb-4">
            <RunStatusBadge status={run.status} />
            {run.notes && (
              <p className="text-sm text-slate-500 italic">"{run.notes}"</p>
            )}
          </div>
          {run.approvals && run.approvals.length > 0 && (
            <p className="text-sm text-slate-500">
              Approved by{' '}
              <span className="font-medium text-slate-700">
                {run.approvals[0].approver
                  ? `${run.approvals[0].approver.firstName} ${run.approvals[0].approver.lastName}`
                  : run.approvals[0].approverId}
              </span>
              {` on ${formatDate(run.approvals[0].approvedAt)}`}
            </p>
          )}
        </Card>

        {/* Pay Stubs Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Employee Pay Stubs
            </h2>
            <p className="text-sm text-slate-500">
              {payStubs?.length ?? 0} employees · click a row to expand tax details
            </p>
          </div>
          <PayStubTable payStubs={payStubs ?? []} loading={stubsLoading} />
        </div>
      </div>
    </div>
  );
}
