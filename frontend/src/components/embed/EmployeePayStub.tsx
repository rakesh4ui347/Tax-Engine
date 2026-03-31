'use client';

/**
 * EmployeePayStub — Embeddable pay stub viewer for partner platforms.
 *
 * Can be rendered inside an <iframe> via /embed/pay-stub/[id]
 * or imported as a React component in same-origin apps.
 */

import { useEffect, useState } from 'react';
import axios from 'axios';

interface TaxLine {
  taxCode: string;
  description: string;
  taxableWage: number;
  amount: number;
  isEmployee: boolean;
}

interface DeductionLine {
  code: string;
  description: string;
  amount: number;
  preTax: boolean;
}

interface PayStub {
  id: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  payrollRun: {
    periodStart: string;
    periodEnd: string;
    payDate: string;
  };
  grossPay: number;
  netPay: number;
  regularPay: number;
  overtimePay: number;
  bonusPay: number;
  totalEmployeeTax: number;
  totalDeductions: number;
  ytdGross: number;
  ytdTax: number;
  ytdNet: number;
  taxLines: TaxLine[];
  deductionLines: DeductionLine[];
}

interface EmployeePayStubProps {
  payStubId: string;
  apiKey: string;
  apiBaseUrl?: string;
  theme?: 'light' | 'dark';
  companyName?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export function EmployeePayStub({
  payStubId,
  apiKey,
  apiBaseUrl = 'http://localhost:3000/api/v1',
  theme = 'light',
  companyName = 'Your Company',
}: EmployeePayStubProps) {
  const [stub, setStub] = useState<PayStub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get(`${apiBaseUrl}/paystubs/${payStubId}`, {
        headers: { 'x-api-key': apiKey },
      })
      .then(({ data }) => setStub(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [payStubId, apiKey, apiBaseUrl]);

  const isDark = theme === 'dark';
  const styles = {
    bg: isDark ? '#1e293b' : '#fff',
    text: isDark ? '#f1f5f9' : '#0f172a',
    muted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    sectionBg: isDark ? '#0f172a' : '#f8fafc',
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: styles.muted, fontFamily: 'system-ui' }}>
        Loading pay stub…
      </div>
    );
  }
  if (error || !stub) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontFamily: 'system-ui' }}>
        {error ?? 'Pay stub not found'}
      </div>
    );
  }

  const employeeTaxLines = stub.taxLines.filter((l) => l.isEmployee);
  const employerTaxLines = stub.taxLines.filter((l) => !l.isEmployee);

  return (
    <div
      style={{
        background: styles.bg,
        color: styles.text,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        maxWidth: 680,
        margin: '0 auto',
        border: `1px solid ${styles.border}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ background: '#1d4ed8', color: '#fff', padding: '20px 24px' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{companyName}</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>EARNINGS STATEMENT</div>
      </div>

      {/* Employee + period info */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          padding: '16px 24px',
          borderBottom: `1px solid ${styles.border}`,
          background: styles.sectionBg,
        }}
      >
        <div>
          <div style={{ color: styles.muted, fontSize: 11, marginBottom: 2 }}>EMPLOYEE</div>
          <div style={{ fontWeight: 600 }}>
            {stub.employee.firstName} {stub.employee.lastName}
          </div>
          <div style={{ color: styles.muted, fontSize: 11 }}>#{stub.employee.employeeNumber}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: styles.muted, fontSize: 11, marginBottom: 2 }}>PAY PERIOD</div>
          <div>
            {new Date(stub.payrollRun.periodStart).toLocaleDateString()} –{' '}
            {new Date(stub.payrollRun.periodEnd).toLocaleDateString()}
          </div>
          <div style={{ color: styles.muted, fontSize: 11 }}>
            Pay Date: {new Date(stub.payrollRun.payDate).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Earnings */}
      <Section title="EARNINGS" bg={styles.sectionBg} border={styles.border}>
        <Row label="Regular Pay" amount={stub.regularPay} text={styles.text} muted={styles.muted} />
        {stub.overtimePay > 0 && <Row label="Overtime Pay" amount={stub.overtimePay} text={styles.text} muted={styles.muted} />}
        {stub.bonusPay > 0 && <Row label="Bonus / Other" amount={stub.bonusPay} text={styles.text} muted={styles.muted} />}
        <TotalRow label="Gross Pay" amount={stub.grossPay} />
      </Section>

      {/* Employee deductions */}
      <Section title="DEDUCTIONS (PRE-TAX)" bg={styles.bg} border={styles.border}>
        {stub.deductionLines.filter((d) => d.preTax).map((d) => (
          <Row key={d.code} label={d.description} amount={d.amount} text={styles.text} muted={styles.muted} />
        ))}
      </Section>

      {/* Employee taxes */}
      <Section title="TAXES (EMPLOYEE)" bg={styles.sectionBg} border={styles.border}>
        {employeeTaxLines.map((l) => (
          <Row key={l.taxCode} label={l.description} amount={l.amount} text={styles.text} muted={styles.muted} />
        ))}
        <TotalRow label="Total Employee Tax" amount={stub.totalEmployeeTax} />
      </Section>

      {/* Post-tax deductions */}
      {stub.deductionLines.filter((d) => !d.preTax).length > 0 && (
        <Section title="DEDUCTIONS (POST-TAX)" bg={styles.bg} border={styles.border}>
          {stub.deductionLines.filter((d) => !d.preTax).map((d) => (
            <Row key={d.code} label={d.description} amount={d.amount} text={styles.text} muted={styles.muted} />
          ))}
        </Section>
      )}

      {/* Net Pay */}
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${styles.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>NET PAY</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{fmt(stub.netPay)}</span>
        </div>
      </div>

      {/* Employer taxes (informational) */}
      {employerTaxLines.length > 0 && (
        <Section title="EMPLOYER TAXES (INFORMATIONAL)" bg={styles.bg} border={styles.border}>
          {employerTaxLines.map((l) => (
            <Row key={l.taxCode} label={l.description} amount={l.amount} text={styles.text} muted={styles.muted} />
          ))}
        </Section>
      )}

      {/* YTD */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 16,
          padding: '16px 24px',
          background: styles.sectionBg,
        }}
      >
        <YtdBox label="YTD Gross" value={stub.ytdGross} color={styles.text} muted={styles.muted} />
        <YtdBox label="YTD Tax" value={stub.ytdTax} color={styles.text} muted={styles.muted} />
        <YtdBox label="YTD Net" value={stub.ytdNet} color={styles.text} muted={styles.muted} />
      </div>
    </div>
  );
}

function Section({ title, children, bg, border }: { title: string; children: React.ReactNode; bg: string; border: string }) {
  return (
    <div style={{ padding: '12px 24px', background: bg, borderBottom: `1px solid ${border}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#6b7280', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, amount, text, muted }: { label: string; amount: number; text: string; muted: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: text }}>
      <span style={{ color: muted }}>{label}</span>
      <span>{fmt(amount)}</span>
    </div>
  );
}

function TotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 0 3px',
        marginTop: 4,
        borderTop: '1px solid #e2e8f0',
        fontWeight: 600,
      }}
    >
      <span>{label}</span>
      <span>{fmt(amount)}</span>
    </div>
  );
}

function YtdBox({ label, value, color, muted }: { label: string; value: number; color: string; muted: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: muted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color }}>{fmt(value)}</div>
    </div>
  );
}
