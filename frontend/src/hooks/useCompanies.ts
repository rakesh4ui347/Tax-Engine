'use client';

import { useQuery } from '@tanstack/react-query';
import { Company } from '@/types/api';
import { get } from '@/lib/api';

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: () => get<Company[]>('/companies'),
  });
}
