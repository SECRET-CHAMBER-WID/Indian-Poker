import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-muted">{label}</span>
      <input
        className={`h-12 w-full rounded-2xl border border-white/60 bg-base px-4 text-ink shadow-neu-inset outline-none transition placeholder:text-slate-400 focus:border-mint ${className}`}
        {...props}
      />
      {error ? <span className="mt-2 block text-sm font-semibold text-coral">{error}</span> : null}
    </label>
  );
}
