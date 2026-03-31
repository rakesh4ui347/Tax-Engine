/**
 * Embeddable pay stub page — designed for iframe embedding by partner platforms.
 *
 * URL: /embed/pay-stub/{payStubId}?apiKey=pk_live_xxx&theme=light|dark&company=Acme+Corp
 *
 * This page has NO navigation shell — it renders just the pay stub component.
 */

import { EmployeePayStub } from '@/components/embed/EmployeePayStub';

interface PageProps {
  params: { id: string };
  searchParams: { apiKey?: string; theme?: 'light' | 'dark'; company?: string };
}

export default function EmbedPayStubPage({ params, searchParams }: PageProps) {
  const { apiKey, theme = 'light', company } = searchParams;

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <p className="text-red-500 font-medium">Missing required parameter: apiKey</p>
          <p className="text-gray-500 text-sm mt-1">
            Append <code className="bg-gray-100 px-1 rounded">?apiKey=pk_live_xxx</code> to the URL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}
    >
      <EmployeePayStub
        payStubId={params.id}
        apiKey={apiKey}
        theme={theme}
        companyName={company ? decodeURIComponent(company) : undefined}
      />
      <p className={`text-center text-xs mt-4 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
        Powered by Payroll Tax Engine
      </p>
    </div>
  );
}
