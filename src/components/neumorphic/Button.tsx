import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'soft' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-mint text-white hover:bg-[#45a79e]',
  soft: 'bg-base text-ink hover:text-mint',
  danger: 'bg-coral text-white hover:bg-[#ef705f]',
  ghost: 'bg-transparent text-muted hover:text-ink shadow-none'
};

const sizeClasses: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-base'
};

export function Button({ variant = 'soft', size = 'md', icon, className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex touch-manipulation items-center justify-center gap-2 rounded-2xl text-center font-semibold leading-tight transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 active:shadow-neu-inset ${variantClasses[variant]} ${sizeClasses[size]} ${
        variant === 'ghost' ? '' : 'shadow-neu-sm'
      } ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
