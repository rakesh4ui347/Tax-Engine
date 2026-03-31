'use client';

import Link from 'next/link';
import { Employee, EmployeeType } from '@/types/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableHead, TableBody, TableRow, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { ChevronRight } from 'lucide-react';

interface EmployeeTableProps {
  employees: Employee[];
  loading?: boolean;
}

export function EmployeeTable({ employees, loading }: EmployeeTableProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
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
          <Th>Type</Th>
          <Th>Compensation</Th>
          <Th>State</Th>
          <Th>Hire Date</Th>
          <Th>Status</Th>
          <Th />
        </tr>
      </TableHead>
      <TableBody>
        {employees.map((emp) => (
          <TableRow key={emp.id}>
            <Td>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 text-xs font-bold">
                    {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    {emp.firstName} {emp.lastName}
                  </p>
                  <p className="text-xs text-slate-400">{emp.email}</p>
                </div>
              </div>
            </Td>
            <Td>
              <Badge variant={emp.employeeType === EmployeeType.HOURLY ? 'primary' : 'purple'}>
                {emp.employeeType}
              </Badge>
            </Td>
            <Td className="font-mono">
              {emp.employeeType === EmployeeType.SALARY
                ? formatCurrency(emp.annualSalary ?? 0) + '/yr'
                : formatCurrency(emp.hourlyRate ?? 0) + '/hr'}
            </Td>
            <Td>
              <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded">
                {emp.workState}
              </span>
            </Td>
            <Td>{formatDate(emp.hireDate)}</Td>
            <Td>
              <Badge variant={emp.isActive ? 'success' : 'default'} dot>
                {emp.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </Td>
            <Td className="w-8">
              <Link
                href={`/employees/${emp.id}?companyId=${emp.companyId}`}
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
