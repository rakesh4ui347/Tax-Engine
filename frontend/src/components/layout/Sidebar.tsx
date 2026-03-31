'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Building2,
  BarChart3,
  Code2,
  Settings,
  LogOut,
  ChevronRight,
  FileCheck2,
  Calculator,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
  developerOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Payroll Runs', href: '/payroll', icon: CreditCard },
  { label: 'Employees', href: '/employees', icon: Users },
  { label: 'Companies', href: '/companies', icon: Building2, adminOnly: true },
  { label: 'Reporting', href: '/reporting', icon: BarChart3 },
  { label: 'Tax Filing', href: '/tax-filing', icon: FileCheck2 },
  { label: 'Tax Calculator', href: '/tax-calculator', icon: Calculator },
  { label: 'Developer', href: '/developer', icon: Code2, developerOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, canViewDeveloper, isAdmin } = useAuth();

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.developerOnly && !canViewDeveloper) return false;
    return true;
  });

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar flex flex-col z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700/50">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-sm">PayrollEngine</span>
            <p className="text-slate-400 text-xs">Employer Portal</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Main Menu
        </p>
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition group',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700/60 hover:text-white',
                  )}
                >
                  <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-white')} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-warning-500 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/60" />}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Account
          </p>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700/60 hover:text-white transition"
          >
            <Settings className="w-4.5 h-4.5 text-slate-400" />
            Settings
          </Link>
        </div>
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-slate-400 text-xs truncate">{user?.role}</p>
          </div>
          <button
            onClick={() => logout()}
            className="text-slate-400 hover:text-white transition p-1 rounded"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
