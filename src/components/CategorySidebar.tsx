import { Check, X } from 'lucide-react';
import {
  PART_GROUP_CATEGORIES,
  TRUCK_SERIES_CATEGORIES,
  type CatalogMetaResponse,
} from '../types/catalog';

interface CategorySidebarProps {
  open: boolean;
  onCloseMobile: () => void;
  truckSeries: string;
  partGroup: string;
  onSelectTruckSeries: (id: string) => void;
  onSelectPartGroup: (id: string) => void;
  meta: CatalogMetaResponse | null;
  onOpenHelp: () => void;
}

export function CategorySidebar({
  open,
  onCloseMobile,
  truckSeries,
  partGroup,
  onSelectTruckSeries,
  onSelectPartGroup,
  meta,
  onOpenHelp,
}: CategorySidebarProps) {
  if (!open) return null;

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-[#E2E8F0]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] lg:hidden">
        <span className="font-display text-sm font-semibold text-[#0F172A]">Kategorie katalogu</span>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Zamknij panel kategorii"
          className="p-1.5 text-[#475569] hover:text-[#0F172A] rounded hover:bg-[#F1F5F9]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Truck Series Category Group */}
        <section aria-labelledby="heading-truck-series">
          <h2
            id="heading-truck-series"
            className="px-2 mb-2 text-xs font-semibold text-[#64748B] tracking-normal"
          >
            Serie wózków HELI
          </h2>
          <div className="space-y-0.5" role="group" aria-label="Filtr serii wózków">
            {TRUCK_SERIES_CATEGORIES.map((category) => {
              const isActive = truckSeries === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    onSelectTruckSeries(category.id);
                    onCloseMobile();
                  }}
                  aria-pressed={isActive}
                  className={`w-full text-left px-2.5 py-2 rounded-md transition-colors flex items-center justify-between gap-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#D61F26] ${
                    isActive
                      ? 'bg-[#FEF2F2] text-[#B91C1C]'
                      : 'text-[#0F172A] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <span className="min-w-0">
                    <span
                      className={`block text-[13px] leading-tight truncate ${
                        isActive ? 'font-semibold' : 'font-medium'
                      }`}
                    >
                      {category.label}
                    </span>
                    <span
                      className={`block text-[11px] leading-snug truncate mt-0.5 ${
                        isActive ? 'text-[#B91C1C]/80' : 'text-[#64748B]'
                      }`}
                    >
                      {category.sublabel}
                    </span>
                  </span>
                  {isActive && <Check className="w-3.5 h-3.5 shrink-0 text-[#D61F26]" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>

        <div className="border-t border-[#E2E8F0]" />

        {/* Part Subassembly Category Group */}
        <section aria-labelledby="heading-part-groups">
          <h2
            id="heading-part-groups"
            className="px-2 mb-2 text-xs font-semibold text-[#64748B] tracking-normal"
          >
            Grupy podzespołów (PL)
          </h2>
          <div className="space-y-0.5" role="group" aria-label="Filtr grup podzespołów">
            {PART_GROUP_CATEGORIES.map((group) => {
              const isActive = partGroup === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    onSelectPartGroup(group.id);
                    onCloseMobile();
                  }}
                  aria-pressed={isActive}
                  className={`w-full text-left px-2.5 py-2 rounded-md transition-colors flex items-center justify-between gap-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#D61F26] ${
                    isActive
                      ? 'bg-[#FEF2F2] text-[#B91C1C]'
                      : 'text-[#0F172A] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <span className="min-w-0">
                    <span
                      className={`block text-[13px] leading-tight truncate ${
                        isActive ? 'font-semibold' : 'font-medium'
                      }`}
                    >
                      {group.label}
                    </span>
                    <span
                      className={`block text-[11px] leading-snug truncate mt-0.5 ${
                        isActive ? 'text-[#B91C1C]/80' : 'text-[#64748B]'
                      }`}
                    >
                      {group.sublabel}
                    </span>
                  </span>
                  {isActive && <Check className="w-3.5 h-3.5 shrink-0 text-[#D61F26]" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Quiet unboxed data source summary */}
      <div className="px-4 py-3 border-t border-[#E2E8F0] bg-[#F8F9FA] text-xs text-[#475569] space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-[#0F172A]">
            {meta?.mode === 'supabase' ? 'Supabase' : 'Tryb podglądu'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-[11px]">{meta?.tableName || 'katalog_heli'}</span>
        </div>
        <button
          type="button"
          onClick={onOpenHelp}
          className="text-xs font-medium text-[#D61F26] hover:text-[#B91C1C] hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D61F26] rounded"
        >
          {meta?.mode === 'supabase' ? 'Mapowanie kolumn i eksport' : 'Jak podpiąć bazę Supabase'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop docked sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-[calc(100vh-3.5rem)] sticky top-14">
        {content}
      </aside>

      {/* Mobile slide-over drawer */}
      <div className="lg:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true">
        <div
          className="fixed inset-0 bg-[#0F172A]/40"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
        <div className="relative z-10 w-72 max-w-[85vw] h-full">{content}</div>
      </div>
    </>
  );
}
