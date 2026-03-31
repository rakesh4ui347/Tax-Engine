'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CompanyState, CreateCompanyStateDto } from '@/types/api';
import { get, post, del } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { US_STATES } from '@/lib/utils';
import { Plus, Trash2, Globe, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const stateSchema = z.object({
  state: z.string().length(2, 'Select a state'),
  stateEin: z.string().optional(),
  suiRate: z.number().min(0).max(100).optional(),
});

type StateFormData = z.infer<typeof stateSchema>;
const stateOptions = US_STATES.map((s) => ({ value: s.code, label: `${s.code} — ${s.name}` }));

export default function CompanyStatesPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { success, error } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: states, isLoading } = useQuery({
    queryKey: ['companies', id, 'states'],
    queryFn: () => get<CompanyState[]>(`/companies/${id}/states`),
    enabled: !!id,
  });

  const { mutateAsync: addState, isPending: adding } = useMutation({
    mutationFn: (dto: CreateCompanyStateDto) => post<CompanyState>(`/companies/${id}/states`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies', id, 'states'] }),
  });

  const { mutateAsync: removeState, isPending: removing } = useMutation({
    mutationFn: (stateId: string) => del<void>(`/companies/${id}/states/${stateId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies', id, 'states'] }),
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<StateFormData>({
    resolver: zodResolver(stateSchema),
  });

  const handleAdd = async (data: StateFormData) => {
    try {
      await addState(data as CreateCompanyStateDto);
      success('State added', `${data.state} registration has been configured.`);
      setShowAdd(false);
      reset();
    } catch {
      error('Failed to add state registration');
    }
  };

  const handleRemove = async () => {
    if (!deleteId) return;
    try {
      await removeState(deleteId);
      success('State removed');
      setDeleteId(null);
    } catch {
      error('Failed to remove state');
    }
  };

  return (
    <div>
      <PageHeader
        title="State Registrations"
        description="Configure state tax registrations and SUI rates"
        breadcrumbs={[
          { label: 'Companies', href: '/companies' },
          { label: 'Company', href: `/companies/${id}` },
          { label: 'States' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/companies/${id}`}>
              <Button variant="secondary" size="sm" icon={ArrowLeft}>Back</Button>
            </Link>
            <Button size="sm" icon={Plus} onClick={() => setShowAdd(true)}>
              Add State
            </Button>
          </div>
        }
      />

      <div className="px-6 py-6 max-w-2xl">
        {!states || states.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            No state registrations. Add the states where you have employees.
          </div>
        ) : (
          <div className="space-y-3">
            {states.map((sr) => (
              <Card key={sr.id} padding="md" className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600 text-sm">
                  {sr.state}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 text-sm">
                      {US_STATES.find((s) => s.code === sr.state)?.name || sr.state}
                    </p>
                    <Badge variant={sr.isActive ? 'success' : 'default'} dot>
                      {sr.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    {sr.stateEin && <span>State EIN: {sr.stateEin}</span>}
                    {sr.suiRate !== undefined && <span>SUI Rate: {sr.suiRate}%</span>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  className="text-danger-400 hover:text-danger-600"
                  onClick={() => setDeleteId(sr.id)}
                />
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add State Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add State Registration"
        description="Configure tax registration for a new state"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button loading={adding} onClick={handleSubmit(handleAdd)}>Add State</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="State"
            options={stateOptions}
            placeholder="Select state..."
            {...register('state')}
            error={errors.state?.message}
          />
          <Input
            label="State EIN (optional)"
            {...register('stateEin')}
            placeholder="12-3456789"
          />
          <Input
            label="SUI Rate % (optional)"
            type="number"
            step="0.01"
            {...register('suiRate', { valueAsNumber: true })}
            error={errors.suiRate?.message}
            placeholder="2.70"
            hint="State Unemployment Insurance rate"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleRemove}
        title="Remove State Registration"
        description="This will remove the state tax configuration. Existing tax data will be preserved."
        confirmLabel="Remove"
        loading={removing}
      />
    </div>
  );
}
