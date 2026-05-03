import type { HTMLAttributes } from 'react';

export function Panel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-[22px] bg-base p-4 shadow-neu sm:rounded-[28px] sm:p-5 ${className}`} {...props} />;
}
