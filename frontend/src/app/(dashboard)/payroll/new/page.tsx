'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCreatePayrollRun } from '@/hooks/usePayroll';
import { useCompanies } from '@/hooks/useCompanies';
import { PayFrequency } from '@/types/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { CalendarDays, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

const PAY_FREQUENCIES = ['WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY'] as const;

const schema = z.object({
  companyId: z.string().min(1, 'Company is required'),
  periodStart: z.string().min(1, 'Period start is required'),
  periodEnd: z.string().min(1, 'Period end is required'),
  payDate: z.string().min(1, 'Pay date is required'),
  payFrequency: z.enum(PAY_FREQUENCIES, { required_error: 'Pay frequency is required' }),
});

type FormData = z.infer<typeof schema>;

export default function NewPayrollRunPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCompanyId = searchParams.get('companyId') ?? '';
  const { mutateAsync: createRun, isPending } = useCreatePayrollRun();
  const { data: companies, isLoading: companiesLoading } = useCompanies();
  const { success, error } = useToast();

  const today = format(new Date(), 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyId: preselectedCompanyId,
      periodStart: today,
      periodEnd: today,
      payDate: today,
      payFrequency: 'BIWEEKLY',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const run = await createRun({ ...data, payFrequency: data.payFrequency as PayFrequency });
      success('Payroll run created', 'Your payroll run is ready for review.');
      router.push(`/payroll/${run.id}?companyId=${data.companyId}`);
    } catch {
      error('Failed to create run', 'Please check the details and try again.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Create Payroll Run"
        description="Start a new payroll processing run for your employees"
        breadcrumbs={[{ label: 'Payroll Runs', href: '/payroll' }, { label: 'New Run' }]}
        actions={
          <Link href="/payroll">
            <Button variant="secondary" icon={ArrowLeft}>Back</Button>
          </Link>
        }
      />

      <div className="px-6 py-6 max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label-base">Company</label>
              <select {...register('companyId')} className="input-base" disabled={companiesLoading}>
                <option value="">Select a company…</option>
                {companies?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.companyId && (
                <p className="mt-1.5 text-xs text-danger-500">{errors.companyId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-base flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  Period Start
                </label>
                <input
                  type="date"
                  {...register('periodStart')}
                  className="input-base"
                />
                {errors.periodStart && (
                  <p className="mt-1.5 text-xs text-danger-500">{errors.periodStart.message}</p>
                )}
              </div>

              <div>
                <label className="label-base flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  Period End
                </label>
                <input
                  type="date"
                  {...register('periodEnd')}
                  className="input-base"
                />
                {errors.periodEnd && (
                  <p className="mt-1.5 text-xs text-danger-500">{errors.periodEnd.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="label-base flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                Pay Date
              </label>
              <input
                type="date"
                {...register('payDate')}
                className="input-base"
              />
              {errors.payDate && (
                <p className="mt-1.5 text-xs text-danger-500">{errors.payDate.message}</p>
              )}
            </div>

            <div>
              <label className="label-base">Pay Frequency</label>
              <select {...register('payFrequency')} className="input-base">
                {PAY_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase().replace('_', '-')}</option>
                ))}
              </select>
              {errors.payFrequency && (
                <p className="mt-1.5 text-xs text-danger-500">{errors.payFrequency.message}</p>
              )}
            </div>

            <div className="pt-2 flex items-center gap-3">
              <Button type="submit" loading={isPending}>
                Create Payroll Run
              </Button>
              <Link href="/payroll">
                <Button variant="secondary" type="button">Cancel</Button>
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
