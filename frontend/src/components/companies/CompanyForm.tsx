'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateCompanyDto, PayFrequency } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { US_STATES } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Company name is required'),
  ein: z.string().regex(/^\d{2}-\d{7}$/, 'EIN format: XX-XXXXXXX'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  addressLine1: z.string().min(1, 'Street address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'Select a state'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Enter a valid ZIP code'),
  payFrequency: z.nativeEnum(PayFrequency).optional(),
  nextPayDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const stateOptions = US_STATES.map((s) => ({ value: s.code, label: `${s.code} — ${s.name}` }));
const payFreqOptions = [
  { value: PayFrequency.WEEKLY, label: 'Weekly' },
  { value: PayFrequency.BIWEEKLY, label: 'Bi-weekly (every 2 weeks)' },
  { value: PayFrequency.SEMIMONTHLY, label: 'Semi-monthly (1st and 15th)' },
  { value: PayFrequency.MONTHLY, label: 'Monthly' },
];

interface CompanyFormProps {
  organizationId: string;
  defaultValues?: Partial<FormData>;
  onSubmit: (data: CreateCompanyDto) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function CompanyForm({ organizationId, defaultValues, onSubmit, isSubmitting, submitLabel = 'Save Company' }: CompanyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      payFrequency: PayFrequency.BIWEEKLY,
      ...defaultValues,
    },
  });

  const handleFormSubmit = (data: FormData) => {
    const payload: CreateCompanyDto = {
      ...data,
      organizationId,
      addressLine2: data.addressLine2 || undefined,
      phone: data.phone || undefined,
      nextPayDate: data.nextPayDate || undefined,
    };
    return onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Business Identity */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 w-full">
          Business Identity
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Company Name"
            {...register('name')}
            error={errors.name?.message}
            placeholder="Acme Corporation"
            hint="Registered legal business name"
          />
          <Input
            label="EIN (Employer Identification Number)"
            {...register('ein')}
            error={errors.ein?.message}
            placeholder="12-3456789"
            hint="Format: XX-XXXXXXX"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Input
            label="Company Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="payroll@company.com"
          />
          <Input
            label="Phone (optional)"
            {...register('phone')}
            error={errors.phone?.message}
            placeholder="512-555-0200"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Select
            label="Default Pay Frequency"
            options={payFreqOptions}
            {...register('payFrequency')}
            error={errors.payFrequency?.message}
          />
          <Input
            label="Next Pay Date (optional)"
            type="date"
            {...register('nextPayDate')}
            error={errors.nextPayDate?.message}
          />
        </div>
      </fieldset>

      {/* Business Address */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 w-full">
          Business Address
        </legend>
        <div className="space-y-4">
          <Input
            label="Street Address"
            {...register('addressLine1')}
            error={errors.addressLine1?.message}
            placeholder="123 Main Street"
          />
          <Input
            label="Suite / Unit (optional)"
            {...register('addressLine2')}
            placeholder="Suite 400"
          />
          <div className="grid grid-cols-3 gap-4">
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
