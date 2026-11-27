interface FilteringLoaderOverlayProps {
  visible: boolean;
  label?: string;
}

export function FilteringLoaderOverlay({
  visible,
  label = 'Filtrowanie katalogu…',
}: FilteringLoaderOverlayProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center p-4"
    >
      <div className="bg-white/95 backdrop-blur-xs border border-[#CBD5E1] rounded-lg shadow-xl px-6 py-5 flex flex-col items-center gap-3 min-w-[196px]">
        <div className="relative w-11 h-11 flex items-center justify-center" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border-[3px] border-[#E2E8F0]" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#EA580C] border-r-[#D61F26] animate-spin" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#EA580C]" />
        </div>
        <span className="text-xs font-semibold text-[#0F172A] tracking-tight whitespace-nowrap">
          {label}
        </span>
      </div>
    </div>
  );
}
