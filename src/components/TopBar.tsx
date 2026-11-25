import { Download, Loader2 } from 'lucide-react';

interface TopBarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenColumns: () => void;
  onOpenConfig: () => void;
  onOpenHelp: () => void;
  onFocusCatalog: () => void;
  onExportCsv: () => void;
  isExporting: boolean;
}

export function TopBar({
  sidebarOpen,
  onToggleSidebar,
  onOpenColumns,
  onOpenConfig,
  onOpenHelp,
  onFocusCatalog,
  onExportCsv,
  isExporting,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-[#E2E8F0] px-4 lg:px-6 flex items-center justify-between gap-8">
      {/* Zone 1: Brand Logo */}
      <button
        type="button"
        onClick={onFocusCatalog}
        aria-label="Sawtrak Serwis — Katalog Części HELI"
        className="whitespace-nowrap shrink-0 flex items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D61F26] rounded"
      >
        <img
          src={`${import.meta.env.BASE_URL}assets/aistudio/Logo_sawtrak_serwis_6ef8688b.jpeg`}
          alt="Sawtrak Serwis"
          referrerPolicy="no-referrer"
          className="h-10 w-[152px] object-cover object-[50%_20%] block"
        />
      </button>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav
        aria-label="Nawigacja katalogu"
        className="hidden md:flex items-center gap-6 text-sm font-medium text-[#475569]"
      >
        <button
          type="button"
          onClick={onFocusCatalog}
          className="hover:text-[#0F172A] hover:underline underline-offset-4 decoration-[#D61F26] transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D61F26] rounded"
        >
          Katalog
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-pressed={sidebarOpen}
          className={`hover:text-[#0F172A] hover:underline underline-offset-4 decoration-[#D61F26] transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D61F26] rounded ${
            sidebarOpen ? 'text-[#0F172A]' : 'text-[#475569]'
          }`}
        >
          Kategorie
        </button>
        <button
          type="button"
          onClick={onOpenColumns}
          className="hover:text-[#0F172A] hover:underline underline-offset-4 decoration-[#D61F26] transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D61F26] rounded"
        >
          Kolumny
        </button>
        <button
          type="button"
          onClick={onOpenConfig}
          className="hover:text-[#0F172A] hover:underline underline-offset-4 decoration-[#D61F26] transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D61F26] rounded"
        >
          Konfiguracja
        </button>
        <button
          type="button"
          onClick={onOpenHelp}
          className="hover:text-[#0F172A] hover:underline underline-offset-4 decoration-[#D61F26] transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D61F26] rounded"
        >
          Instrukcja
        </button>
      </nav>

      {/* Zone 3: Single Primary Action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onExportCsv}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#D61F26] hover:bg-[#B91C1C] disabled:opacity-60 disabled:cursor-not-allowed rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D61F26]"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{isExporting ? 'Eksportowanie…' : 'Eksportuj CSV'}</span>
        </button>
      </div>
    </header>
  );
}
