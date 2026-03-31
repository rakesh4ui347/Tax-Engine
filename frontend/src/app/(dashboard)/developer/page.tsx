'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { ApiKeyManager } from '@/components/developer/ApiKeyManager';
import { Badge } from '@/components/ui/Badge';
import { ExternalLink, Code2, Webhook, Key, BookOpen } from 'lucide-react';
import Link from 'next/link';

const SCOPES = [
  { id: 'payroll:read', label: 'Payroll Read', description: 'Read payroll runs and pay stubs' },
  { id: 'payroll:write', label: 'Payroll Write', description: 'Create and submit payroll runs' },
  { id: 'employees:read', label: 'Employees Read', description: 'Read employee profiles' },
  { id: 'employees:write', label: 'Employees Write', description: 'Create and update employees' },
  { id: 'reporting:read', label: 'Reporting Read', description: 'Access reports and exports' },
  { id: 'webhooks:manage', label: 'Webhooks Manage', description: 'Configure webhook endpoints' },
];

export default function DeveloperPage() {
  const [activeTab, setActiveTab] = useState<'keys' | 'scopes' | 'quickstart'>('keys');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer Portal"
        subtitle="Integrate payroll into your platform via REST API"
        actions={
          <a
            href="http://localhost:3000/api/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <BookOpen className="h-4 w-4" />
            Swagger Docs
            <ExternalLink className="h-3 w-3" />
          </a>
        }
      />

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 flex items-start gap-3 hover:border-blue-500 transition-colors cursor-pointer">
          <Key className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">API Keys</p>
            <p className="text-xs text-gray-500">Manage your authentication tokens</p>
          </div>
        </Card>
        <Link href="/developer/webhooks">
          <Card className="p-4 flex items-start gap-3 hover:border-blue-500 transition-colors cursor-pointer">
            <Webhook className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Webhooks</p>
              <p className="text-xs text-gray-500">Configure real-time event delivery</p>
            </div>
          </Card>
        </Link>
        <Card className="p-4 flex items-start gap-3 hover:border-blue-500 transition-colors cursor-pointer">
          <Code2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">Code Samples</p>
            <p className="text-xs text-gray-500">Quickstart examples in multiple languages</p>
          </div>
        </Card>
      </div>

      {/* Tab nav */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {[
            { key: 'keys', label: 'API Keys' },
            { key: 'scopes', label: 'Scopes Reference' },
            { key: 'quickstart', label: 'Quickstart' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tabs content */}
      {activeTab === 'keys' && <ApiKeyManager />}

      {activeTab === 'scopes' && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Available API Scopes</h3>
          <div className="divide-y divide-gray-100">
            {SCOPES.map((scope) => (
              <div key={scope.id} className="flex items-center justify-between py-3">
                <div>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{scope.id}</code>
                  <p className="text-sm text-gray-600 mt-1">{scope.description}</p>
                </div>
                <Badge variant="secondary">{scope.label}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'quickstart' && (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">1. Authenticate with your API key</h3>
            <pre className="bg-gray-900 text-green-400 rounded-md p-4 text-xs overflow-x-auto">
{`curl -X GET https://api.payrolltaxengine.com/api/v1/companies \\
  -H "x-api-key: pk_live_your_key_here" \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">2. Create a payroll run</h3>
            <pre className="bg-gray-900 text-green-400 rounded-md p-4 text-xs overflow-x-auto">
{`curl -X POST https://api.payrolltaxengine.com/api/v1/companies/{companyId}/payroll/runs \\
  -H "x-api-key: pk_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "periodStart": "2024-01-01",
    "periodEnd": "2024-01-15",
    "payDate": "2024-01-19",
    "payFrequency": "BIWEEKLY",
    "idempotencyKey": "run-2024-01-19"
  }'`}
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">3. Calculate and retrieve pay stubs</h3>
            <pre className="bg-gray-900 text-green-400 rounded-md p-4 text-xs overflow-x-auto">
{`# Trigger calculation
curl -X POST https://api.payrolltaxengine.com/api/v1/companies/{companyId}/payroll/runs/{runId}/calculate \\
  -H "x-api-key: pk_live_your_key_here"

# Get pay stubs with tax breakdown
curl -X GET https://api.payrolltaxengine.com/api/v1/companies/{companyId}/payroll/runs/{runId}/paystubs \\
  -H "x-api-key: pk_live_your_key_here"`}
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">4. TypeScript SDK (direct API calls)</h3>
            <pre className="bg-gray-900 text-blue-300 rounded-md p-4 text-xs overflow-x-auto">
{`import axios from 'axios';

const payroll = axios.create({
  baseURL: 'https://api.payrolltaxengine.com/api/v1',
  headers: { 'x-api-key': process.env.PAYROLL_API_KEY },
});

// Create a run
const { data: run } = await payroll.post(\`/companies/\${companyId}/payroll/runs\`, {
  periodStart: '2024-01-01',
  periodEnd: '2024-01-15',
  payDate: '2024-01-19',
  payFrequency: 'BIWEEKLY',
});

// Calculate
await payroll.post(\`/companies/\${companyId}/payroll/runs/\${run.id}/calculate\`);`}
            </pre>
          </div>
        </Card>
      )}
    </div>
  );
}
