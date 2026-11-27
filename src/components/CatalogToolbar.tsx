import { Columns3, PanelLeft, RotateCcw, Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
  CATALOG_COLUMNS,
  PART_GROUP_CATEGORIES,
  TRUCK_SERIES_CATEGORIES,
  type ColumnFilters,
  type ColumnKey,
} from '../types/catalog';

interface CatalogToolbarProps {
  globalSearch: string;
  onGlobalSearchChange: (val: string) => void;
  truckSeries: string;
  partGroup: string;
  onSelectTruckSeries: (id: string) => void;
  onSelectPartGroup: (id: string) => void;
  columnFilters: ColumnFilters;
  onClearColumnFilter: (key: ColumnKey) => void;
  onResetAll: () => void;
  hasActiveFilters: boolean;
  total: number;
  totalIsEstimate?: boolean;
  page: number;
  totalPages: number;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  visibleColumns: Record<ColumnKey, boolean>;
  onToggleColumn: (key: ColumnKey) => void;
  onShowAllColumns: () => void;
  columnsMenuOpen: boolean;
  onSetColumnsMenuOpen: (open: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

const numberFormatter = new Intl.NumberFormat('pl-PL');

export function CatalogToolbar({
  globalSearch,
  onGlobalSearchChange,
  truckSeries,
  partGroup,
  onSelectTruckSeries,
  onSelectPartGroup,
  columnFilters,
  onClearColumnFilter,
  onResetAll,
  hasActiveFilters,
  total,
  totalIsEstimate,
  page,
  totalPages,
  sidebarOpen,
  onToggleSidebar,
  visibleColumns,
  onToggleColumn,
  onShowAllColumns,
  columnsMenuOpen,
  onSetColumnsMenuOpen,
  searchInputRef,
}: CatalogToolbarProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!columnsMenuOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onSetColumnsMenuOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSetColumnsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [columnsMenuOpen, onSetColumnsMenuOpen]);

  const visibleCount = CATALOG_COLUMNS.filter((c) => visibleColumns[c.key]).length;
  const activeSeriesObj = TRUCK_SERIES_CATEGORIES.find((c) => c.id === truckSeries);
  const activeGroupObj = PART_GROUP_CATEGORIES.find((c) => c.id === partGroup);

  const activeFilterItems: Array<{ id: string; label: string; onRemove: () => void }> = [];

  if (truckSeries !== 'all' && activeSeriesObj) {
    activeFilterItems.push({
      id: 'series',
      label: `Seria: ${activeSeriesObj.label}`,
      onRemove: () => onSelectTruckSeries('all'),
    });
  }
  if (partGroup !== 'all' && activeGroupObj) {
    activeFilterItems.push({
      id: 'group',
      label: `Podzespół: ${activeGroupObj.label}`,
      onRemove: () => onSelectPartGroup('all'),
    });
  }
  if (globalSearch.trim()) {
    activeFilterItems.push({
      id: 'global',
      label: `Szukaj: ${globalSearch.trim()}`,
      onRemove: () => onGlobalSearchChange(''),
    });
  }
  for (const col of CATALOG_COLUMNS) {
    const val = columnFilters[col.key]?.trim();
    if (val) {
      activeFilterItems.push({
        id: `col-${col.key}`,
        label: `${col.shortLabel}: ${val}`,
        onRemove: () => onClearColumnFilter(col.key),
      });
    }
  }

  return (
    <div className="bg-white border-b border-[#E2E8F0] px-4 lg:px-5 py-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left group: Sidebar toggle + Global Search + Quick category selects when sidebar hidden */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Ukryj panel kategorii' : 'Pokaż panel kategorii'}
            title={sidebarOpen ? 'Ukryj panel kategorii' : 'Pokaż panel kategorii'}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#D61F26] ${
              sidebarOpen
                ? 'border-[#CBD5E1] bg-[#F1F5F9] text-[#0F172A]'
                : 'border-[#E2E8F0] bg-white text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
          >
            <PanelLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Kategorie</span>
          </button>

          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search
              className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              placeholder="Szukaj po modelu, nr katalogowym, nazwie PL / EN / CN…"
              aria-label="Wyszukiwanie globalne w katalogu"
              className="w-full h-9 pl-9 pr-8 text-[13px] bg-[#F8F9FA] text-[#0F172A] placeholder:text-[#64748B] border border-[#CBD5E1] rounded-md focus:bg-white focus:border-[#D61F26] focus:outline-none focus:ring-2 focus:ring-[#D61F26]/15 transition-colors"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => onGlobalSearchChange('')}
                aria-label="Wyczyść wyszukiwanie"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#0F172A] rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right group: Unboxed metadata count + Column toggle + Reset */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="text-xs text-[#475569] flex items-center gap-2 tabular-nums whitespace-nowrap">
            <span>
              <strong className="font-semibold text-[#0F172A]">
                {totalIsEstimate ? 'ok. ' : ''}
                {numberFormatter.format(total)}
              </strong>{' '}
              pozycji
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Strona <strong className="font-semibold text-[#0F172A]">{numberFormatter.format(page)}</strong> z{' '}
              {numberFormatter.format(totalPages)}
            </span>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => onSetColumnsMenuOpen(!columnsMenuOpen)}
              aria-expanded={columnsMenuOpen}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#D61F26]"
            >
              <Columns3 className="w-3.5 h-3.5 text-[#475569]" aria-hidden="true" />
              <span className="tabular-nums">
                Kolumny ({visibleCount}/{CATALOG_COLUMNS.length})
              </span>
            </button>

            {columnsMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white border border-[#CBD5E1] rounded-md shadow-lg z-40 py-2">
                <div className="px-3 pb-2 mb-1 border-b border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#0F172A]">Widoczne kolumny</span>
                  <button
                    type="button"
                    onClick={onShowAllColumns}
                    className="text-xs font-medium text-[#D61F26] hover:underline"
                  >
                    Wszystkie
                  </button>
                </div>
                <div className="px-1.5 space-y-0.5 max-h-72 overflow-y-auto">
                  {CATALOG_COLUMNS.map((col) => {
                    const checked = visibleColumns[col.key];
                    const disableUncheck = checked && visibleCount <= 2;
                    return (
                      <label
                        key={col.key}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-xs cursor-pointer select-none ${
                          disableUncheck
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-[#F1F5F9] text-[#0F172A]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disableUncheck}
                          onChange={() => onToggleColumn(col.key)}
                          className="rounded border-[#CBD5E1] accent-[#D61F26]"
                        />
                        <span className="truncate">{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#D61F26]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Wyczyść filtry</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive active filter removal controls */}
      {activeFilterItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#F1F5F9]">
          <span className="text-xs text-[#64748B]">Aktywne kryteria:</span>
          {activeFilterItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onRemove}
              title="Kliknij, aby usunąć filtr"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#D61F26]"
            >
              <span className="max-w-[200px] truncate">{item.label}</span>
              <X className="w-3 h-3 text-[#64748B]" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
