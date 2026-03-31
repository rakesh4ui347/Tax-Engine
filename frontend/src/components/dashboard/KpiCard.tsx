import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  loading?: boolean;
}

export function KpiCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-primary-600',
  iconBg = 'bg-primary-50',
  loading,
}: KpiCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="w-28 h-4 bg-slate-100 rounded" />
          <div className="w-10 h-10 bg-slate-100 rounded-xl" />
        </div>
        <div className="w-36 h-7 bg-slate-100 rounded mb-2" />
        <div className="w-24 h-3 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-card p-6 hover:shadow-card-hover transition">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>

      <p className="text-2xl font-bold text-slate-900 mb-1.5">{value}</p>

      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-success-500" />
          ) : isNegative ? (
            <TrendingDown className="w-3.5 h-3.5 text-danger-500" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span
            className={cn(
              'text-xs font-semibold',
              isPositive && 'text-success-600',
              isNegative && 'text-danger-600',
              !isPositive && !isNegative && 'text-slate-500',
            )}
          >
            {isPositive ? '+' : ''}{change.toFixed(1)}%
          </span>
          {changeLabel && (
            <span className="text-xs text-slate-400">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
