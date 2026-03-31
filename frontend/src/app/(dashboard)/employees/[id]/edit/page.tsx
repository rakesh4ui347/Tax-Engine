'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useEmployee, useUpdateEmployee } from '@/hooks/useEmployees';
import { EmployeeType, PayFrequency } from '@/types/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { US_STATES } from '@/lib/utils';

type FormData = {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  employeeType: EmployeeType;
  annualSalary?: number;
  hourlyRate?: number;
  defaultHours?: number;
  overtimeEligible?: boolean;
  payFrequency?: PayFrequency;
  residentState: string;
  workState: string;
};

const stateOptions = US_STATES.map((s) => ({ value: s.code, label: `${s.code} — ${s.name}` }));
const payFreqOptions = [
  { value: PayFrequency.WEEKLY, label: 'Weekly' },
  { value: PayFrequency.BIWEEKLY, label: 'Bi-weekly' },
  { value: PayFrequency.SEMIMONTHLY, label: 'Semi-monthly' },
  { value: PayFrequency.MONTHLY, label: 'Monthly' },
];

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId') ?? undefined;
  const router = useRouter();
  const { success, error } = useToast();

  const { data: emp, isLoading } = useEmployee(id, companyId);
  const { mutateAsync: updateEmployee, isPending } = useUpdateEmployee(id, companyId);

  const { register, handleSubmit, watch, reset } = useForm<FormData>();

  useEffect(() => {
    if (emp) {
      reset({
        firstName: emp.firstName,
        lastName: emp.lastName,
        middleName: emp.middleName ?? '',
        email: emp.email,
        phone: emp.phone ?? '',
        addressLine1: emp.addressLine1 ?? '',
        addressLine2: emp.addressLine2 ?? '',
        city: emp.city ?? '',
        state: emp.state ?? '',
        zip: emp.zip ?? '',
        employeeType: emp.employeeType,
        annualSalary: emp.annualSalary,
        hourlyRate: emp.hourlyRate,
        defaultHours: emp.defaultHours,
        overtimeEligible: emp.overtimeEligible ?? false,
        payFrequency: emp.payFrequency,
        residentState: emp.residentState,
        workState: emp.workState,
      });
    }
  }, [emp, reset]);

  const employeeType = watch('employeeType');
  const isHourly = employeeType === EmployeeType.HOURLY || employeeType === EmployeeType.CONTRACTOR;

  const onSubmit = async (data: FormData) => {
    // Drop empty strings; coerce numeric fields to numbers
    const numericFields = new Set(['annualSalary', 'hourlyRate', 'defaultHours']);
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === '' || v === null || v === undefined) continue;
      if (numericFields.has(k)) {
        const n = Number(v);
        if (!isNaN(n)) payload[k] = n;
      } else {
        payload[k] = v;
      }
    }
    try {
      await updateEmployee(payload);
      success('Employee updated', 'Changes saved successfully.');
      router.push(`/employees/${id}?companyId=${companyId}`);
    } catch {
      error('Update failed', 'Please check the form and try again.');
    }
  };

  if (isLoading) return <PageLoader />;
  if (!emp) return null;

  return (
    <div>
      <PageHeader
        title={`Edit ${emp.firstName} ${emp.lastName}`}
        description={`${emp.employeeNumber} · ${emp.email}`}
        breadcrumbs={[
          { label: 'Employees', href: '/employees' },
          { label: `${emp.firstName} ${emp.lastName}`, href: `/employees/${id}?companyId=${companyId}` },
          { label: 'Edit' },
        ]}
        actions={
          <Link href={`/employees/${id}?companyId=${companyId}`}>
            <Button variant="secondary" icon={ArrowLeft}>Back</Button>
          </Link>
        }
      />

      <div className="px-6 py-6 max-w-3xl">
        <Card padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Personal Information */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 w-full">
                Personal Information
              </legend>
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name" {...register('firstName')} />
                <Input label="Last Name" {...register('lastName')} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Input label="Email Address" type="email" {...register('email')} />
                <Input label="Phone" {...register('phone')} placeholder="512-555-0101" />
              </div>
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-500">
                SSN: <span className="font-mono">{emp.ssn ?? '***-**-****'}</span>
                <span className="ml-2 text-xs">(contact admin to update SSN)</span>
              </div>
            </fieldset>

            {/* Address */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 w-full">
                Home Address
              </legend>
              <Input label="Address Line 1" {...register('addressLine1')} placeholder="123 Main St" />
              <div className="mt-4">
                <Input label="Address Line 2" {...register('addressLine2')} placeholder="Suite 100" />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <Input label="City" {...register('city')} />
                <Select label="State" options={stateOptions} placeholder="Select..." {...register('state')} />
                <Input label="ZIP Code" {...register('zip')} />
              </div>
            </fieldset>

            {/* Employment Details */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 w-full">
                Employment Details
              </legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-base">Employee Type</label>
                  <div className="flex gap-3 mt-1">
                    {[
                      { value: EmployeeType.FTE, label: 'Salaried (FTE)' },
                      { value: EmployeeType.HOURLY, label: 'Hourly' },
                      { value: EmployeeType.CONTRACTOR, label: 'Contractor' },
                    ].map((t) => (
                      <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value={t.value}
                          {...register('employeeType')}
                          className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500"
                        />
                        <span className="text-sm text-slate-700">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Select label="Pay Frequency" options={payFreqOptions} {...register('payFrequency')} />
              </div>

              {isHourly ? (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <Input
                    label="Hourly Rate ($)"
                    type="number"
                    step="0.01"
                    {...register('hourlyRate', { valueAsNumber: true })}
                    placeholder="25.00"
                  />
                  <Input
                    label="Default Hours/Period"
                    type="number"
                    {...register('defaultHours', { valueAsNumber: true })}
                    placeholder="80"
                  />
                  <div className="flex items-end pb-0.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('overtimeEligible')}
                        className="w-4 h-4 text-primary-600 rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">Overtime eligible</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Annual Salary ($)"
                    type="number"
                    step="1000"
                    {...register('annualSalary', { valueAsNumber: true })}
                    placeholder="85000"
                  />
                </div>
              )}
            </fieldset>

            {/* State Assignment */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 w-full">
                State Assignment
              </legend>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Resident State"
                  options={stateOptions}
                  placeholder="Select state..."
                  {...register('residentState')}
                  hint="State where employee lives"
                />
                <Select
                  label="Work State"
                  options={stateOptions}
                  placeholder="Select state..."
                  {...register('workState')}
                  hint="State where employee works"
                />
              </div>
            </fieldset>

            <div className="pt-2 flex gap-3">
              <Button type="submit" loading={isPending}>
                Save Changes
              </Button>
              <Link href={`/employees/${id}?companyId=${companyId}`}>
                <Button variant="secondary" type="button">Cancel</Button>
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
