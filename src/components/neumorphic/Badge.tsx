import type { HTMLAttributes } from 'react';

type BadgeTone = 'mint' | 'amber' | 'coral' | 'plum' | 'muted';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  mint: 'bg-mint/15 text-[#23766f]',
  amber: 'bg-amber/20 text-[#8a5b0c]',
  coral: 'bg-coral/15 text-[#a94032]',
  plum: 'bg-plum/15 text-[#4d3d91]',
  muted: 'bg-slate-200 text-muted'
};

export function Badge({ tone = 'muted', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-bold ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
