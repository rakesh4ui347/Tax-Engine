'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApprovePayrollRunDto,
  CreatePayrollRunDto,
  DashboardKpi,
  PayrollChartData,
  PayrollRun,
  PayStub,
} from '@/types/api';
import { del, get, post, patch } from '@/lib/api';

export const payrollKeys = {
  all: ['payroll'] as const,
  runs: (companyId?: string) => [...payrollKeys.all, 'runs', companyId] as const,
  run: (id: string) => [...payrollKeys.all, 'run', id] as const,
  payStubs: (runId: string) => [...payrollKeys.all, 'paystubs', runId] as const,
  dashboard: () => [...payrollKeys.all, 'dashboard'] as const,
  chart: () => [...payrollKeys.all, 'chart'] as const,
};

export function usePayrollRuns(companyId?: string) {
  return useQuery({
    queryKey: payrollKeys.runs(companyId),
    queryFn: () =>
      get<{ runs: PayrollRun[]; total: number }>(`/companies/${companyId}/payroll/runs`)
        .then((res) => res.runs),
    enabled: !!companyId,
  });
}

export function usePayrollRun(runId: string, companyId?: string) {
  return useQuery({
    queryKey: payrollKeys.run(runId),
    queryFn: () => get<PayrollRun>(`/companies/${companyId}/payroll/runs/${runId}`),
    enabled: !!runId && !!companyId,
  });
}

export function usePayStubs(runId: string, companyId?: string) {
  return useQuery({
    queryKey: payrollKeys.payStubs(runId),
    queryFn: () => get<PayStub[]>(`/companies/${companyId}/payroll/runs/${runId}/pay-stubs`),
    enabled: !!runId && !!companyId,
  });
}

export function useDashboardKpi() {
  return useQuery({
    queryKey: payrollKeys.dashboard(),
    queryFn: () => get<DashboardKpi>('/dashboard/kpi'),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePayrollChartData() {
  return useQuery({
    queryKey: payrollKeys.chart(),
    queryFn: () => get<PayrollChartData[]>('/dashboard/payroll-chart'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, ...body }: CreatePayrollRunDto) =>
      post<PayrollRun>(`/companies/${companyId}/payroll/runs`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollKeys.all });
    },
  });
}

export function useCalculatePayrollRun(runId: string, companyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      post<PayrollRun>(`/companies/${companyId}/payroll/runs/${runId}/calculate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollKeys.run(runId) });
    },
  });
}

export function useApprovePayrollRun(runId: string, companyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ApprovePayrollRunDto) =>
      post<PayrollRun>(`/companies/${companyId}/payroll/runs/${runId}/approve`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollKeys.run(runId) });
      qc.invalidateQueries({ queryKey: payrollKeys.all });
    },
  });
}

export function useVoidPayrollRun(runId: string, companyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      patch<PayrollRun>(`/companies/${companyId}/payroll/runs/${runId}/void`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollKeys.run(runId) });
      qc.invalidateQueries({ queryKey: payrollKeys.all });
    },
  });
}

export function useDeletePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, companyId }: { runId: string; companyId: string }) =>
      del<void>(`/companies/${companyId}/payroll/runs/${runId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollKeys.all });
    },
  });
}
