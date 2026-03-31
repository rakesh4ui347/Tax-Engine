import Link from 'next/link';
import { PayrollRun } from '@/types/api';
import { formatCurrency, formatDate, formatDateRange } from '@/lib/utils';
import { RunStatusBadge } from './RunStatusBadge';
import { Users, Calendar, ArrowRight } from 'lucide-react';

interface PayrollRunCardProps {
  run: PayrollRun;
}

export function PayrollRunCard({ run }: PayrollRunCardProps) {
  return (
    <Link href={`/payroll/${run.id}?companyId=${run.companyId}`}>
      <div className="bg-white rounded-xl border border-slate-100 shadow-card hover:shadow-card-hover transition p-5 group">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-semibold text-slate-900 text-sm">
              {formatDateRange(run.periodStart, run.periodEnd)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Pay date: {formatDate(run.payDate)}
            </p>
          </div>
          <RunStatusBadge status={run.status} />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Gross Pay</p>
            <p className="text-sm font-bold text-slate-900">{formatCurrency(run.totalGross)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Taxes</p>
            <p className="text-sm font-bold text-warning-600">{formatCurrency(run.totalTax)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Net Pay</p>
            <p className="text-sm font-bold text-success-600">{formatCurrency(run.totalNet)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {run._count?.payStubs ?? 0} employees
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(run.createdAt, 'MMM d')}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-primary-400 group-hover:text-primary-600 transition group-hover:translate-x-0.5 transform" />
        </div>
      </div>
    </Link>
  );
}
