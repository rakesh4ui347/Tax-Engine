'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({} as ToastContextValue);

export function useToast() {
  return useContext(ToastContext);
}

const variantStyles: Record<ToastVariant, { bg: string; icon: React.ElementType; iconColor: string }> = {
  success: { bg: 'bg-success-50 border-success-200', icon: CheckCircle, iconColor: 'text-success-500' },
  error: { bg: 'bg-danger-50 border-danger-200', icon: XCircle, iconColor: 'text-danger-500' },
  warning: { bg: 'bg-warning-50 border-warning-200', icon: AlertTriangle, iconColor: 'text-warning-500' },
  info: { bg: 'bg-primary-50 border-primary-200', icon: Info, iconColor: 'text-primary-500' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...opts, id }]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  const value: ToastContextValue = {
    toast: addToast,
    success: (title, description) => addToast({ title, description, variant: 'success' }),
    error: (title, description) => addToast({ title, description, variant: 'error' }),
    warning: (title, description) => addToast({ title, description, variant: 'warning' }),
    info: (title, description) => addToast({ title, description, variant: 'info' }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const { bg, icon: Icon, iconColor } = variantStyles[toast.variant];
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg',
                bg,
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColor)} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
                {toast.description && (
                  <p className="text-xs text-slate-600 mt-0.5">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 transition flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
