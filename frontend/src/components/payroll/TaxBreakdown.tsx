import { DeductionLine, TaxLine } from '@/types/api';
import { formatCurrency } from '@/lib/utils';

interface TaxBreakdownProps {
  taxLines: TaxLine[];
  deductionLines?: DeductionLine[];
}

interface GroupedTaxLine {
  description: string;
  state?: string;
  employeeAmount: number;
  employerAmount: number;
}

export function TaxBreakdown({ taxLines, deductionLines }: TaxBreakdownProps) {
  const preTaxDeductions = deductionLines?.filter((d) => d.preTax) ?? [];
  const postTaxDeductions = deductionLines?.filter((d) => !d.preTax) ?? [];

  // Group employee + employer lines by taxCode so they display on one row
  const grouped = taxLines.reduce<Record<string, GroupedTaxLine>>((acc, line) => {
    const key = `${line.taxCode}:${line.state ?? ''}`;
    if (!acc[key]) {
      acc[key] = { description: line.description, state: line.state, employeeAmount: 0, employerAmount: 0 };
    }
    if (line.isEmployee) acc[key].employeeAmount += line.amount;
    else acc[key].employerAmount += line.amount;
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Tax Lines */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Tax Withholding
        </h4>
        <div className="space-y-2">
          {Object.entries(grouped).map(([key, line]) => (
            <div key={key} className="flex justify-between items-center text-sm">
              <div>
                <span className="text-slate-700 font-medium">{line.description}</span>
                {line.state && (
                  <span className="ml-2 text-xs text-slate-400">{line.state}</span>
                )}
              </div>
              <div className="text-right">
                {line.employeeAmount > 0 && (
                  <span className="font-mono text-slate-900 text-xs">
                    EE: {formatCurrency(line.employeeAmount)}
                  </span>
                )}
                {line.employerAmount > 0 && (
                  <span className="ml-2 font-mono text-slate-400 text-xs">
                    ER: {formatCurrency(line.employerAmount)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deduction Lines */}
      {deductionLines && deductionLines.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Deductions
          </h4>
          {preTaxDeductions.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-400 mb-2">Pre-tax</p>
              <div className="space-y-1.5">
                {preTaxDeductions.map((d) => (
                  <div key={d.id} className="flex justify-between text-sm">
                    <span className="text-slate-700">{d.description}</span>
                    <span className="font-mono text-slate-900">{formatCurrency(d.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {postTaxDeductions.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2">Post-tax</p>
              <div className="space-y-1.5">
                {postTaxDeductions.map((d) => (
                  <div key={d.id} className="flex justify-between text-sm">
                    <span className="text-slate-700">{d.description}</span>
                    <span className="font-mono text-slate-900">{formatCurrency(d.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
