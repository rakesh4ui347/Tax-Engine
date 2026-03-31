'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { Company } from '@/types/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Building2, Plus, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function CompaniesPage() {
  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => get<Company[]>('/companies'),
  });

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Manage your employer entities and their configurations"
        actions={
          <Link href="/companies/new">
            <Button icon={Plus}>Onboard Company</Button>
          </Link>
        }
      />

      <div className="px-6 py-6">
        {isLoading ? (
          <PageLoader />
        ) : !companies || companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No companies onboarded"
            description="Add your first company to start running payroll"
            action={
              <Link href="/companies/new">
                <Button icon={Plus}>Onboard Company</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies?.map((company) => (
              <Link key={company.id} href={`/companies/${company.id}`}>
                <div className="bg-white rounded-xl border border-slate-100 shadow-card hover:shadow-card-hover transition p-5 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary-600" />
                    </div>
                    <Badge variant="success" dot>Active</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-0.5">{company.name}</h3>
                  <p className="text-xs text-slate-400 mb-3">EIN: {company.ein}</p>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-50">
                    <span>
                      {company.city}, {company.state}
                    </span>
                    <span className="flex items-center gap-1 text-primary-500 group-hover:text-primary-700">
                      View <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
