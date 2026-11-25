import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import {
  clearSupabaseConfig,
  getActiveSupabaseConfig,
  getSavedSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  validateSupabaseConfig,
  type ConnectionTestResult,
} from '../services/catalogService';
import { CATALOG_COLUMNS } from '../types/catalog';

interface SupabaseConfigModalProps {
  open: boolean;
  onClose: () => void;
  onConfigChanged: (message: string) => void;
}

export function SupabaseConfigModal({
  open,
  onClose,
  onConfigChanged,
}: SupabaseConfigModalProps) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [tableName, setTableName] = useState('katalog_heli');
  const [showKey, setShowKey] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [activeSource, setActiveSource] = useState<'storage' | 'env' | 'demo'>('demo');

  useEffect(() => {
    if (!open) return;
    const saved = getSavedSupabaseConfig();
    const active = getActiveSupabaseConfig();
    setHasSavedConfig(Boolean(saved));
    setActiveSource(active.source);

    if (saved) {
      setUrl(saved.url);
      setAnonKey(saved.anonKey);
      setTableName(saved.tableName);
    } else if (active.config) {
      setUrl(active.config.url);
      setAnonKey(active.config.anonKey);
      setTableName(active.config.tableName);
    } else {
      setUrl('');
      setAnonKey('');
      setTableName('katalog_heli');
    }
    setTestResult(null);
    setFormError(null);
    setShowKey(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleTest = async () => {
    setFormError(null);
    setTestResult(null);
    setTesting(true);
    try {
      const result = await testSupabaseConnection({ url, anonKey, tableName });
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const validationError = validateSupabaseConfig({ url, anonKey, tableName });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      saveSupabaseConfig({ url, anonKey, tableName });
      onConfigChanged(`Zapisano połączenie Supabase (${tableName.trim() || 'katalog_heli'}).`);
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Nie udało się zapisać konfiguracji.');
    }
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTableName('katalog_heli');
    setHasSavedConfig(false);
    setTestResult(null);
    setFormError(null);
    onConfigChanged('Usunięto zapisane dane Supabase — przywrócono domyślne źródło danych.');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="supabase-config-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border border-[#CBD5E1] rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
          <div>
            <h2
              id="supabase-config-title"
              className="font-display text-base font-bold text-[#0F172A]"
            >
              Konfiguracja połączenia Supabase
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Dane zapisywane są lokalnie w przeglądarce i działają bezpośrednio na GitHub Pages.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij konfigurację"
            className="p-1.5 text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[76vh] overflow-y-auto">
          <div className="text-xs text-[#475569] flex items-center gap-2">
            <span>Aktualne źródło:</span>
            <strong className="font-semibold text-[#0F172A]">
              {activeSource === 'storage'
                ? 'Zapisane w przeglądarce (Supabase)'
                : activeSource === 'env'
                  ? 'Zmienne wdrożenia (Supabase)'
                  : 'Tryb podglądu (zestaw przykładowy)'}
            </strong>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="supabase-url-input"
              className="block text-xs font-semibold text-[#0F172A]"
            >
              Supabase Project URL
            </label>
            <input
              id="supabase-url-input"
              type="url"
              required
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setFormError(null);
              }}
              placeholder="https://twoj-projekt.supabase.co"
              autoComplete="off"
              className="w-full h-9 px-3 text-[13px] font-mono bg-[#F8F9FA] text-[#0F172A] placeholder:text-[#94A3B8] border border-[#CBD5E1] rounded-md focus:bg-white focus:border-[#D61F26] focus:outline-none focus:ring-2 focus:ring-[#D61F26]/15"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="supabase-key-input"
              className="block text-xs font-semibold text-[#0F172A]"
            >
              Publiczny klucz API (Anon / Publishable Key)
            </label>
            <div className="relative">
              <input
                id="supabase-key-input"
                type={showKey ? 'text' : 'password'}
                required
                value={anonKey}
                onChange={(e) => {
                  setAnonKey(e.target.value);
                  setFormError(null);
                }}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                autoComplete="off"
                spellCheck={false}
                className="w-full h-9 pl-3 pr-9 text-[13px] font-mono bg-[#F8F9FA] text-[#0F172A] placeholder:text-[#94A3B8] border border-[#CBD5E1] rounded-md focus:bg-white focus:border-[#D61F26] focus:outline-none focus:ring-2 focus:ring-[#D61F26]/15"
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                aria-label={showKey ? 'Ukryj klucz' : 'Pokaż klucz'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#0F172A] rounded"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Wklej wyłącznie publiczny klucz <span className="font-mono text-[#0F172A]">anon</span>{' '}
              lub <span className="font-mono text-[#0F172A]">publishable</span> (z ustawień Project
              Settings → API). Nigdy nie używaj klucza{' '}
              <span className="font-mono text-[#0F172A]">service_role</span> w przeglądarce.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="supabase-table-input"
              className="block text-xs font-semibold text-[#0F172A]"
            >
              Nazwa tabeli w bazie
            </label>
            <input
              id="supabase-table-input"
              type="text"
              required
              value={tableName}
              onChange={(e) => {
                setTableName(e.target.value);
                setFormError(null);
              }}
              placeholder="katalog_heli"
              className="w-full h-9 px-3 text-[13px] font-mono bg-[#F8F9FA] text-[#0F172A] placeholder:text-[#94A3B8] border border-[#CBD5E1] rounded-md focus:bg-white focus:border-[#D61F26] focus:outline-none focus:ring-2 focus:ring-[#D61F26]/15"
            />
          </div>

          {formError && (
            <div
              role="alert"
              className="p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626] mt-0.5" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          {testResult && (
            <div
              role="status"
              className={`p-3 rounded-md border text-xs space-y-2 ${
                testResult.ok
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
              }`}
            >
              <div className="flex items-start gap-2">
                {testResult.ok ? (
                  <CheckCircle2
                    className="w-4 h-4 shrink-0 text-[#16A34A] mt-0.5"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertCircle
                    className="w-4 h-4 shrink-0 text-[#DC2626] mt-0.5"
                    aria-hidden="true"
                  />
                )}
                <span className="font-medium">{testResult.message}</span>
              </div>

              {testResult.ok && testResult.mappedColumns && !testResult.emptyTableHint && (
                <div className="pt-1 border-t border-[#BBF7D0]/80 text-[11px] text-[#15803D]">
                  <span className="font-semibold">Automatycznie zmapowane kolumny: </span>
                  <span className="font-mono">
                    {CATALOG_COLUMNS.map(
                      (c) => `${c.shortLabel} → ${testResult.mappedColumns?.[c.key]}`
                    ).join(' · ')}
                  </span>
                </div>
              )}

              {testResult.emptyTableHint && (
                <div className="pt-1.5 border-t border-[#BBF7D0]/80 space-y-1 text-[#166534]">
                  <p className="font-medium">
                    Jeśli włączyłeś RLS w Supabase, dodaj politykę odczytu w SQL Editor:
                  </p>
                  <pre className="p-2 bg-white/80 rounded border border-[#BBF7D0] font-mono text-[11px] text-[#0F172A] overflow-x-auto">
{`CREATE POLICY "Publiczny odczyt katalogu"
ON public.${tableName.trim() || 'katalog_heli'}
FOR SELECT USING (true);`}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
              >
                {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                <span>{testing ? 'Testowanie…' : 'Testuj połączenie'}</span>
              </button>

              {hasSavedConfig && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] rounded-md transition-colors whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Usuń zapisane</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-md transition-colors whitespace-nowrap"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#D61F26] hover:bg-[#B91C1C] rounded-md transition-colors whitespace-nowrap"
              >
                Zapisz i połącz
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
