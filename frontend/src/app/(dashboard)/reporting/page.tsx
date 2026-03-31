import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { FileText, DollarSign, Calendar, ChevronRight, FileCheck2, Calculator } from 'lucide-react';

const reports = [
  {
    href: '/reporting/register',
    title: 'Payroll Register',
    description: 'Detailed breakdown of every employee\'s pay for a period including hours, gross, taxes, and net pay.',
    icon: FileText,
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-600',
  },
  {
    href: '/reporting/tax-liability',
    title: 'Tax Liability Summary',
    description: 'Federal, state, and local tax liabilities by quarter with due dates and payment status.',
    icon: DollarSign,
    iconBg: 'bg-warning-50',
    iconColor: 'text-warning-600',
  },
  {
    href: '/reporting/ytd',
    title: 'Year-to-Date Summary',
    description: 'Employee YTD gross earnings, withholdings, deductions, and net pay for W-2 preparation.',
    icon: Calendar,
    iconBg: 'bg-success-50',
    iconColor: 'text-success-600',
  },
  {
    href: '/tax-filing',
    title: 'Tax Filing',
    description: 'Track federal, state, and local tax filings by period. Mark payments as submitted and monitor overdue obligations.',
    icon: FileCheck2,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    href: '/tax-calculator',
    title: 'Tax Calculator',
    description: 'Estimate per-period taxes using 2025 IRS tables. Input salary, filing status, and state to see a full breakdown.',
    icon: Calculator,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
];

export default function ReportingPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate and export payroll and tax reports"
      />

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <Link key={report.href} href={report.href}>
                <Card hover padding="md" className="group h-full">
                  <div className={`w-12 h-12 rounded-xl ${report.iconBg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${report.iconColor}`} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2 group-hover:text-primary-700 transition">
                    {report.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">
                    {report.description}
                  </p>
                  <div className="flex items-center gap-1 text-primary-500 text-sm font-medium mt-auto">
                    View Report
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
