'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PayrollRegisterRow, ReportFilters, TaxLiabilitySummary, YtdSummaryRow } from '@/types/api';
import { get, patch } from '@/lib/api';

export interface TaxFiling {
  id: string;
  companyId: string;
  payrollRunId?: string;
  taxCode: string;
  taxYear: number;
  period: string;
  state?: string;
  locality?: string;
  amount: number;
  liabilityBucket: string;
  dueDate?: string;
  paidAt?: string;
  filingStatus: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export const reportingKeys = {
  all: ['reporting'] as const,
  register: (filters: ReportFilters) => [...reportingKeys.all, 'register', filters] as const,
  taxLiability: (filters: ReportFilters) => [...reportingKeys.all, 'tax-liability', filters] as const,
  ytd: (filters: ReportFilters) => [...reportingKeys.all, 'ytd', filters] as const,
  taxFilings: (filters: ReportFilters) => [...reportingKeys.all, 'tax-filings', filters] as const,
};

export function usePayrollRegister(filters: ReportFilters) {
  return useQuery({
    queryKey: reportingKeys.register(filters),
    queryFn: () =>
      get<PayrollRegisterRow[]>('/reporting/payroll-register', filters as Record<string, unknown>),
    enabled: !!(filters.companyId),
  });
}

export function useTaxLiabilitySummary(filters: ReportFilters) {
  return useQuery({
    queryKey: reportingKeys.taxLiability(filters),
    queryFn: () =>
      get<TaxLiabilitySummary[]>('/reporting/tax-liability', filters as Record<string, unknown>),
    enabled: !!(filters.companyId && filters.year),
  });
}

export function useYtdSummary(filters: ReportFilters) {
  return useQuery({
    queryKey: reportingKeys.ytd(filters),
    queryFn: () =>
      get<YtdSummaryRow[]>('/reporting/ytd', filters as Record<string, unknown>),
    enabled: !!(filters.companyId && filters.year),
  });
}

export function useTaxFilings(filters: ReportFilters) {
  return useQuery({
    queryKey: reportingKeys.taxFilings(filters),
    queryFn: () =>
      get<TaxFiling[]>('/reporting/tax-filings', filters as Record<string, unknown>),
    enabled: !!(filters.companyId && filters.year),
  });
}

export function useMarkLiabilityPaid(filters: ReportFilters) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      patch<TaxFiling>(`/reporting/tax-filings/${id}/paid?companyId=${filters.companyId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reportingKeys.all });
    },
  });
}
