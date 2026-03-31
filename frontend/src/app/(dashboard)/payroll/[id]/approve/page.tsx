'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePayrollRun, useApprovePayrollRun } from '@/hooks/usePayroll';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RunStatusBadge } from '@/components/payroll/RunStatusBadge';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDateRange } from '@/lib/utils';
import { CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const schema = z.object({
  notes: z.string().optional(),
  confirmed: z.boolean().refine((v) => v, 'You must confirm the approval'),
});

type FormData = z.infer<typeof schema>;

export default function ApprovePayrollPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId') ?? undefined;
  const { data: run, isLoading } = usePayrollRun(id, companyId);
  const { mutateAsync: approve, isPending } = useApprovePayrollRun(id, companyId);
  const { success, error } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { confirmed: false },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await approve({ notes: data.notes });
      success('Payroll run approved', 'The run is now processing payments.');
      router.push(`/payroll/${id}?companyId=${companyId}`);
    } catch {
      error('Approval failed', 'Please try again or contact support.');
    }
  };

  if (isLoading || !run) return null;

  return (
    <div>
      <PageHeader
        title="Approve Payroll Run"
        description="Review and approve this payroll run for processing"
        breadcrumbs={[
          { label: 'Payroll Runs', href: '/payroll' },
          { label: `Run ${id.slice(0, 8)}...`, href: `/payroll/${id}` },
          { label: 'Approve' },
        ]}
        actions={
          <Link href={`/payroll/${id}?companyId=${companyId}`}>
            <Button variant="secondary" icon={ArrowLeft}>Back</Button>
          </Link>
        }
      />

      <div className="px-6 py-6 max-w-2xl space-y-5">
        {/* Summary */}
        <Card padding="md">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Run Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Period</span>
              <span className="font-medium text-slate-900">
                {formatDateRange(run.periodStart, run.periodEnd)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Employees</span>
              <span className="font-medium text-slate-900">{run._count?.payStubs ?? run.payStubs?.length ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Gross Pay</span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(run.totalGross)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Taxes</span>
              <span className="font-mono font-medium text-warning-600">{formatCurrency(run.totalTax)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-100 pt-3 mt-1">
              <span className="text-slate-700 font-semibold">Net Pay (Total)</span>
              <span className="font-mono font-bold text-success-700 text-base">
                {formatCurrency(run.totalNet)}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <RunStatusBadge status={run.status} />
          </div>
        </Card>

        {/* Warning */}
        <div className="flex gap-3 p-4 bg-warning-50 border border-warning-200 rounded-xl text-sm text-warning-800">
          <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">This action cannot be undone</p>
            <p className="text-warning-700">
              Once approved, this payroll run will begin processing and payments will be
              initiated. Verify all amounts are correct before approving.
            </p>
          </div>
        </div>

        {/* Approval Form */}
        <Card padding="md">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label-base">Approval Notes (optional)</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="input-base resize-none"
                placeholder="Add any notes about this approval..."
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('confirmed')}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">
                I confirm that I have reviewed all pay stubs, tax calculations, and deductions
                for this payroll run and authorize payment of{' '}
                <span className="font-bold text-slate-900">{formatCurrency(run.totalNet)}</span>
                {' '}to {run._count?.payStubs ?? run.payStubs?.length ?? 0} employees.
              </span>
            </label>
            {errors.confirmed && (
              <p className="text-xs text-danger-500">{errors.confirmed.message}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                loading={isPending}
                variant="success"
                icon={CheckCircle}
              >
                Approve &amp; Process
              </Button>
              <Link href={`/payroll/${id}?companyId=${companyId}`}>
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
