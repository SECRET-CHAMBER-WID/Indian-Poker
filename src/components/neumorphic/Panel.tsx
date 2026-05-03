import type { HTMLAttributes } from 'react';

export function Panel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-[28px] bg-base p-5 shadow-neu ${className}`} {...props} />;
}
