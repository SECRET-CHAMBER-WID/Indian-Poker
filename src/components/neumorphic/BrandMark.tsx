interface BrandMarkProps {
  compact?: boolean;
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-base px-3 py-2 shadow-neu-sm">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[11px] font-black text-white shadow-neu-inset">
        SC
      </span>
      {!compact ? <span className="text-xs font-black tracking-[0.18em] text-ink">SECRET CHAMBER</span> : null}
    </div>
  );
}
