'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Company } from '@/types/api';
import { get } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import { MapPin, Globe, Edit, ArrowLeft, Building2 } from 'lucide-react';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading } = useQuery({
    queryKey: ['companies', id],
    queryFn: () => get<Company>(`/companies/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <PageLoader />;
  if (!company) return null;

  return (
    <div>
      <PageHeader
        title={company.name}
        description={`EIN: ${company.ein} · Pay Frequency: ${company.payFrequency}`}
        breadcrumbs={[
          { label: 'Companies', href: '/companies' },
          { label: company.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/companies">
              <Button variant="secondary" size="sm" icon={ArrowLeft}>Back</Button>
            </Link>
            <Link href={`/companies/${id}/states`}>
              <Button variant="secondary" size="sm" icon={Globe}>
                State Config
              </Button>
            </Link>
            <Button size="sm" icon={Edit}>Edit</Button>
          </div>
        }
      />

      <div className="px-6 py-6 grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-5xl">
        <Card padding="md">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            Business Information
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-xs text-slate-400">Company Name</dt>
              <dd className="text-sm font-medium text-slate-900">{company.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-xs text-slate-400">EIN</dt>
              <dd className="text-sm font-mono text-slate-700">{company.ein}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-xs text-slate-400">Email</dt>
              <dd className="text-sm text-slate-700">{company.email}</dd>
            </div>
            {company.phone && (
              <div className="flex justify-between">
                <dt className="text-xs text-slate-400">Phone</dt>
                <dd className="text-sm text-slate-700">{company.phone}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-xs text-slate-400">Pay Frequency</dt>
              <dd className="text-sm text-slate-700">{company.payFrequency}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-xs text-slate-400">Created</dt>
              <dd className="text-sm text-slate-500">{formatDate(company.createdAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card padding="md">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            Business Address
          </h3>
          <div className="text-sm text-slate-700 space-y-1">
            <p className="font-medium">{company.addressLine1}</p>
            {company.addressLine2 && <p>{company.addressLine2}</p>}
            <p>{company.city}, {company.state} {company.zip}</p>
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            State Registrations
          </h3>
          {company.companyStates && company.companyStates.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {company.companyStates.map((sr) => (
                <span
                  key={sr.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-700"
                >
                  {sr.state}
                  {sr.suiRate && (
                    <span className="text-slate-400">· SUI {sr.suiRate}%</span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No state registrations configured.</p>
          )}
          <Link href={`/companies/${id}/states`}>
            <Button variant="secondary" size="sm" className="mt-4">
              Manage States
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
