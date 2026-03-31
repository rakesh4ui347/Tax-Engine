'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Webhook, Plus, Trash2, CheckCircle, XCircle, Globe } from 'lucide-react';

const WEBHOOK_EVENTS = [
  'PAYROLL_RUN_CREATED',
  'PAYROLL_RUN_APPROVED',
  'PAYROLL_RUN_COMPLETED',
  'PAYROLL_RUN_FAILED',
  'EMPLOYEE_CREATED',
  'EMPLOYEE_UPDATED',
  'TAX_FILING_SUBMITTED',
] as const;

const webhookSchema = z.object({
  url: z.string().url('Must be a valid HTTPS URL'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
});

type WebhookFormData = z.infer<typeof webhookSchema>;

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

export function WebhookConfig() {
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const companyId = 'current'; // pulled from session in real app

  const { data: webhooks, isLoading } = useQuery<WebhookEndpoint[]>({
    queryKey: ['webhooks', companyId],
    queryFn: () => api.get(`/companies/${companyId}/webhooks`).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: WebhookFormData) =>
      api.post(`/companies/${companyId}/webhooks`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', companyId] });
      setShowCreate(false);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (webhookId: string) =>
      api.delete(`/companies/${companyId}/webhooks/${webhookId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', companyId] });
      setDeleteId(null);
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: '', events: [] },
  });

  const selectedEvents = watch('events');

  const toggleEvent = (event: string) => {
    const current = selectedEvents ?? [];
    setValue(
      'events',
      current.includes(event) ? current.filter((e) => e !== event) : [...current, event],
    );
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Endpoint
        </Button>
      </div>

      {!webhooks?.length ? (
        <EmptyState
          icon={Webhook}
          title="No webhook endpoints"
          description="Add an endpoint to receive real-time payroll event notifications."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Endpoint
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <Card key={wh.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <Globe className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-gray-900 truncate">{wh.url}</code>
                      {wh.isActive ? (
                        <Badge variant="success" className="shrink-0">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="danger" className="shrink-0">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {wh.events.map((evt) => (
                        <span
                          key={evt}
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono"
                        >
                          {evt}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Created {new Date(wh.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 shrink-0"
                  onClick={() => setDeleteId(wh.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Webhook payload signing note */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Payload Signing:</strong> All webhook deliveries include a{' '}
          <code className="bg-amber-100 px-1 rounded">X-Payroll-Signature</code> header containing an
          HMAC-SHA256 signature of the payload. Verify this signature using your webhook secret before
          processing events.
        </p>
        <pre className="mt-2 text-xs bg-amber-100 rounded p-2 text-amber-900 overflow-x-auto">
{`const crypto = require('crypto');
const sig = req.headers['x-payroll-signature'];
const computed = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');
if (sig !== computed) throw new Error('Invalid signature');`}
        </pre>
      </Card>

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); reset(); }}
        title="Add Webhook Endpoint"
      >
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
            <Input
              {...register('url')}
              placeholder="https://yourapp.com/webhooks/payroll"
              error={errors.url?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Events to Subscribe</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {WEBHOOK_EVENTS.map((evt) => (
                <label key={evt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEvents?.includes(evt) ?? false}
                    onChange={() => toggleEvent(evt)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-mono text-gray-700">{evt}</span>
                </label>
              ))}
            </div>
            {errors.events && (
              <p className="text-xs text-red-500 mt-1">{errors.events.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create Endpoint
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Webhook"
        description="This endpoint will stop receiving events. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
