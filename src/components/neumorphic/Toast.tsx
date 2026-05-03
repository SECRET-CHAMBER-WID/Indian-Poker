import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ToastState } from '../../types';

interface ToastProps {
  toast: ToastState | null;
}

export function Toast({ toast }: ToastProps) {
  if (!toast) {
    return null;
  }

  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertCircle : Info;

  return (
    <div className="fixed right-4 top-4 z-50 flex max-w-sm items-center gap-3 rounded-2xl bg-base px-4 py-3 text-sm font-semibold text-ink shadow-neu">
      <Icon className={toast.type === 'error' ? 'text-coral' : toast.type === 'success' ? 'text-mint' : 'text-plum'} size={20} />
      <span>{toast.message}</span>
    </div>
  );
}
