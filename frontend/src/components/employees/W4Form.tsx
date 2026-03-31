'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FilingStatus, UpdateW4Dto, W4Profile } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

const schema = z.object({
  filingStatus: z.nativeEnum(FilingStatus),
  multipleJobs: z.boolean(),
  claimDependents: z.number().min(0),
  otherIncome: z.number().min(0),
  deductionsAmount: z.number().min(0),
  additionalWithholding: z.number().min(0),
  exemptFromFIT: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface W4FormProps {
  defaultValues?: W4Profile;
  onSubmit: (data: UpdateW4Dto) => Promise<void>;
  isSubmitting?: boolean;
}

const filingStatuses = [
  { value: FilingStatus.SINGLE, label: 'Single or Married filing separately' },
  { value: FilingStatus.MARRIED_FILING_JOINTLY, label: 'Married filing jointly' },
  { value: FilingStatus.HEAD_OF_HOUSEHOLD, label: 'Head of household' },
  { value: FilingStatus.MARRIED_FILING_SEPARATELY, label: 'Married filing separately' },
  { value: FilingStatus.QUALIFYING_WIDOW, label: 'Qualifying surviving spouse' },
];

export function W4Form({ defaultValues, onSubmit, isSubmitting }: W4FormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      filingStatus: defaultValues?.filingStatus ?? FilingStatus.SINGLE,
      multipleJobs: defaultValues?.multipleJobs ?? false,
      claimDependents: Number(defaultValues?.claimDependents ?? 0),
      otherIncome: Number(defaultValues?.otherIncome ?? 0),
      deductionsAmount: Number(defaultValues?.deductionsAmount ?? 0),
      additionalWithholding: Number(defaultValues?.additionalWithholding ?? 0),
      exemptFromFIT: defaultValues?.exemptFromFIT ?? false,
    },
  });

  const exemptFromFIT = watch('exemptFromFIT');

  return (
    <form
      onSubmit={handleSubmit((d) =>
        onSubmit({ ...d, taxYear: new Date().getFullYear() }),
      )}
      className="space-y-6"
    >
      {/* Step 1: Filing Status */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-800 text-white px-5 py-3 flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-white text-slate-800 text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
          <div>
            <p className="font-semibold text-sm">Enter Personal Information</p>
            <p className="text-xs text-slate-300">Filing Status</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {filingStatuses.map((fs) => (
            <label key={fs.value} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                value={fs.value}
                {...register('filingStatus')}
                className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">{fs.label}</span>
            </label>
          ))}
          {errors.filingStatus && (
            <p className="text-xs text-danger-500">{errors.filingStatus.message}</p>
          )}
        </div>
      </div>

      {/* Step 2: Multiple Jobs */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-800 text-white px-5 py-3 flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-white text-slate-800 text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
          <div>
            <p className="font-semibold text-sm">Multiple Jobs or Spouse Works</p>
            <p className="text-xs text-slate-300">Optional — for accuracy</p>
          </div>
        </div>
        <div className="p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('multipleJobs')}
              className="mt-0.5 w-4 h-4 rounded text-primary-600 border-slate-300 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-700 leading-relaxed">
              <strong>Step 2(c) checkbox:</strong> If there are only two jobs total, check this box.
              Do the same on Form W-4 for the other job. This option is accurate for jobs with similar pay.
            </span>
          </label>
        </div>
      </div>

      {/* Step 3: Claim Dependents */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-800 text-white px-5 py-3 flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-white text-slate-800 text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
          <div>
            <p className="font-semibold text-sm">Claim Dependents</p>
            <p className="text-xs text-slate-300">Reduce your withholding</p>
          </div>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500 mb-3">
            If your total income will be $200,000 or less ($400,000 or less if married filing jointly):
          </p>
          <Input
            label="Total dependent claim amount ($)"
            type="number"
            step="500"
            {...register('claimDependents', { valueAsNumber: true })}
            error={errors.claimDependents?.message}
            placeholder="0.00"
            hint="Qualifying children (under 17) × $2,000 + other dependents × $500"
          />
        </div>
      </div>

      {/* Step 4: Other Adjustments */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-800 text-white px-5 py-3 flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-white text-slate-800 text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
          <div>
            <p className="font-semibold text-sm">Other Adjustments</p>
            <p className="text-xs text-slate-300">Optional — increase or decrease withholding</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <Input
            label="(a) Other income not from jobs ($)"
            type="number"
            step="100"
            {...register('otherIncome', { valueAsNumber: true })}
            error={errors.otherIncome?.message}
            placeholder="0.00"
            hint="Interest, dividends, retirement income, etc."
          />
          <Input
            label="(b) Deductions ($)"
            type="number"
            step="100"
            {...register('deductionsAmount', { valueAsNumber: true })}
            error={errors.deductionsAmount?.message}
            placeholder="0.00"
            hint="Itemized deductions greater than the standard deduction"
          />
          <Input
            label="(c) Extra withholding per pay period ($)"
            type="number"
            step="10"
            {...register('additionalWithholding', { valueAsNumber: true })}
            error={errors.additionalWithholding?.message}
            placeholder="0.00"
            hint="Any additional withholding amount per paycheck"
          />
        </div>
      </div>

      {/* Exempt Status */}
      <div className={cn(
        'border rounded-xl p-5',
        exemptFromFIT ? 'border-warning-300 bg-warning-50' : 'border-slate-200',
      )}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register('exemptFromFIT')}
            className="mt-0.5 w-4 h-4 rounded text-warning-600 border-slate-300 focus:ring-warning-500"
          />
          <div>
            <span className="text-sm font-semibold text-slate-900">Claim Exemption from Federal Withholding</span>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              I claim exemption from withholding because I had no federal income tax liability last year
              and expect none this year. If exempt, complete only Steps 1 and 5.
            </p>
          </div>
        </label>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <Button type="submit" loading={isSubmitting}>
          Save W-4 Profile
        </Button>
      </div>
    </form>
  );
}
