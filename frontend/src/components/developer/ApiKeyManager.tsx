'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiKeysApi } from '@/lib/api-keys';
import { ApiKey, ApiKeyScope, CreateApiKeyDto } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import {
  Plus, Trash2, Copy, Key, Check, RefreshCw, Activity,
  Shield, Globe, Clock, Wifi,
} from 'lucide-react';

const ALL_SCOPES: ApiKeyScope[] = [
  'payroll:read', 'payroll:write',
  'employees:read', 'employees:write',
  'reporting:read', 'webhooks:manage', 'admin',
];

const SCOPE_DESCRIPTIONS: Record<ApiKeyScope, string> = {
  'payroll:read': 'View payroll runs and pay stubs',
  'payroll:write': 'Create and submit payroll runs',
  'employees:read': 'View employee records',
  'employees:write': 'Create and update employees',
  'reporting:read': 'Access reports and tax filings',
  'webhooks:manage': 'Configure webhook endpoints',
  'admin': 'Full access (supersedes all other scopes)',
};

type CreateFormState = {
  name: string;
  description: string;
  environment: 'live' | 'test';
  scopes: ApiKeyScope[];
  allowedIps: string;
  expiresAt: string;
};

const defaultForm = (): CreateFormState => ({
  name: '',
  description: '',
  environment: 'live',
  scopes: ['payroll:read', 'employees:read'],
  allowedIps: '',
  expiresAt: '',
});

export function ApiKeyManager() {
  const qc = useQueryClient();
  const { success, error } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [rotateId, setRotateId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<CreateFormState>(defaultForm());

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: apiKeysApi.list,
  });

  const { mutateAsync: createKey, isPending: creating } = useMutation({
    mutationFn: (dto: CreateApiKeyDto) => apiKeysApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const { mutateAsync: revokeKey, isPending: revoking } = useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const { mutateAsync: rotateKey, isPending: rotating } = useMutation({
    mutationFn: (id: string) => apiKeysApi.rotate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const handleCreate = async () => {
    if (!form.name.trim() || form.scopes.length === 0) return;
    try {
      const dto: CreateApiKeyDto = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        scopes: form.scopes,
        environment: form.environment,
        expiresAt: form.expiresAt || undefined,
        allowedIps: form.allowedIps
          ? form.allowedIps.split(',').map((ip) => ip.trim()).filter(Boolean)
          : undefined,
      };
      const result = await createKey(dto);
      setRawKey(result.rawKey);
      setShowCreate(false);
      setForm(defaultForm());
      success('API key created', 'Copy your key now — it will only be shown once.');
    } catch {
      error('Failed to create API key');
    }
  };

  const handleRevoke = async () => {
    if (!deleteId) return;
    try {
      await revokeKey(deleteId);
      success('API key revoked');
      setDeleteId(null);
    } catch {
      error('Failed to revoke API key');
    }
  };

  const handleRotate = async () => {
    if (!rotateId) return;
    try {
      const result = await rotateKey(rotateId);
      setRotateId(null);
      setRawKey(result.rawKey);
      success('API key rotated', 'A new key has been generated. Copy it now.');
    } catch {
      error('Failed to rotate API key');
    }
  };

  const handleCopy = async () => {
    if (rawKey) {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleScope = (scope: ApiKeyScope) => {
    setForm((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const isExpired = (key: ApiKey) =>
    key.expiresAt ? new Date(key.expiresAt) < new Date() : false;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">API Keys</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Machine-to-machine authentication for platform integrations
          </p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setShowCreate(true)}>
          Create API Key
        </Button>
      </div>

      {/* Key List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !keys || keys.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl">
          <Key className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">No API keys yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Create your first key to integrate with the API
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key: ApiKey) => {
            const expired = isExpired(key);
            const status = !key.isActive ? 'revoked' : expired ? 'expired' : 'active';
            return (
              <div
                key={key.id}
                className="p-4 bg-white border border-slate-100 rounded-xl space-y-3"
              >
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Key className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900">{key.name}</p>
                      <Badge
                        variant={status === 'active' ? 'success' : status === 'expired' ? 'warning' : 'default'}
                        dot
                      >
                        {status === 'active' ? 'Active' : status === 'expired' ? 'Expired' : 'Revoked'}
                      </Badge>
                      <Badge variant={key.environment === 'live' ? 'primary' : 'default'}>
                        {key.environment === 'live' ? 'Live' : 'Test'}
                      </Badge>
                    </div>
                    {key.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{key.description}</p>
                    )}
                    <p className="text-xs font-mono text-slate-400 mt-1">{key.keyPrefix}••••••••</p>
                  </div>
                  {/* Actions */}
                  {key.isActive && !expired && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={RefreshCw}
                        title="Rotate key"
                        className="text-slate-400 hover:text-primary-600"
                        onClick={() => setRotateId(key.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        title="Revoke key"
                        className="text-slate-400 hover:text-danger-600"
                        onClick={() => setDeleteId(key.id)}
                      />
                    </div>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400 pl-12">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {(key.requestCount ?? 0).toLocaleString()} requests
                  </span>
                  {key.lastUsedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last used {formatDate(key.lastUsedAt)}
                    </span>
                  )}
                  {key.expiresAt && (
                    <span className={`flex items-center gap-1 ${expired ? 'text-danger-500' : ''}`}>
                      <Globe className="w-3 h-3" />
                      {expired ? 'Expired' : 'Expires'} {formatDate(key.expiresAt)}
                    </span>
                  )}
                  {key.allowedIps && key.allowedIps.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Wifi className="w-3 h-3" />
                      {key.allowedIps.length} IP{key.allowedIps.length > 1 ? 's' : ''} allowlisted
                    </span>
                  )}
                </div>

                {/* Scopes */}
                <div className="flex flex-wrap gap-1 pl-12">
                  {key.scopes.map((scope) => (
                    <span
                      key={scope}
                      className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                        scope === 'admin'
                          ? 'bg-danger-50 text-danger-700'
                          : 'bg-primary-50 text-primary-700'
                      }`}
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raw key display (shown once after creation/rotation) */}
      {rawKey && (
        <Modal
          open={!!rawKey}
          onClose={() => setRawKey(null)}
          title="Save Your API Key"
          size="md"
          footer={
            <Button variant="secondary" onClick={() => setRawKey(null)}>
              I've saved my key
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg text-sm text-warning-800">
              <strong>Save this key now.</strong> For security, it will not be shown again.
            </div>
            <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-lg">
              <code className="flex-1 text-xs font-mono text-green-400 break-all">{rawKey}</code>
              <button
                onClick={handleCopy}
                className="text-slate-400 hover:text-white transition flex-shrink-0 p-1"
              >
                {copied ? <Check className="w-4 h-4 text-success-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Use this key in the <code className="font-mono bg-slate-100 px-1 rounded">X-API-Key</code> request header.
            </p>
          </div>
        </Modal>
      )}

      {/* Create Key Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setForm(defaultForm()); }}
        title="Create API Key"
        description="Configure your new API key with the permissions and restrictions it needs"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm(defaultForm()); }}>
              Cancel
            </Button>
            <Button
              loading={creating}
              onClick={handleCreate}
              disabled={!form.name.trim() || form.scopes.length === 0}
            >
              Create Key
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Name + Description */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Key Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Production Integration"
              required
            />
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Optional — what is this key for?"
            />
          </div>

          {/* Environment */}
          <div>
            <label className="label-base mb-2 block">Environment</label>
            <div className="flex gap-3">
              {(['live', 'test'] as const).map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, environment: env }))}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition ${
                    form.environment === env
                      ? env === 'live'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-slate-400 bg-slate-100 text-slate-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {env === 'live' ? 'Live' : 'Test'}
                  <span className="block text-xs font-normal mt-0.5 opacity-70">
                    {env === 'live' ? 'Real data & billing' : 'Safe for testing'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Scopes */}
          <div>
            <label className="label-base mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Permissions (Scopes)
            </label>
            <div className="space-y-1.5">
              {ALL_SCOPES.map((scope) => (
                <label
                  key={scope}
                  className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-100"
                >
                  <input
                    type="checkbox"
                    checked={form.scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-mono font-medium ${scope === 'admin' ? 'text-danger-700' : 'text-slate-800'}`}>
                      {scope}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">{SCOPE_DESCRIPTIONS[scope]}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Expiry Date"
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
              hint="Leave blank for no expiry"
            />
            <Input
              label="IP Allowlist"
              value={form.allowedIps}
              onChange={(e) => setForm((p) => ({ ...p, allowedIps: e.target.value }))}
              placeholder="e.g., 203.0.113.0, 198.51.100.0"
              hint="Comma-separated IPs. Leave blank to allow all."
            />
          </div>
        </div>
      </Modal>

      {/* Rotate Confirm */}
      <ConfirmDialog
        open={!!rotateId}
        onClose={() => setRotateId(null)}
        onConfirm={handleRotate}
        title="Rotate API Key"
        description="A new secret will be generated and the current key will be immediately revoked. Update all integrations before closing the dialog."
        confirmLabel="Rotate Key"
        loading={rotating}
      />

      {/* Revoke Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleRevoke}
        title="Revoke API Key"
        description="This key will be permanently disabled. Any integrations using it will stop working immediately."
        confirmLabel="Revoke Key"
        loading={revoking}
      />
    </div>
  );
}
