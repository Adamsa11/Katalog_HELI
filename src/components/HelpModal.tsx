import { X } from 'lucide-react';
import { useEffect } from 'react';
import { CATALOG_COLUMNS, type CatalogMetaResponse } from '../types/catalog';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
  meta: CatalogMetaResponse | null;
}

export function HelpModal({ open, onClose, meta }: HelpModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-[#CBD5E1] rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
          <h2 id="help-modal-title" className="font-display text-base font-bold text-[#0F172A]">
            Instrukcja filtrowania, eksportu CSV i połączenia z Supabase
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij okno instrukcji"
            className="p-1.5 text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto text-[13px] text-[#334155] leading-relaxed">
          <section className="space-y-2">
            <h3 className="font-display text-sm font-semibold text-[#0F172A]">
              1. Filtry kolumnowe i zakresy liczbowe
            </h3>
            <p>
              Nad każdą z 9 kolumn znajduje się dedykowane pole filtra. Kolumny tekstowe wyszukują
              dowolny fragment (bez rozróżniania wielkości liter), natomiast kolumny liczbowe (
              <span className="font-mono text-[#0F172A]">Lp</span>,{' '}
              <span className="font-mono text-[#0F172A]">Ilość</span>,{' '}
              <span className="font-mono text-[#0F172A]">Strona w PDF</span>) obsługują dodatkowo
              operatory zakresów:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
              <div className="p-2.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded">
                <div className="font-mono font-semibold text-[#0F172A]">100-500</div>
                <div className="text-[#64748B] mt-0.5">Zakres od 100 do 500</div>
              </div>
              <div className="p-2.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded">
                <div className="font-mono font-semibold text-[#0F172A]">&gt;=4</div>
                <div className="text-[#64748B] mt-0.5">Wartość większa lub równa 4</div>
              </div>
              <div className="p-2.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded">
                <div className="font-mono font-semibold text-[#0F172A]">42</div>
                <div className="text-[#64748B] mt-0.5">Dokładne dopasowanie liczby</div>
              </div>
            </div>
          </section>

          <section className="space-y-2 border-t border-[#E2E8F0] pt-4">
            <h3 className="font-display text-sm font-semibold text-[#0F172A]">
              2. Eksport przefiltrowanych wierszy do CSV
            </h3>
            <p>
              Przycisk <strong className="text-[#0F172A]">Eksportuj CSV</strong> zapisuje plik z
              kodowaniem UTF-8 BOM i separatorem średnikowym (<span className="font-mono">;</span>
              ), dzięki czemu polskie znaki diakrytyczne oraz oryginalne chińskie nazwy części
              otwierają się poprawnie w programie Microsoft Excel. Pojedynczy eksport obejmuje do{' '}
              <span className="font-mono tabular-nums font-medium text-[#0F172A]">
                {(meta?.maxExportRows ?? 10000).toLocaleString('pl-PL')}
              </span>{' '}
              przefiltrowanych wierszy w bieżącej kolejności sortowania.
            </p>
          </section>

          <section className="space-y-2 border-t border-[#E2E8F0] pt-4">
            <h3 className="font-display text-sm font-semibold text-[#0F172A]">
              3. Podłączenie tabeli <span className="font-mono">katalog_heli</span> w Supabase
            </h3>
            <p>
              Poświadczenia bazy przechowywane są wyłącznie po stronie serwera. Aby podpiąć swoją
              bazę z 582 317 rekordami, dodaj w panelu <strong className="text-[#0F172A]">Secrets</strong>{' '}
              następujące zmienne środowiskowe:
            </p>
            <div className="p-3 bg-[#F8F9FA] border border-[#E2E8F0] rounded font-mono text-xs text-[#0F172A] space-y-1">
              <div>SUPABASE_URL=https://twoj-projekt.supabase.co</div>
              <div>SUPABASE_ANON_KEY=twoj-klucz-anon-lub-service-role</div>
              <div>SUPABASE_TABLE_NAME=katalog_heli</div>
            </div>
            <p className="text-xs text-[#64748B]">
              Serwer automatycznie rozpoznaje zarówno polskie nazwy kolumn ze spacjami, jak i nazwy
              w formacie snake_case. Aktualnie aktywne mapowanie kolumn:
            </p>

            {meta && (
              <div className="border border-[#E2E8F0] rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#F1F5F9] text-[#0F172A]">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold">Kolumna w widoku</th>
                      <th className="px-3 py-1.5 text-left font-semibold">
                        Rozpoznana kolumna w bazie
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {CATALOG_COLUMNS.map((col) => (
                      <tr key={col.key}>
                        <td className="px-3 py-1.5 text-[#0F172A]">{col.label}</td>
                        <td className="px-3 py-1.5 font-mono text-[#475569]">
                          {meta.mappedColumns[col.key]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="px-5 py-3 bg-[#F8F9FA] border-t border-[#E2E8F0] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-md transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
