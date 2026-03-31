'use client';

import { useRouter } from 'next/navigation';
import { useCreateEmployee } from '@/hooks/useEmployees';
import { useCompanies } from '@/hooks/useCompanies';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { CreateEmployeeDto } from '@/types/api';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewEmployeePage() {
  const router = useRouter();
  const { data: companies } = useCompanies();
  const companyId = companies?.[0]?.id;
  const { mutateAsync: createEmployee, isPending } = useCreateEmployee(companyId);
  const { success, error } = useToast();

  const handleSubmit = async (data: CreateEmployeeDto) => {
    try {
      const employee = await createEmployee(data);
      success('Employee created', `${employee.firstName} ${employee.lastName} has been added.`);
      router.push(`/employees/${employee.id}?companyId=${companyId}`);
    } catch {
      error('Failed to create employee', 'Please check the form and try again.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Add New Employee"
        description="Create a new employee record with compensation and tax details"
        breadcrumbs={[{ label: 'Employees', href: '/employees' }, { label: 'New Employee' }]}
        actions={
          <Link href="/employees">
            <Button variant="secondary" icon={ArrowLeft}>Back</Button>
          </Link>
        }
      />

      <div className="px-6 py-6 max-w-3xl">
        <Card padding="lg">
          <EmployeeForm
            companyId={companyId}
            onSubmit={handleSubmit}
            isSubmitting={isPending}
            submitLabel="Create Employee"
          />
        </Card>
      </div>
    </div>
  );
}
