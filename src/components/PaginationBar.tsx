import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const numberFormatter = new Intl.NumberFormat('pl-PL');
const PAGE_SIZES = [50, 100, 250];

export function PaginationBar({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps) {
  const [jumpValue, setJumpValue] = useState('');

  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);

  const handleJumpSubmit = (e: FormEvent) => {
    e.preventDefault();
    const target = Number(jumpValue.trim());
    if (Number.isInteger(target) && target >= 1 && target <= totalPages) {
      onPageChange(target);
      setJumpValue('');
    }
  };

  return (
    <footer className="bg-white border-t border-[#E2E8F0] px-4 lg:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#475569]">
      {/* Left: Page size segmented control + visible row range */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[#64748B] whitespace-nowrap">Wierszy:</span>
          <div className="inline-flex items-center p-0.5 bg-[#F1F5F9] rounded-md">
            {PAGE_SIZES.map((size) => {
              const active = pageSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => onPageSizeChange(size)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#D61F26] ${
                    active
                      ? 'bg-white text-[#0F172A] font-semibold shadow-xs'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        <span className="tabular-nums whitespace-nowrap">
          Wyświetlono{' '}
          <strong className="font-semibold text-[#0F172A]">
            {numberFormatter.format(startRow)}–{numberFormatter.format(endRow)}
          </strong>{' '}
          z {numberFormatter.format(total)}
        </span>
      </div>

      {/* Right: Navigation arrows + Direct page jump */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleJumpSubmit} className="hidden sm:flex items-center gap-1.5">
          <label htmlFor="jump-page-input" className="text-[#64748B] whitespace-nowrap">
            Idź do strony:
          </label>
          <input
            id="jump-page-input"
            type="number"
            min={1}
            max={totalPages}
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            placeholder={String(page)}
            className="w-16 h-7 px-2 text-xs font-mono tabular-nums text-right bg-[#F8F9FA] text-[#0F172A] border border-[#CBD5E1] rounded focus:bg-white focus:border-[#D61F26] focus:outline-none"
          />
          <button
            type="submit"
            className="h-7 px-2.5 text-xs font-medium text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded transition-colors whitespace-nowrap"
          >
            Przejdź
          </button>
        </form>

        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="Pierwsza strona"
            className="p-1.5 rounded border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label="Poprzednia strona"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#E2E8F0] bg-white text-[#0F172A] font-medium hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Poprzednia</span>
          </button>

          <span className="px-2.5 font-mono tabular-nums text-[#0F172A] whitespace-nowrap">
            {numberFormatter.format(page)} / {numberFormatter.format(totalPages)}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            aria-label="Następna strona"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#E2E8F0] bg-white text-[#0F172A] font-medium hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <span>Następna</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            aria-label="Ostatnia strona"
            className="p-1.5 rounded border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
