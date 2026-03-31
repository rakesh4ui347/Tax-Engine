'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EmployeeType, PayFrequency, CreateEmployeeDto } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { US_STATES } from '@/lib/utils';

const schema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().optional(),
  email: z.string().email('Valid email required'),
  ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, 'SSN must be in format XXX-XX-XXXX'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  hireDate: z.string().min(1, 'Hire date is required'),
  phone: z.string().optional(),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'Select a state'),
  zip: z.string().min(5, 'ZIP code is required'),
  employeeType: z.nativeEnum(EmployeeType).optional(),
  annualSalary: z.number().positive().optional(),
  hourlyRate: z.number().positive().optional(),
  defaultHours: z.number().min(1).max(168).optional(),
  overtimeEligible: z.boolean().optional(),
  payFrequency: z.nativeEnum(PayFrequency).optional(),
  residentState: z.string().length(2, 'Select a state'),
  workState: z.string().length(2, 'Select a state'),
});

type FormData = z.infer<typeof schema>;

const stateOptions = US_STATES.map((s) => ({ value: s.code, label: `${s.code} — ${s.name}` }));
const payFreqOptions = [
  { value: PayFrequency.WEEKLY, label: 'Weekly' },
  { value: PayFrequency.BIWEEKLY, label: 'Bi-weekly' },
  { value: PayFrequency.SEMIMONTHLY, label: 'Semi-monthly' },
  { value: PayFrequency.MONTHLY, label: 'Monthly' },
];

interface EmployeeFormProps {
  companyId?: string;
  defaultValues?: Partial<FormData>;
  onSubmit: (data: CreateEmployeeDto) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function EmployeeForm({ defaultValues, onSubmit, isSubmitting, submitLabel = 'Save Employee' }: EmployeeFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeType: EmployeeType.FTE,
      payFrequency: PayFrequency.BIWEEKLY,
      overtimeEligible: false,
      ...defaultValues,
    },
  });

  const employeeType = watch('employeeType');
  const isHourly = employeeType === EmployeeType.HOURLY || employeeType === EmployeeType.CONTRACTOR;

  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d as CreateEmployeeDto))} className="space-y-6">

      {/* Personal Information */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 w-full">
          Personal Information
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            {...register('firstName')}
            error={errors.firstName?.message}
            placeholder="John"
          />
          <Input
            label="Last Name"
            {...register('lastName')}
            error={errors.lastName?.message}
            placeholder="Smith"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Input
            label="Email Address"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="john@company.com"
          />
          <Input
            label="SSN"
            {...register('ssn')}
            error={errors.ssn?.message}
            placeholder="123-45-6789"
            hint="Will be encrypted at rest"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Input
            label="Date of Birth"
            type="date"
            {...register('dateOfBirth')}
            error={errors.dateOfBirth?.message}
          />
          <Input
            label="Phone"
            {...register('phone')}
            error={errors.phone?.message}
            placeholder="512-555-0101"
          />
        </div>
      </fieldset>

      {/* Address */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 w-full">
          Home Address
        </legend>
        <Input
          label="Address Line 1"
          {...register('addressLine1')}
          error={errors.addressLine1?.message}
          placeholder="123 Main St"
        />
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Input
            label="City"
            {...register('city')}
            error={errors.city?.message}
            placeholder="Austin"
          />
          <Select
            label="State"
            options={stateOptions}
            placeholder="Select..."
            {...register('state')}
            error={errors.state?.message}
          />
          <Input
            label="ZIP Code"
            {...register('zip')}
            error={errors.zip?.message}
            placeholder="78701"
          />
        </div>
      </fieldset>

      {/* Employment Details */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 w-full">
          Employment Details
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Employee Number"
            {...register('employeeNumber')}
            error={errors.employeeNumber?.message}
            placeholder="E001"
          />
          <Input
            label="Hire Date"
            type="date"
            {...register('hireDate')}
            error={errors.hireDate?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
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
          <Select
            label="Pay Frequency"
            options={payFreqOptions}
            {...register('payFrequency')}
            error={errors.payFrequency?.message}
          />
        </div>

        {isHourly ? (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <Input
              label="Hourly Rate ($)"
              type="number"
              step="0.01"
              {...register('hourlyRate', { valueAsNumber: true })}
              error={errors.hourlyRate?.message}
              placeholder="25.00"
            />
            <Input
              label="Default Hours/Period"
              type="number"
              {...register('defaultHours', { valueAsNumber: true })}
              error={errors.defaultHours?.message}
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
              error={errors.annualSalary?.message}
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
            error={errors.residentState?.message}
            hint="State where employee lives"
          />
          <Select
            label="Work State"
            options={stateOptions}
            placeholder="Select state..."
            {...register('workState')}
            error={errors.workState?.message}
            hint="State where employee works"
          />
        </div>
      </fieldset>

      <div className="pt-2">
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
