import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Copy,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  CATALOG_COLUMNS,
  type CatalogPart,
  type ColumnFilters,
  type ColumnKey,
  type SortDirection,
} from '../types/catalog';

interface CatalogTableProps {
  items: CatalogPart[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  sortBy: ColumnKey;
  sortDir: SortDirection;
  onSort: (key: ColumnKey) => void;
  columnFilters: ColumnFilters;
  onColumnFilterChange: (key: ColumnKey, value: string) => void;
  visibleColumns: Record<ColumnKey, boolean>;
  copiedCode: string | null;
  onCopyPartNumber: (code: string) => void;
  onResetAll: () => void;
  hasActiveFilters: boolean;
}

const numberFormatter = new Intl.NumberFormat('pl-PL');

export function CatalogTable({
  items,
  loading,
  error,
  onRetry,
  sortBy,
  sortDir,
  onSort,
  columnFilters,
  onColumnFilterChange,
  visibleColumns,
  copiedCode,
  onCopyPartNumber,
  onResetAll,
  hasActiveFilters,
}: CatalogTableProps) {
  const activeColumns = CATALOG_COLUMNS.filter((col) => visibleColumns[col.key]);

  const formatCellValue = (item: CatalogPart, key: ColumnKey): string => {
    const raw = item[key];
    if (raw === null || raw === undefined || raw === '') return '—';
    if (key === 'lp' && typeof raw === 'number') {
      return numberFormatter.format(raw);
    }
    return String(raw);
  };

  return (
    <div className="flex-1 overflow-auto bg-white relative">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-20 bg-[#F1F5F9] shadow-[0_1px_0_0_#CBD5E1]">
          {/* Row 1: Sortable column headers */}
          <tr>
            {activeColumns.map((col) => {
              const isSorted = sortBy === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  style={{ minWidth: col.minWidth }}
                  aria-sort={
                    isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className="px-3 pt-2.5 pb-1.5 border-r border-[#E2E8F0] last:border-r-0 select-none align-middle"
                >
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className={`w-full flex items-center gap-1.5 text-xs font-semibold transition-colors whitespace-nowrap rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D61F26] ${
                      col.align === 'right' ? 'justify-end' : 'justify-between'
                    } ${
                      isSorted ? 'text-[#D61F26]' : 'text-[#0F172A] hover:text-[#D61F26]'
                    }`}
                  >
                    <span className="truncate">{col.label}</span>
                    {isSorted ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 shrink-0 text-[#D61F26]" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 shrink-0 text-[#D61F26]" aria-hidden="true" />
                      )
                    ) : (
                      <ArrowUpDown
                        className="w-3.5 h-3.5 shrink-0 text-[#94A3B8]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </th>
              );
            })}
          </tr>

          {/* Row 2: Dedicated inline filter input for EVERY column */}
          <tr className="bg-[#F8FAFC] border-t border-[#E2E8F0]">
            {activeColumns.map((col) => {
              const val = columnFilters[col.key] || '';
              return (
                <th
                  key={`${col.key}-filter`}
                  scope="col"
                  className="px-2 py-1.5 border-r border-[#E2E8F0] last:border-r-0 font-normal"
                >
                  <div className="relative">
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => onColumnFilterChange(col.key, e.target.value)}
                      placeholder={col.placeholder}
                      aria-label={`Filtruj kolumnę ${col.label}`}
                      className={`w-full h-7 text-xs bg-white text-[#0F172A] placeholder:text-[#94A3B8] border rounded px-2 pr-6 focus:outline-none focus:border-[#D61F26] focus:ring-1 focus:ring-[#D61F26]/20 transition-colors ${
                        val ? 'border-[#D61F26]/60 bg-[#FEF2F2]/30' : 'border-[#CBD5E1]'
                      } ${col.align === 'right' ? 'text-right font-mono tabular-nums' : ''} ${
                        col.monospace ? 'font-mono' : ''
                      }`}
                    />
                    {val && (
                      <button
                        type="button"
                        onClick={() => onColumnFilterChange(col.key, '')}
                        aria-label={`Wyczyść filtr ${col.label}`}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-[#64748B] hover:text-[#0F172A] rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-[#E2E8F0] text-[13px]">
          {error ? (
            <tr>
              <td colSpan={activeColumns.length} className="px-6 py-16 text-center">
                <div className="max-w-md mx-auto space-y-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-[#FEF2F2] text-[#D61F26]">
                    <AlertCircle className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-[#0F172A]">
                    Nie udało się wczytać danych katalogu
                  </h3>
                  <p className="text-xs text-[#475569] leading-relaxed">{error}</p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#D61F26] hover:bg-[#B91C1C] rounded-md transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Ponów próbę</span>
                  </button>
                </div>
              </td>
            </tr>
          ) : loading && items.length === 0 ? (
            Array.from({ length: 14 }).map((_, idx) => (
              <tr key={`skeleton-${idx}`} className="h-10">
                {activeColumns.map((col) => (
                  <td
                    key={`${col.key}-skel-${idx}`}
                    className="px-3 py-2 border-r border-[#F1F5F9] last:border-r-0"
                  >
                    <div
                      className={`h-3.5 bg-[#E2E8F0] rounded animate-pulse ${
                        col.align === 'right' ? 'ml-auto w-12' : 'w-3/4'
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={activeColumns.length} className="px-6 py-16 text-center">
                <div className="max-w-md mx-auto space-y-3">
                  <h3 className="font-display text-sm font-semibold text-[#0F172A]">
                    Brak części spełniających wybrane kryteria
                  </h3>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    Żaden wpis w katalogu nie pasuje do bieżącej kombinacji kategorii i filtrów
                    kolumnowych. Spróbuj rozszerzyć zapytanie lub zresetować filtry.
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={onResetAll}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#D61F26] hover:bg-[#B91C1C] rounded-md transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Wyczyść wszystkie filtry</span>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            items.map((item, rowIndex) => {
              const rowKey = `${item.lp}-${item.nrKatalogowy}-${rowIndex}`;
              const isCopied = Boolean(item.nrKatalogowy) && copiedCode === item.nrKatalogowy;

              return (
                <tr
                  key={rowKey}
                  className={`h-10 transition-colors hover:bg-[#F8FAFC] ${
                    loading ? 'opacity-60' : ''
                  }`}
                >
                  {activeColumns.map((col) => {
                    const text = formatCellValue(item, col.key);

                    if (col.key === 'nrKatalogowy') {
                      return (
                        <td
                          key={col.key}
                          className="px-3 py-1.5 border-r border-[#F1F5F9] last:border-r-0 align-middle"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[12.5px] font-semibold text-[#0F172A] whitespace-nowrap">
                              {text}
                            </span>
                            {item.nrKatalogowy && (
                              <button
                                type="button"
                                onClick={() => onCopyPartNumber(item.nrKatalogowy)}
                                aria-label={`Kopiuj numer katalogowy ${item.nrKatalogowy}`}
                                title={
                                  isCopied
                                    ? 'Skopiowano do schowka'
                                    : `Kopiuj ${item.nrKatalogowy}`
                                }
                                className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#D61F26] ${
                                  isCopied
                                    ? 'text-[#16A34A] bg-[#F0FDF4]'
                                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                                }`}
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span className="hidden xl:inline">OK</span>
                                  </>
                                ) : (
                                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    }

                    if (col.key === 'modelWozka') {
                      return (
                        <td
                          key={col.key}
                          className="px-3 py-1.5 border-r border-[#F1F5F9] last:border-r-0 align-middle font-mono text-[12.5px] font-medium text-[#0F172A] whitespace-nowrap"
                        >
                          {text}
                        </td>
                      );
                    }

                    if (col.key === 'lp' || col.key === 'ilosc' || col.key === 'stronaPdf') {
                      return (
                        <td
                          key={col.key}
                          className={`px-3 py-1.5 border-r border-[#F1F5F9] last:border-r-0 align-middle text-right font-mono text-[12.5px] tabular-nums whitespace-nowrap ${
                            col.key === 'lp' ? 'text-[#64748B]' : 'text-[#0F172A]'
                          }`}
                        >
                          {text}
                        </td>
                      );
                    }

                    if (col.key === 'nazwaPl') {
                      return (
                        <td
                          key={col.key}
                          title={text !== '—' ? text : undefined}
                          className="px-3 py-1.5 border-r border-[#F1F5F9] last:border-r-0 align-middle font-medium text-[#0F172A] max-w-[320px] truncate"
                        >
                          {text}
                        </td>
                      );
                    }

                    if (col.key === 'uwagi') {
                      return (
                        <td
                          key={col.key}
                          title={text !== '—' ? text : undefined}
                          className="px-3 py-1.5 border-r border-[#F1F5F9] last:border-r-0 align-middle text-xs text-[#475569] max-w-[260px] truncate"
                        >
                          {text}
                        </td>
                      );
                    }

                    return (
                      <td
                        key={col.key}
                        title={text !== '—' ? text : undefined}
                        className="px-3 py-1.5 border-r border-[#F1F5F9] last:border-r-0 align-middle text-[#334155] max-w-[260px] truncate"
                      >
                        {text}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
