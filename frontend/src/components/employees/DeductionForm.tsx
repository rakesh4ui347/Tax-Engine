'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateDeductionDto, DeductionType } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { format } from 'date-fns';

const schema = z.object({
  type: z.nativeEnum(DeductionType),
  description: z.string().optional(),
  isPercentage: z.boolean(),
  amount: z.number().positive().optional(),
  percentage: z.number().min(0).max(100).optional(),
  maxAnnual: z.number().positive().optional(),
  effectiveDate: z.string().min(1),
  endDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const deductionTypeOptions = [
  { value: DeductionType.PRE_TAX_401K, label: '401(k) Pre-tax' },
  { value: DeductionType.POST_TAX_ROTH, label: 'Roth 401(k) Post-tax' },
  { value: DeductionType.HEALTH_INSURANCE, label: 'Health Insurance' },
  { value: DeductionType.DENTAL, label: 'Dental Insurance' },
  { value: DeductionType.VISION, label: 'Vision Insurance' },
  { value: DeductionType.FSA, label: 'Flexible Spending Account (FSA)' },
  { value: DeductionType.HSA, label: 'Health Savings Account (HSA)' },
  { value: DeductionType.GARNISHMENT, label: 'Wage Garnishment' },
  { value: DeductionType.OTHER_PRE_TAX, label: 'Other Pre-tax' },
  { value: DeductionType.OTHER_POST_TAX, label: 'Other Post-tax' },
];

interface DeductionFormProps {
  onSubmit: (data: CreateDeductionDto) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function DeductionForm({ onSubmit, onCancel, isSubmitting }: DeductionFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: DeductionType.PRE_TAX_401K,
      isPercentage: false,
      effectiveDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const isPercentage = watch('isPercentage');

  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d as CreateDeductionDto))} className="space-y-4">
      <Select
        label="Deduction Type"
        options={deductionTypeOptions}
        {...register('type')}
        error={errors.type?.message}
      />

      <Input
        label="Description (optional)"
        {...register('description')}
        placeholder="Additional details..."
      />

      <div>
        <label className="label-base">Amount Type</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="false"
              {...register('isPercentage', { setValueAs: (v) => v === 'true' })}
              defaultChecked
              className="w-4 h-4 text-primary-600 border-slate-300"
            />
            <span className="text-sm text-slate-700">Fixed Amount ($)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="true"
              {...register('isPercentage', { setValueAs: (v) => v === 'true' })}
              className="w-4 h-4 text-primary-600 border-slate-300"
            />
            <span className="text-sm text-slate-700">Percentage of Gross (%)</span>
          </label>
        </div>
      </div>

      {isPercentage ? (
        <Input
          label="Percentage (%)"
          type="number"
          step="0.01"
          {...register('percentage', { valueAsNumber: true })}
          error={errors.percentage?.message}
          placeholder="6.00"
          hint="Percentage of gross pay"
        />
      ) : (
        <Input
          label="Amount per Pay Period ($)"
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
          error={errors.amount?.message}
          placeholder="150.00"
        />
      )}

      <Input
        label="Annual Maximum ($, optional)"
        type="number"
        step="100"
        {...register('maxAnnual', { valueAsNumber: true })}
        error={errors.maxAnnual?.message}
        placeholder="23000"
        hint="For 401(k): IRS limit is $23,000 for 2024"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Effective Date"
          type="date"
          {...register('effectiveDate')}
          error={errors.effectiveDate?.message}
        />
        <Input
          label="End Date (optional)"
          type="date"
          {...register('endDate')}
          error={errors.endDate?.message}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isSubmitting}>
          Add Deduction
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
