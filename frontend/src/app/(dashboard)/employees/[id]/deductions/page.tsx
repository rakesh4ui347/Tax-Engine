'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useEmployee, useEmployeeDeductions, useCreateDeduction, useDeleteDeduction } from '@/hooks/useEmployees';
import { useCompanies } from '@/hooks/useCompanies';
import { DeductionForm } from '@/components/employees/DeductionForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { CreateDeductionDto } from '@/types/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Trash2, ArrowLeft, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function DeductionsPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { data: companies } = useCompanies();
  const companyId = searchParams.get('companyId') ?? companies?.[0]?.id;
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: emp } = useEmployee(id, companyId);
  const { data: deductions, isLoading } = useEmployeeDeductions(id, companyId);
  const { mutateAsync: createDeduction, isPending: creating } = useCreateDeduction(id, companyId);
  const { mutateAsync: deleteDeduction, isPending: deleting } = useDeleteDeduction(id, companyId);
  const { success, error } = useToast();

  if (isLoading) return <PageLoader />;

  const handleCreate = async (data: CreateDeductionDto) => {
    try {
      await createDeduction(data);
      success('Deduction added', 'Will apply starting next pay period.');
      setShowAddModal(false);
    } catch {
      error('Failed to add deduction', 'Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDeduction(deleteId);
      success('Deduction removed');
      setDeleteId(null);
    } catch {
      error('Failed to remove deduction');
    }
  };

  return (
    <div>
      <PageHeader
        title="Deductions"
        description={`Manage pre-tax and post-tax deductions for ${emp?.firstName} ${emp?.lastName}`}
        breadcrumbs={[
          { label: 'Employees', href: '/employees' },
          { label: `${emp?.firstName} ${emp?.lastName}`, href: `/employees/${id}?companyId=${companyId}` },
          { label: 'Deductions' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/employees/${id}?companyId=${companyId}`}>
              <Button variant="secondary" size="sm" icon={ArrowLeft}>Back</Button>
            </Link>
            <Button size="sm" icon={Plus} onClick={() => setShowAddModal(true)}>
              Add Deduction
            </Button>
          </div>
        }
      />

      <div className="px-6 py-6 max-w-3xl">
        {!deductions || deductions.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No deductions configured"
            description="Add pre-tax or post-tax deductions like 401(k), health insurance, or FSA contributions."
            action={
              <Button icon={Plus} onClick={() => setShowAddModal(true)}>
                Add First Deduction
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {deductions.map((d) => (
              <Card key={d.id} padding="md" className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {d.description || d.type.replace(/_/g, ' ')}
                    </p>
                    <Badge variant={d.isPercentage ? 'primary' : 'default'} className="text-xs">
                      {d.isPercentage ? `${d.percentage}%` : formatCurrency(d.amount ?? 0)}
                    </Badge>
                    <Badge variant={d.isActive ? 'success' : 'default'} dot>
                      {d.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>Effective: {formatDate(d.effectiveDate)}</span>
                    {d.endDate && <span>Ends: {formatDate(d.endDate)}</span>}
                    {d.maxAnnual && <span>Max: {formatCurrency(d.maxAnnual)}/yr</span>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  className="text-danger-400 hover:text-danger-600 hover:bg-danger-50"
                  onClick={() => setDeleteId(d.id)}
                />
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Deduction Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Deduction"
        description="Configure a new pre-tax or post-tax deduction"
        size="md"
      >
        <DeductionForm
          onSubmit={handleCreate}
          onCancel={() => setShowAddModal(false)}
          isSubmitting={creating}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remove Deduction"
        description="Are you sure you want to remove this deduction? It will no longer be applied to future payroll runs."
        confirmLabel="Remove"
        loading={deleting}
      />
    </div>
  );
}
