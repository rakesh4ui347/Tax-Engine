'use client';

/**
 * PayrollWidget — Embeddable component for partner platforms.
 *
 * Usage (iframe embed):
 *   <iframe src="https://payroll.yourplatform.com/embed/widget?companyId=xxx&apiKey=pk_live_xxx" />
 *
 * Usage (React embed with same-origin API key):
 *   <PayrollWidget companyId="xxx" apiKey="pk_live_xxx" theme="light" />
 */

import { useEffect, useState } from 'react';
import axios from 'axios';

interface PayrollSummary {
  lastRunDate: string;
  lastRunStatus: string;
  totalGross: number;
  totalNet: number;
  employeeCount: number;
  pendingApprovals: number;
}

interface PayrollWidgetProps {
  companyId: string;
  apiKey: string;
  apiBaseUrl?: string;
  theme?: 'light' | 'dark';
  onRunClick?: (runId: string) => void;
}

export function PayrollWidget({
  companyId,
  apiKey,
  apiBaseUrl = 'http://localhost:3000/api/v1',
  theme = 'light',
  onRunClick,
}: PayrollWidgetProps) {
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = axios.create({
      baseURL: apiBaseUrl,
      headers: { 'x-api-key': apiKey },
    });

    client
      .get(`/companies/${companyId}/payroll/runs`, {
        params: { limit: 1, status: 'COMPLETED' },
      })
      .then(({ data }) => {
        const run = data.data?.[0];
        setSummary({
          lastRunDate: run?.payDate ?? '—',
          lastRunStatus: run?.status ?? '—',
          totalGross: run?.totalGross ?? 0,
          totalNet: run?.totalNet ?? 0,
          employeeCount: data.meta?.employeeCount ?? 0,
          pendingApprovals: data.meta?.pendingApprovals ?? 0,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId, apiKey, apiBaseUrl]);

  const isDark = theme === 'dark';
  const bg = isDark ? '#1e293b' : '#ffffff';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';
  const accent = '#3b82f6';

  if (loading) {
    return (
      <div
        style={{
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 12,
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          minWidth: 280,
        }}
      >
        <div style={{ color: muted, fontSize: 14 }}>Loading payroll data…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: bg,
          border: `1px solid #fca5a5`,
          borderRadius: 12,
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          minWidth: 280,
        }}
      >
        <div style={{ color: '#ef4444', fontSize: 14 }}>Failed to load: {error}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: 20,
        fontFamily: 'system-ui, sans-serif',
        minWidth: 280,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: text }}>Payroll Overview</span>
        <span
          style={{
            fontSize: 11,
            background: summary?.lastRunStatus === 'COMPLETED' ? '#dcfce7' : '#fef9c3',
            color: summary?.lastRunStatus === 'COMPLETED' ? '#16a34a' : '#ca8a04',
            padding: '2px 8px',
            borderRadius: 20,
            fontWeight: 500,
          }}
        >
          {summary?.lastRunStatus ?? '—'}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <StatBox label="Gross Pay" value={`$${(summary?.totalGross ?? 0).toLocaleString()}`} color={text} muted={muted} bg={isDark ? '#0f172a' : '#f8fafc'} />
        <StatBox label="Net Pay" value={`$${(summary?.totalNet ?? 0).toLocaleString()}`} color={text} muted={muted} bg={isDark ? '#0f172a' : '#f8fafc'} />
        <StatBox label="Employees" value={String(summary?.employeeCount ?? 0)} color={text} muted={muted} bg={isDark ? '#0f172a' : '#f8fafc'} />
        <StatBox label="Pending" value={String(summary?.pendingApprovals ?? 0)} color={summary?.pendingApprovals ? '#f59e0b' : text} muted={muted} bg={isDark ? '#0f172a' : '#f8fafc'} />
      </div>

      {/* Last run */}
      <div style={{ borderTop: `1px solid ${border}`, paddingTop: 12 }}>
        <span style={{ fontSize: 11, color: muted }}>
          Last run: {summary?.lastRunDate ? new Date(summary.lastRunDate).toLocaleDateString() : '—'}
        </span>
      </div>

      {/* CTA */}
      <button
        onClick={() => onRunClick?.('latest')}
        style={{
          marginTop: 12,
          width: '100%',
          background: accent,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '8px 0',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        View Payroll Dashboard →
      </button>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
  muted,
  bg,
}: {
  label: string;
  value: string;
  color: string;
  muted: string;
  bg: string;
}) {
  return (
    <div style={{ background: bg, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 11, color: muted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}
