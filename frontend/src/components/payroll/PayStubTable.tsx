'use client';

import { PayStub } from '@/types/api';
import { formatCurrency } from '@/lib/utils';
import { Table, TableHead, TableBody, TableRow, Th, Td } from '@/components/ui/Table';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TaxBreakdown } from './TaxBreakdown';

interface PayStubTableProps {
  payStubs: PayStub[];
  loading?: boolean;
}

export function PayStubTable({ payStubs, loading }: PayStubTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <tr>
          <Th>Employee</Th>
          <Th className="text-right">Gross</Th>
          <Th className="text-right">SS Tax</Th>
          <Th className="text-right">Medicare</Th>
          <Th className="text-right">FIT</Th>
          <Th className="text-right">State Tax</Th>
          <Th className="text-right">Deductions</Th>
          <Th className="text-right font-bold">Net Pay</Th>
          <Th />
        </tr>
      </TableHead>
      <TableBody>
        {payStubs.map((stub) => {
          const ssTax = stub.taxLines.find((t) => t.taxCode === 'SS_EMPLOYEE')?.amount ?? 0;
          const medicare = stub.taxLines.find((t) => t.taxCode === 'MEDICARE_EMPLOYEE')?.amount ?? 0;
          const fit = stub.taxLines.find((t) => t.taxCode === 'FIT')?.amount ?? 0;
          const stateTax = stub.taxLines
            .filter((t) => t.liabilityBucket === 'STATE' && t.isEmployee)
            .reduce((sum, t) => sum + t.amount, 0);

          const isExpanded = expandedId === stub.id;

          return (
            <>
              <TableRow
                key={stub.id}
                className="cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : stub.id)}
              >
                <Td>
                  <div className="font-medium text-slate-900">
                    {stub.employee
                      ? `${stub.employee.firstName} ${stub.employee.lastName}`
                      : stub.employeeId}
                  </div>
                  {stub.employee?.employeeNumber && (
                    <div className="text-xs text-slate-400">#{stub.employee.employeeNumber}</div>
                  )}
                </Td>
                <Td className="text-right font-mono">{formatCurrency(stub.grossPay)}</Td>
                <Td className="text-right font-mono text-slate-500">{formatCurrency(ssTax)}</Td>
                <Td className="text-right font-mono text-slate-500">{formatCurrency(medicare)}</Td>
                <Td className="text-right font-mono text-slate-500">{formatCurrency(fit)}</Td>
                <Td className="text-right font-mono text-slate-500">{formatCurrency(stateTax)}</Td>
                <Td className="text-right font-mono text-warning-600">
                  {formatCurrency(stub.totalDeductions)}
                </Td>
                <Td className="text-right font-mono font-bold text-success-700">
                  {formatCurrency(stub.netPay)}
                </Td>
                <Td className="w-8 text-slate-400">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Td>
              </TableRow>

              {isExpanded && (
                <tr key={`${stub.id}-expanded`}>
                  <td colSpan={9} className="bg-slate-50 px-6 py-4">
                    <TaxBreakdown taxLines={stub.taxLines} deductionLines={stub.deductionLines} />
                  </td>
                </tr>
              )}
            </>
          );
        })}
      </TableBody>
    </Table>
  );
}
