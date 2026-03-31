'use client';

import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ReportFilters } from '@/types/api';
import { X } from 'lucide-react';

interface ReportFiltersProps {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  onReset: () => void;
  showDateRange?: boolean;
  showQuarter?: boolean;
  showYear?: boolean;
  showCompany?: boolean;
  companies?: { value: string; label: string }[];
}

const yearOptions = Array.from({ length: 6 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

const quarterOptions = [
  { value: '1', label: 'Q1 (Jan–Mar)' },
  { value: '2', label: 'Q2 (Apr–Jun)' },
  { value: '3', label: 'Q3 (Jul–Sep)' },
  { value: '4', label: 'Q4 (Oct–Dec)' },
];

export function ReportFiltersBar({
  filters,
  onChange,
  onReset,
  showDateRange,
  showQuarter,
  showYear = true,
  showCompany,
  companies = [],
}: ReportFiltersProps) {
  const hasFilters = filters.year || filters.quarter || filters.startDate || filters.endDate;

  return (
    <div className="flex items-end gap-3 flex-wrap">
      {showCompany && companies.length > 0 && (
        <div className="w-56">
          <Select
            label="Company"
            options={[{ value: '', label: 'Select company…' }, ...companies]}
            value={filters.companyId ?? ''}
            onChange={(e) => onChange({ ...filters, companyId: e.target.value || undefined })}
          />
        </div>
      )}

      {showYear && (
        <div className="w-32">
          <Select
            label="Year"
            options={yearOptions}
            value={String(filters.year ?? new Date().getFullYear())}
            onChange={(e) => onChange({ ...filters, year: Number(e.target.value) })}
          />
        </div>
      )}

      {showQuarter && (
        <div className="w-40">
          <Select
            label="Quarter"
            options={[{ value: '', label: 'All Quarters' }, ...quarterOptions]}
            value={String(filters.quarter ?? '')}
            onChange={(e) =>
              onChange({ ...filters, quarter: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
      )}

      {showDateRange && (
        <>
          <div className="w-40">
            <Input
              label="Start Date"
              type="date"
              value={filters.startDate ?? ''}
              onChange={(e) => onChange({ ...filters, startDate: e.target.value || undefined })}
            />
          </div>
          <div className="w-40">
            <Input
              label="End Date"
              type="date"
              value={filters.endDate ?? ''}
              onChange={(e) => onChange({ ...filters, endDate: e.target.value || undefined })}
            />
          </div>
        </>
      )}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          icon={X}
          onClick={onReset}
          className="mb-0.5"
        >
          Reset
        </Button>
      )}
    </div>
  );
}
