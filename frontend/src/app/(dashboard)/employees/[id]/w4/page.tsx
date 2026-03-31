'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEmployee, useW4Profile, useUpdateW4 } from '@/hooks/useEmployees';
import { useCompanies } from '@/hooks/useCompanies';
import { W4Form } from '@/components/employees/W4Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { UpdateW4Dto } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';

export default function W4Page() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { data: companies } = useCompanies();
  const companyId = searchParams.get('companyId') ?? companies?.[0]?.id;
  const { data: emp, isLoading: empLoading } = useEmployee(id, companyId);
  const { data: w4, isLoading: w4Loading } = useW4Profile(id, companyId);
  const { mutateAsync: updateW4, isPending } = useUpdateW4(id, companyId);
  const { success, error } = useToast();

  if (empLoading || w4Loading) return <PageLoader />;

  const handleSubmit = async (data: UpdateW4Dto) => {
    try {
      await updateW4(data);
      success('W-4 updated', 'Tax withholding profile has been saved.');
    } catch {
      error('Failed to update W-4', 'Please try again.');
    }
  };

  return (
    <div>
      <PageHeader
        title="W-4 Federal Tax Withholding"
        description={`Configure federal income tax withholding for ${emp?.firstName} ${emp?.lastName}`}
        breadcrumbs={[
          { label: 'Employees', href: '/employees' },
          { label: `${emp?.firstName} ${emp?.lastName}`, href: `/employees/${id}?companyId=${companyId}` },
          { label: 'W-4' },
        ]}
        actions={
          <Link href={`/employees/${id}?companyId=${companyId}`}>
            <Button variant="secondary" icon={ArrowLeft}>Back</Button>
          </Link>
        }
      />

      <div className="px-6 py-6 max-w-2xl space-y-5">
        {w4 && (
          <div className="flex items-center gap-3 p-4 bg-primary-50 border border-primary-100 rounded-xl text-sm">
            <Info className="w-4 h-4 text-primary-500 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-primary-700">
                Current effective W-4 from <strong>{formatDate(w4.effectiveDate)}</strong>
              </span>
              <Badge variant="primary">{w4.filingStatus.replace(/_/g, ' ')}</Badge>
              {w4.exemptFromFIT && <Badge variant="warning">EXEMPT</Badge>}
            </div>
          </div>
        )}

        <Card padding="lg">
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-900">
              Employee's Withholding Certificate
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Form W-4 (2024) — Department of the Treasury, Internal Revenue Service
            </p>
          </div>
          <W4Form
            defaultValues={w4 ?? undefined}
            onSubmit={handleSubmit}
            isSubmitting={isPending}
          />
        </Card>
      </div>
    </div>
  );
}
