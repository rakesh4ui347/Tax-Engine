'use client';

import Link from 'next/link';
import { PayrollRun } from '@/types/api';
import { formatCurrency, formatDateRange } from '@/lib/utils';
import { RunStatusBadge } from '@/components/payroll/RunStatusBadge';
import { Table, TableHead, TableBody, TableRow, Th, Td } from '@/components/ui/Table';
import { ChevronRight } from 'lucide-react';

interface RecentRunsProps {
  runs: PayrollRun[];
  loading?: boolean;
}

export function RecentRuns({ runs, loading }: RecentRunsProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        No payroll runs yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <tr>
          <Th>Period</Th>
          <Th>Company</Th>
          <Th className="text-right">Gross</Th>
          <Th className="text-right">Net</Th>
          <Th>Status</Th>
          <Th />
        </tr>
      </TableHead>
      <TableBody>
        {runs.slice(0, 5).map((run) => (
          <TableRow key={run.id}>
            <Td className="font-medium text-slate-900">
              {formatDateRange(run.periodStart, run.periodEnd)}
            </Td>
            <Td>{run.company?.name ?? '—'}</Td>
            <Td className="text-right font-mono">{formatCurrency(run.totalGross)}</Td>
            <Td className="text-right font-mono">{formatCurrency(run.totalNet)}</Td>
            <Td>
              <RunStatusBadge status={run.status} />
            </Td>
            <Td className="w-8">
              <Link
                href={`/payroll/${run.id}`}
                className="text-slate-400 hover:text-primary-600 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            </Td>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
