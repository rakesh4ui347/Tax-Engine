'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CompanyForm } from '@/components/companies/CompanyForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Company, CreateCompanyDto } from '@/types/api';
import { post } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewCompanyPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const { success, error } = useToast();

  const organizationId = session?.user?.organizationId ?? '';

  const { mutateAsync: createCompany, isPending } = useMutation({
    mutationFn: (dto: CreateCompanyDto) => post<Company>('/companies', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });

  const handleSubmit = async (data: CreateCompanyDto) => {
    try {
      const company = await createCompany(data);
      success('Company onboarded', `${company.name} has been added.`);
      router.push(`/companies/${company.id}`);
    } catch {
      error('Failed to create company', 'Check the details and try again.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Onboard New Company"
        description="Register a new employer entity for payroll processing"
        breadcrumbs={[{ label: 'Companies', href: '/companies' }, { label: 'New Company' }]}
        actions={
          <Link href="/companies">
            <Button variant="secondary" icon={ArrowLeft}>Back</Button>
          </Link>
        }
      />

      <div className="px-6 py-6 max-w-3xl">
        <Card padding="lg">
          <CompanyForm
            organizationId={organizationId}
            onSubmit={handleSubmit}
            isSubmitting={isPending}
            submitLabel="Onboard Company"
          />
        </Card>
      </div>
    </div>
  );
}
