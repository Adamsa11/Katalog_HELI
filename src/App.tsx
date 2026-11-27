import { CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CatalogTable } from './components/CatalogTable';
import { CatalogToolbar } from './components/CatalogToolbar';
import { CategorySidebar } from './components/CategorySidebar';
import { FilteringLoaderOverlay } from './components/FilteringLoaderOverlay';
import { HelpModal } from './components/HelpModal';
import { PaginationBar } from './components/PaginationBar';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { TopBar } from './components/TopBar';
import {
  exportCatalogCsv,
  fetchUniqueModelsForPartNumber,
  getCatalogMeta,
  queryCatalogParts,
} from './services/catalogService';
import {
  CATALOG_COLUMNS,
  EMPTY_COLUMN_FILTERS,
  type CatalogMetaResponse,
  type CatalogPart,
  type ColumnFilters,
  type ColumnKey,
  type SortDirection,
} from './types/catalog';

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = CATALOG_COLUMNS.reduce(
  (acc, col) => {
    acc[col.key] = true;
    return acc;
  },
  {} as Record<ColumnKey, boolean>
);

export default function App() {
  const [meta, setMeta] = useState<CatalogMetaResponse | null>(null);
  const [items, setItems] = useState<CatalogPart[]>([]);
  const [total, setTotal] = useState(0);
  const [totalIsEstimate, setTotalIsEstimate] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState<ColumnKey>('lp');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const [globalSearch, setGlobalSearch] = useState('');
  const [truckSeries, setTruckSeries] = useState('all');
  const [partGroup, setPartGroup] = useState('all');
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(EMPTY_COLUMN_FILTERS);

  // Debounced query mirrors for text inputs (280ms)
  const [debouncedGlobal, setDebouncedGlobal] = useState('');
  const [debouncedColumnFilters, setDebouncedColumnFilters] =
    useState<ColumnFilters>(EMPTY_COLUMN_FILTERS);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] =
    useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopyingModels, setIsCopyingModels] = useState(false);
  const [modelsCopied, setModelsCopied] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const modelsCopyTimerRef = useRef<number | null>(null);
  const activeRequestIdRef = useRef(0);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Load metadata on startup and whenever configuration changes
  useEffect(() => {
    let active = true;
    getCatalogMeta()
      .then((data) => {
        if (active) setMeta(data);
      })
      .catch(() => {
        // Parts query surfaces connectivity errors clearly
      });
    return () => {
      active = false;
    };
  }, [reloadNonce]);

  // Debounce text filters to avoid hammering Supabase on every keystroke
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedGlobal(globalSearch);
      setDebouncedColumnFilters(columnFilters);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [globalSearch, columnFilters]);

  // Fetch paginated, filtered, sorted parts directly via client-side catalog service
  useEffect(() => {
    const requestId = ++activeRequestIdRef.current;
    setLoading(true);
    setError(null);

    queryCatalogParts({
      page,
      pageSize,
      sortBy,
      sortDir,
      globalSearch: debouncedGlobal,
      truckSeries,
      partGroup,
      filters: debouncedColumnFilters,
    })
      .then((data) => {
        if (activeRequestIdRef.current !== requestId) return;
        setItems(data.items);
        setTotal(data.total);
        setTotalIsEstimate(Boolean(data.totalIsEstimate));
        setTotalPages(data.totalPages);
        if (data.page !== page) {
          setPage(data.page);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (activeRequestIdRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : 'Nie udało się pobrać rekordów katalogu.');
        setLoading(false);
      });
  }, [
    page,
    pageSize,
    sortBy,
    sortDir,
    debouncedGlobal,
    truckSeries,
    partGroup,
    debouncedColumnFilters,
    reloadNonce,
  ]);

  const hasActiveFilters = useMemo(() => {
    if (globalSearch.trim()) return true;
    if (truckSeries !== 'all' || partGroup !== 'all') return true;
    return Object.values(columnFilters).some((v) => v.trim().length > 0);
  }, [globalSearch, truckSeries, partGroup, columnFilters]);

  // Extract deduplicated "Model wózka" values from currently loaded rows
  // whose "Nr katalogowy" exactly equals the value typed in the "Nr katalogowy" filter.
  const exactMatchedModelsOnPage = useMemo(() => {
    const rawFilter = columnFilters.nrKatalogowy.trim();
    const debouncedFilter = debouncedColumnFilters.nrKatalogowy.trim();
    if (loading || !rawFilter) return [];
    if (rawFilter.toLowerCase() !== debouncedFilter.toLowerCase()) return [];

    const target = rawFilter.toLowerCase();
    const unique: string[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      if (item.nrKatalogowy.trim().toLowerCase() !== target) continue;
      const model = item.modelWozka.trim();
      if (!model) continue;
      const key = model.toUpperCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(model);
      }
    }
    return unique;
  }, [columnFilters.nrKatalogowy, debouncedColumnFilters.nrKatalogowy, items, loading]);

  const canCopyModels = exactMatchedModelsOnPage.length > 0;

  const handleSort = useCallback(
    (key: ColumnKey) => {
      if (sortBy === key) {
        setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(key);
        setSortDir('asc');
      }
      setPage(1);
    },
    [sortBy]
  );

  const handleColumnFilterChange = useCallback((key: ColumnKey, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleClearColumnFilter = useCallback((key: ColumnKey) => {
    setColumnFilters((prev) => ({ ...prev, [key]: '' }));
    setPage(1);
  }, []);

  const handleGlobalSearchChange = useCallback((value: string) => {
    setGlobalSearch(value);
    setPage(1);
  }, []);

  const handleSelectTruckSeries = useCallback((id: string) => {
    setTruckSeries(id);
    setPage(1);
  }, []);

  const handleSelectPartGroup = useCallback((id: string) => {
    setPartGroup(id);
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const handleResetAll = useCallback(() => {
    setGlobalSearch('');
    setTruckSeries('all');
    setPartGroup('all');
    setColumnFilters(EMPTY_COLUMN_FILTERS);
    setDebouncedGlobal('');
    setDebouncedColumnFilters(EMPTY_COLUMN_FILTERS);
    setSortBy('lp');
    setSortDir('asc');
    setPage(1);
  }, []);

  const handleToggleColumn = useCallback((key: ColumnKey) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleShowAllColumns = useCallback(() => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  }, []);

  const copyTextToClipboard = useCallback(async (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Fallback to execCommand inside restricted iframes
      }
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!ok) {
      throw new Error('Nie udało się skopiować do schowka.');
    }
  }, []);

  const handleCopyPartNumber = useCallback(
    async (code: string) => {
      try {
        await copyTextToClipboard(code);
        setCopiedCode(code);
        showToast(`Skopiowano numer katalogowy: ${code}`);
        if (copyTimerRef.current) {
          window.clearTimeout(copyTimerRef.current);
        }
        copyTimerRef.current = window.setTimeout(() => {
          setCopiedCode(null);
        }, 1600);
      } catch {
        showToast('Nie udało się skopiować numeru do schowka.');
      }
    },
    [copyTextToClipboard, showToast]
  );

  const handleCopyModels = useCallback(async () => {
    const exactPartNo = columnFilters.nrKatalogowy.trim();
    if (!canCopyModels || !exactPartNo) return;

    setIsCopyingModels(true);
    try {
      const models =
        total > items.length
          ? await fetchUniqueModelsForPartNumber(
              {
                page: 1,
                pageSize,
                sortBy,
                sortDir,
                globalSearch: debouncedGlobal,
                truckSeries,
                partGroup,
                filters: debouncedColumnFilters,
              },
              exactPartNo
            )
          : exactMatchedModelsOnPage;

      if (models.length === 0) {
        showToast('Brak modeli wózków do skopiowania dla podanego numeru katalogowego.');
        return;
      }

      const formatted = models.join(', ');
      await copyTextToClipboard(formatted);

      setModelsCopied(true);
      if (modelsCopyTimerRef.current) {
        window.clearTimeout(modelsCopyTimerRef.current);
      }
      modelsCopyTimerRef.current = window.setTimeout(() => {
        setModelsCopied(false);
      }, 1800);

      const preview = formatted.length > 72 ? `${formatted.slice(0, 72)}…` : formatted;
      showToast(`Skopiowano modele (${models.length}): ${preview}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Nie udało się skopiować modeli wózków do schowka.';
      showToast(msg);
    } finally {
      setIsCopyingModels(false);
    }
  }, [
    canCopyModels,
    columnFilters.nrKatalogowy,
    total,
    items.length,
    pageSize,
    sortBy,
    sortDir,
    debouncedGlobal,
    truckSeries,
    partGroup,
    debouncedColumnFilters,
    exactMatchedModelsOnPage,
    copyTextToClipboard,
    showToast,
  ]);

  const handleExportCsv = useCallback(async () => {
    setIsExporting(true);
    try {
      const { csv, rowCount, truncated } = await exportCatalogCsv({
        page: 1,
        pageSize,
        sortBy,
        sortDir,
        globalSearch,
        truckSeries,
        partGroup,
        filters: columnFilters,
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `katalog_heli_${stamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (truncated) {
        showToast(
          `Wyeksportowano pierwsze ${rowCount.toLocaleString('pl-PL')} pasujących wierszy (limit pliku CSV).`
        );
      } else {
        showToast(`Zapisano plik CSV (${rowCount.toLocaleString('pl-PL')} wierszy).`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nie udało się wyeksportować pliku CSV.';
      showToast(msg);
    } finally {
      setIsExporting(false);
    }
  }, [pageSize, sortBy, sortDir, globalSearch, truckSeries, partGroup, columnFilters, showToast]);

  const handleConfigChanged = useCallback(
    (message: string) => {
      setPage(1);
      setReloadNonce((n) => n + 1);
      showToast(message);
    },
    [showToast]
  );

  const handleFocusCatalog = useCallback(() => {
    setHelpOpen(false);
    setConfigOpen(false);
    setColumnsMenuOpen(false);
    searchInputRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#0F172A]">
      <TopBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onOpenColumns={() => setColumnsMenuOpen(true)}
        onOpenConfig={() => setConfigOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onFocusCatalog={handleFocusCatalog}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
        canCopyModels={canCopyModels}
        isCopyingModels={isCopyingModels}
        modelsCopied={modelsCopied}
        onCopyModels={handleCopyModels}
      />

      <div className="flex-1 flex min-h-0">
        <CategorySidebar
          open={sidebarOpen}
          onCloseMobile={() => {
            if (window.innerWidth < 1024) setSidebarOpen(false);
          }}
          truckSeries={truckSeries}
          partGroup={partGroup}
          onSelectTruckSeries={handleSelectTruckSeries}
          onSelectPartGroup={handleSelectPartGroup}
          meta={meta}
          onOpenConfig={() => setConfigOpen(true)}
        />

        <main className="flex-1 min-w-0 flex flex-col h-[calc(100vh-3.5rem)]">
          <CatalogToolbar
            globalSearch={globalSearch}
            onGlobalSearchChange={handleGlobalSearchChange}
            truckSeries={truckSeries}
            partGroup={partGroup}
            onSelectTruckSeries={handleSelectTruckSeries}
            onSelectPartGroup={handleSelectPartGroup}
            columnFilters={columnFilters}
            onClearColumnFilter={handleClearColumnFilter}
            onResetAll={handleResetAll}
            hasActiveFilters={hasActiveFilters}
            total={total}
            totalIsEstimate={totalIsEstimate}
            page={page}
            totalPages={totalPages}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            visibleColumns={visibleColumns}
            onToggleColumn={handleToggleColumn}
            onShowAllColumns={handleShowAllColumns}
            columnsMenuOpen={columnsMenuOpen}
            onSetColumnsMenuOpen={setColumnsMenuOpen}
            searchInputRef={searchInputRef}
          />

          <CatalogTable
            items={items}
            loading={loading}
            error={error}
            onRetry={() => setReloadNonce((n) => n + 1)}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            columnFilters={columnFilters}
            onColumnFilterChange={handleColumnFilterChange}
            visibleColumns={visibleColumns}
            copiedCode={copiedCode}
            onCopyPartNumber={handleCopyPartNumber}
            onResetAll={handleResetAll}
            hasActiveFilters={hasActiveFilters}
            isDemoMode={meta?.mode === 'demo'}
            onOpenConfig={() => setConfigOpen(true)}
          />

          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </main>
      </div>

      <SupabaseConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onConfigChanged={handleConfigChanged}
      />

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} meta={meta} />

      <FilteringLoaderOverlay
        visible={loading}
        label={hasActiveFilters ? 'Filtrowanie katalogu…' : 'Wczytywanie katalogu…'}
      />

      {/* Subtle transient feedback toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2.5 bg-[#0F172A] text-white text-xs font-medium rounded-md shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
