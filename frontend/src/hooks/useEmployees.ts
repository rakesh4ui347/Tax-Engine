'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateDeductionDto,
  CreateEmployeeDto,
  Employee,
  EmployeeDeduction,
  UpdateW4Dto,
  W4Profile,
} from '@/types/api';
import { del, get, patch, post, put } from '@/lib/api';

export const employeeKeys = {
  all: ['employees'] as const,
  list: (companyId?: string) => [...employeeKeys.all, 'list', companyId] as const,
  detail: (id: string) => [...employeeKeys.all, 'detail', id] as const,
  w4: (id: string) => [...employeeKeys.all, 'w4', id] as const,
  deductions: (id: string) => [...employeeKeys.all, 'deductions', id] as const,
};

export function useEmployees(companyId?: string, search?: string) {
  return useQuery({
    queryKey: employeeKeys.list(companyId),
    queryFn: () =>
      get<Employee[]>(`/companies/${companyId}/employees`, search ? { search } : undefined),
    enabled: !!companyId,
  });
}

export function useEmployee(id: string, companyId?: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => get<Employee>(`/companies/${companyId}/employees/${id}`),
    enabled: !!id && !!companyId,
  });
}

export function useW4Profile(employeeId: string, companyId?: string) {
  return useQuery({
    queryKey: employeeKeys.w4(employeeId),
    queryFn: () => get<W4Profile>(`/companies/${companyId}/employees/${employeeId}/w4`),
    enabled: !!employeeId && !!companyId,
  });
}

export function useEmployeeDeductions(employeeId: string, companyId?: string) {
  return useQuery({
    queryKey: employeeKeys.deductions(employeeId),
    queryFn: () => get<EmployeeDeduction[]>(`/companies/${companyId}/employees/${employeeId}/deductions`),
    enabled: !!employeeId && !!companyId,
  });
}

export function useCreateEmployee(companyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId: _cid, ...body }: CreateEmployeeDto & { companyId?: string }) =>
      post<Employee>(`/companies/${companyId}/employees`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

export function useUpdateEmployee(id: string, companyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<CreateEmployeeDto>) =>
      patch<Employee>(`/companies/${companyId}/employees/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      qc.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

export function useUpdateW4(employeeId: string, companyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateW4Dto) =>
      put<W4Profile>(`/companies/${companyId}/employees/${employeeId}/w4`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.w4(employeeId) });
    },
  });
}

export function useCreateDeduction(employeeId: string, companyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDeductionDto) =>
      post<EmployeeDeduction>(`/companies/${companyId}/employees/${employeeId}/deductions`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.deductions(employeeId) });
    },
  });
}

export function useDeleteDeduction(employeeId: string, companyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deductionId: string) =>
      del<void>(`/companies/${companyId}/employees/${employeeId}/deductions/${deductionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.deductions(employeeId) });
    },
  });
}

export function useTerminateEmployee(id: string, companyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (terminationDate: string) =>
      post<Employee>(`/companies/${companyId}/employees/${id}/terminate`, { terminationDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      qc.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}
