import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Panel } from './Panel';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, open, onClose, children }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm">
      <Panel className="w-full max-w-lg">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-ink">{title}</h2>
          <Button aria-label="닫기" icon={<X size={18} />} onClick={onClose} size="sm" variant="ghost" />
        </div>
        {children}
      </Panel>
    </div>
  );
}
