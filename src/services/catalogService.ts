import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DEMO_CATALOG } from '../data/demoData';
import {
  PART_GROUP_CATEGORIES,
  TRUCK_SERIES_CATEGORIES,
  type CatalogMetaResponse,
  type CatalogPart,
  type CatalogPartsResponse,
  type ColumnFilters,
  type ColumnKey,
  type SortDirection,
} from '../types/catalog';

export const ALLOWED_COLUMNS: ReadonlySet<ColumnKey> = new Set<ColumnKey>([
  'lp',
  'modelWozka',
  'nrKatalogowy',
  'nazwaPl',
  'nazwaEn',
  'nazwaCn',
  'ilosc',
  'uwagi',
  'stronaPdf',
]);

export const NUMERIC_COLUMNS: ReadonlySet<ColumnKey> = new Set<ColumnKey>([
  'lp',
  'ilosc',
  'stronaPdf',
]);

export const MAX_EXPORT_ROWS = 10000;
const STORAGE_KEY = 'heli_catalog_supabase_config_v1';

export interface SupabaseConnectionConfig {
  url: string;
  anonKey: string;
  tableName: string;
}

export interface CatalogQueryParams {
  page: number;
  pageSize: number;
  sortBy: ColumnKey;
  sortDir: SortDirection;
  globalSearch: string;
  truckSeries: string;
  partGroup: string;
  filters: Partial<ColumnFilters>;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  rowCountEstimate?: number;
  mappedColumns?: Record<ColumnKey, string>;
  detectedRawColumns?: string[];
  emptyTableHint?: boolean;
}

interface ParsedNumericFilter {
  kind: 'exact' | 'range' | 'gte' | 'lte' | 'gt' | 'lt';
  value?: number;
  min?: number;
  max?: number;
}

const DEFAULT_COLUMN_MAP: Record<ColumnKey, string> = {
  lp: 'Lp',
  modelWozka: 'Model wózka',
  nrKatalogowy: 'Nr katalogowy',
  nazwaPl: 'Nazwa towaru (PL)',
  nazwaEn: 'Nazwa towaru (EN)',
  nazwaCn: 'Nazwa towaru (CN)',
  ilosc: 'Ilość',
  uwagi: 'Uwagi',
  stronaPdf: 'Strona w PDF',
};

const COLUMN_CANDIDATES: Record<ColumnKey, string[]> = {
  lp: ['lp', 'id', 'nr', 'numerporzadkowy', 'numer', 'row_number', 'index'],
  modelWozka: ['modelwozka', 'model', 'wozek', 'forkliftmodel', 'truckmodel', 'modelpdf'],
  nrKatalogowy: [
    'nrkatalogowy',
    'numerkatalogowy',
    'kodczesci',
    'partnumber',
    'partno',
    'kod',
    'sku',
    'nrkat',
  ],
  nazwaPl: ['nazwatowarupl', 'nazwapl', 'nazwa_pl', 'polskanazwa', 'opispl', 'namepl', 'towarpl'],
  nazwaEn: [
    'nazwatowaruen',
    'nazwaen',
    'nazwa_en',
    'englishname',
    'nameen',
    'descriptionen',
    'towaren',
  ],
  nazwaCn: [
    'nazwatowarucn',
    'nazwacn',
    'nazwa_cn',
    'chinesename',
    'namecn',
    'nazwachinska',
    'towarcn',
  ],
  ilosc: ['ilosc', 'qty', 'quantity', 'sztuk', 'liczbasztuk'],
  uwagi: ['uwagi', 'remarks', 'specyfikacja', 'notatki', 'notes', 'comment', 'komentarz'],
  stronaPdf: ['stronawpdf', 'stronapdf', 'pdfpage', 'page', 'strona', 'nrstrony'],
};

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';
let cachedColumnMap: Record<ColumnKey, string> | null = null;
let cachedColumnMapTime = 0;

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function sanitizeTableName(raw: string): string {
  const cleaned = raw.trim();
  return /^[a-zA-Z0-9_]+$/.test(cleaned) ? cleaned : 'katalog_heli';
}

/**
 * Prevents accidentally saving a privileged Supabase service_role JWT in browser storage.
 */
export function isServiceRoleKey(key: string): boolean {
  const trimmed = key.trim();
  if (trimmed.startsWith('sb_secret_')) return true;
  const parts = trimmed.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json) as { role?: string };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

export function validateSupabaseConfig(config: SupabaseConnectionConfig): string | null {
  const url = config.url.trim();
  const anonKey = config.anonKey.trim();
  const tableName = config.tableName.trim();

  if (!url) {
    return 'Podaj adres URL projektu Supabase (np. https://xxxx.supabase.co).';
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return 'Adres Supabase URL musi zaczynać się od https://.';
    }
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
      return 'Podaj publiczny adres projektu Supabase (https://...supabase.co).';
    }
  } catch {
    return 'Nieprawidłowy format adresu URL projektu Supabase.';
  }

  if (!anonKey) {
    return 'Podaj publiczny klucz Supabase (anon / publishable key).';
  }

  if (isServiceRoleKey(anonKey)) {
    return 'Wykryto klucz service_role / secret! W aplikacji przeglądarkowej i na GitHub Pages używaj wyłącznie publicznego klucza anon / publishable z polityką RLS.';
  }

  if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
    return 'Nazwa tabeli może zawierać wyłącznie litery, cyfry oraz znak podkreślenia (_).';
  }

  return null;
}

export function getSavedSupabaseConfig(): SupabaseConnectionConfig | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SupabaseConnectionConfig>;
    if (!parsed.url || !parsed.anonKey) return null;
    return {
      url: String(parsed.url).trim(),
      anonKey: String(parsed.anonKey).trim(),
      tableName: sanitizeTableName(String(parsed.tableName || 'katalog_heli')),
    };
  } catch {
    return null;
  }
}

export function getEnvSupabaseConfig(): SupabaseConnectionConfig | null {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  const tableName = sanitizeTableName(import.meta.env.VITE_SUPABASE_TABLE_NAME || 'katalog_heli');
  if (!url || !anonKey) return null;
  return { url, anonKey, tableName };
}

export function getActiveSupabaseConfig(): {
  config: SupabaseConnectionConfig | null;
  source: 'storage' | 'env' | 'demo';
} {
  const saved = getSavedSupabaseConfig();
  if (saved && !validateSupabaseConfig(saved)) {
    return { config: saved, source: 'storage' };
  }
  const env = getEnvSupabaseConfig();
  if (env && !validateSupabaseConfig(env)) {
    return { config: env, source: 'env' };
  }
  return { config: null, source: 'demo' };
}

export function saveSupabaseConfig(config: SupabaseConnectionConfig): void {
  const error = validateSupabaseConfig(config);
  if (error) {
    throw new Error(error);
  }
  const normalized: SupabaseConnectionConfig = {
    url: config.url.trim().replace(/\/+$/, ''),
    anonKey: config.anonKey.trim(),
    tableName: sanitizeTableName(config.tableName || 'katalog_heli'),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  resetSupabaseCache();
}

export function clearSupabaseConfig(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  resetSupabaseCache();
}

export function resetSupabaseCache(): void {
  cachedClient = null;
  cachedConfigKey = '';
  cachedColumnMap = null;
  cachedColumnMapTime = 0;
}

function createScopedClient(config: SupabaseConnectionConfig): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function getSupabaseClient(): { client: SupabaseClient; tableName: string } | null {
  const { config } = getActiveSupabaseConfig();
  if (!config) return null;

  const configKey = `${config.url}::${config.tableName}::${config.anonKey.slice(0, 12)}`;
  if (cachedClient && cachedConfigKey === configKey) {
    return { client: cachedClient, tableName: config.tableName };
  }

  cachedClient = createScopedClient(config);
  cachedConfigKey = configKey;
  cachedColumnMap = null;
  cachedColumnMapTime = 0;
  return { client: cachedClient, tableName: config.tableName };
}

function inferColumnMapFromRow(sampleRow: Record<string, unknown>): Record<ColumnKey, string> {
  const actualKeys = Object.keys(sampleRow);
  const normalizedPairs = actualKeys.map((actual) => ({
    actual,
    norm: normalizeHeader(actual),
  }));

  const resolved: Record<ColumnKey, string> = { ...DEFAULT_COLUMN_MAP };
  const used = new Set<string>();

  for (const canonical of Object.keys(COLUMN_CANDIDATES) as ColumnKey[]) {
    const candidates = COLUMN_CANDIDATES[canonical];
    let matched = normalizedPairs.find(
      (p) => !used.has(p.actual) && candidates.includes(p.norm)
    );
    if (!matched) {
      matched = normalizedPairs.find(
        (p) =>
          !used.has(p.actual) &&
          candidates.some((cand) => cand.length >= 3 && p.norm.includes(cand))
      );
    }
    if (matched) {
      resolved[canonical] = matched.actual;
      used.add(matched.actual);
    }
  }

  return resolved;
}

async function resolveColumnMap(
  client: SupabaseClient,
  tableName: string
): Promise<Record<ColumnKey, string>> {
  const now = Date.now();
  if (cachedColumnMap && now - cachedColumnMapTime < 5 * 60 * 1000) {
    return cachedColumnMap;
  }

  const { data, error } = await client.from(tableName).select('*').limit(1);
  if (error || !data || data.length === 0) {
    return DEFAULT_COLUMN_MAP;
  }

  const inferred = inferColumnMapFromRow(data[0] as Record<string, unknown>);
  cachedColumnMap = inferred;
  cachedColumnMapTime = now;
  return inferred;
}

export async function testSupabaseConnection(
  config: SupabaseConnectionConfig
): Promise<ConnectionTestResult> {
  const validationError = validateSupabaseConfig(config);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const normalized: SupabaseConnectionConfig = {
    url: config.url.trim().replace(/\/+$/, ''),
    anonKey: config.anonKey.trim(),
    tableName: sanitizeTableName(config.tableName || 'katalog_heli'),
  };

  try {
    const client = createScopedClient(normalized);
    const { data, error } = await client.from(normalized.tableName).select('*').limit(1);

    if (error) {
      return {
        ok: false,
        message: `Błąd połączenia z tabelą "${normalized.tableName}": ${error.message}`,
      };
    }

    const { count } = await client
      .from(normalized.tableName)
      .select('*', { count: 'estimated', head: true });

    const rows = (data || []) as Record<string, unknown>[];
    if (rows.length === 0) {
      return {
        ok: true,
        rowCountEstimate: count ?? 0,
        mappedColumns: DEFAULT_COLUMN_MAP,
        detectedRawColumns: [],
        emptyTableHint: true,
        message:
          'Połączono z Supabase, ale zapytanie zwróciło 0 wierszy. Sprawdź, czy tabela zawiera dane oraz czy włączono politykę RLS zezwalającą na odczyt (SELECT).',
      };
    }

    const mappedColumns = inferColumnMapFromRow(rows[0]);
    const detectedRawColumns = Object.keys(rows[0]);

    return {
      ok: true,
      rowCountEstimate: typeof count === 'number' ? count : rows.length,
      mappedColumns,
      detectedRawColumns,
      message: `Połączono pomyślnie z tabelą ${normalized.tableName} (${
        typeof count === 'number' ? `ok. ${count.toLocaleString('pl-PL')} rekordów` : 'wykryto rekordy'
      }).`,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `Nie udało się połączyć z Supabase: ${err.message}`
          : 'Nie udało się nawiązać połączenia z Supabase.',
    };
  }
}

function sanitizePostgrestTerm(raw: string): string {
  return raw
    .trim()
    .slice(0, 120)
    .replace(/[,()"*%\\%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function quotePostgrestCol(col: string): string {
  const safe = col.replace(/"/g, '');
  return `"${safe}"`;
}

function parseNumericFilter(raw: string): ParsedNumericFilter | null {
  const cleaned = raw.trim().replace(/\s+/g, '');
  if (!cleaned) return null;

  const rangeMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)(?:-|–|\.\.)(\d+(?:[.,]\d+)?)$/);
  if (rangeMatch) {
    const a = Number(rangeMatch[1].replace(',', '.'));
    const b = Number(rangeMatch[2].replace(',', '.'));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { kind: 'range', min: Math.min(a, b), max: Math.max(a, b) };
    }
  }

  const opMatch = cleaned.match(/^(>=|<=|>|<)(\d+(?:[.,]\d+)?)$/);
  if (opMatch) {
    const val = Number(opMatch[2].replace(',', '.'));
    if (Number.isFinite(val)) {
      const op = opMatch[1];
      if (op === '>=') return { kind: 'gte', value: val };
      if (op === '<=') return { kind: 'lte', value: val };
      if (op === '>') return { kind: 'gt', value: val };
      if (op === '<') return { kind: 'lt', value: val };
    }
  }

  const exactNum = Number(cleaned.replace(',', '.'));
  if (/^\d+(?:[.,]\d+)?$/.test(cleaned) && Number.isFinite(exactNum)) {
    return { kind: 'exact', value: exactNum };
  }

  return null;
}

function mapRawRow(row: Record<string, unknown>, colMap: Record<ColumnKey, string>): CatalogPart {
  const readStr = (key: ColumnKey): string => {
    const val = row[colMap[key]];
    if (val === null || val === undefined) return '';
    return String(val);
  };
  const readNumOrStr = (key: ColumnKey): number | string => {
    const val = row[colMap[key]];
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') return val;
    const str = String(val).trim();
    if (/^\d+(?:\.\d+)?$/.test(str)) return Number(str);
    return str;
  };

  return {
    lp: readNumOrStr('lp'),
    modelWozka: readStr('modelWozka'),
    nrKatalogowy: readStr('nrKatalogowy'),
    nazwaPl: readStr('nazwaPl'),
    nazwaEn: readStr('nazwaEn'),
    nazwaCn: readStr('nazwaCn'),
    ilosc: readNumOrStr('ilosc'),
    uwagi: readStr('uwagi'),
    stronaPdf: readNumOrStr('stronaPdf'),
  };
}

function applyDemoFiltering(params: CatalogQueryParams): CatalogPart[] {
  const { globalSearch, truckSeries, partGroup, filters, sortBy, sortDir } = params;
  const globalNorm = globalSearch.trim().toLowerCase();

  const seriesObj = TRUCK_SERIES_CATEGORIES.find((c) => c.id === truckSeries);
  const groupObj = PART_GROUP_CATEGORIES.find((c) => c.id === partGroup);

  const filtered = DEMO_CATALOG.filter((item) => {
    if (seriesObj && seriesObj.keywords.length > 0) {
      const modelUpper = item.modelWozka.toUpperCase();
      const matchesSeries = seriesObj.keywords.some((kw) =>
        modelUpper.startsWith(kw.toUpperCase())
      );
      if (!matchesSeries) return false;
    }

    if (groupObj && groupObj.keywords.length > 0) {
      const plLower = `${item.nazwaPl} ${item.uwagi}`.toLowerCase();
      const matchesGroup = groupObj.keywords.some((kw) => plLower.includes(kw.toLowerCase()));
      if (!matchesGroup) return false;
    }

    if (globalNorm) {
      const haystack = [
        String(item.lp),
        item.modelWozka,
        item.nrKatalogowy,
        item.nazwaPl,
        item.nazwaEn,
        item.nazwaCn,
        item.uwagi,
        String(item.stronaPdf),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(globalNorm)) return false;
    }

    for (const key of ALLOWED_COLUMNS) {
      const rawFilter = filters[key]?.trim();
      if (!rawFilter) continue;

      if (NUMERIC_COLUMNS.has(key)) {
        const parsed = parseNumericFilter(rawFilter);
        const itemNum = Number(item[key]);
        if (parsed && Number.isFinite(itemNum)) {
          if (parsed.kind === 'exact' && itemNum !== parsed.value) return false;
          if (parsed.kind === 'range' && (itemNum < parsed.min! || itemNum > parsed.max!)) {
            return false;
          }
          if (parsed.kind === 'gte' && itemNum < parsed.value!) return false;
          if (parsed.kind === 'lte' && itemNum > parsed.value!) return false;
          if (parsed.kind === 'gt' && itemNum <= parsed.value!) return false;
          if (parsed.kind === 'lt' && itemNum >= parsed.value!) return false;
        } else {
          if (!String(item[key]).toLowerCase().includes(rawFilter.toLowerCase())) return false;
        }
      } else {
        const cell = String(item[key] ?? '').toLowerCase();
        if (!cell.includes(rawFilter.toLowerCase())) return false;
      }
    }

    return true;
  });

  const dirMultiplier = sortDir === 'desc' ? -1 : 1;
  filtered.sort((a, b) => {
    const valA = a[sortBy];
    const valB = b[sortBy];
    if (NUMERIC_COLUMNS.has(sortBy)) {
      const numA = Number(valA);
      const numB = Number(valB);
      if (Number.isFinite(numA) && Number.isFinite(numB)) {
        return (numA - numB) * dirMultiplier;
      }
    }
    return String(valA).localeCompare(String(valB), 'pl', { numeric: true }) * dirMultiplier;
  });

  return filtered;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySupabaseFilters(query: any, params: CatalogQueryParams, colMap: Record<ColumnKey, string>) {
  let q = query;

  const seriesObj = TRUCK_SERIES_CATEGORIES.find((c) => c.id === params.truckSeries);
  if (seriesObj && seriesObj.keywords.length > 0) {
    const seriesExprs = seriesObj.keywords
      .map((kw) => sanitizePostgrestTerm(kw))
      .filter(Boolean)
      .map((kw) => `${quotePostgrestCol(colMap.modelWozka)}.ilike.${kw}%`);
    if (seriesExprs.length > 0) {
      q = q.or(seriesExprs.join(','));
    }
  }

  const groupObj = PART_GROUP_CATEGORIES.find((c) => c.id === params.partGroup);
  if (groupObj && groupObj.keywords.length > 0) {
    const groupExprs = groupObj.keywords
      .map((kw) => sanitizePostgrestTerm(kw))
      .filter(Boolean)
      .map((kw) => `${quotePostgrestCol(colMap.nazwaPl)}.ilike.%${kw}%`);
    if (groupExprs.length > 0) {
      q = q.or(groupExprs.join(','));
    }
  }

  const cleanGlobal = sanitizePostgrestTerm(params.globalSearch);
  if (cleanGlobal) {
    const searchCols: ColumnKey[] = [
      'modelWozka',
      'nrKatalogowy',
      'nazwaPl',
      'nazwaEn',
      'nazwaCn',
      'uwagi',
    ];
    const orClauses = searchCols.map(
      (colKey) => `${quotePostgrestCol(colMap[colKey])}.ilike.%${cleanGlobal}%`
    );
    q = q.or(orClauses.join(','));
  }

  for (const key of ALLOWED_COLUMNS) {
    const rawFilter = params.filters[key]?.trim();
    if (!rawFilter) continue;

    const dbCol = colMap[key];
    if (NUMERIC_COLUMNS.has(key)) {
      const parsed = parseNumericFilter(rawFilter);
      if (parsed) {
        if (parsed.kind === 'exact') q = q.eq(dbCol, parsed.value);
        else if (parsed.kind === 'range') q = q.gte(dbCol, parsed.min).lte(dbCol, parsed.max);
        else if (parsed.kind === 'gte') q = q.gte(dbCol, parsed.value);
        else if (parsed.kind === 'lte') q = q.lte(dbCol, parsed.value);
        else if (parsed.kind === 'gt') q = q.gt(dbCol, parsed.value);
        else if (parsed.kind === 'lt') q = q.lt(dbCol, parsed.value);
        continue;
      }
    }

    const sanitized = sanitizePostgrestTerm(rawFilter);
    if (sanitized) {
      q = q.ilike(dbCol, `%${sanitized}%`);
    }
  }

  return q;
}

export async function getCatalogMeta(): Promise<CatalogMetaResponse> {
  const conn = getSupabaseClient();
  if (!conn) {
    return {
      mode: 'demo',
      tableName: 'katalog_heli',
      totalEstimate: DEMO_CATALOG.length,
      mappedColumns: DEFAULT_COLUMN_MAP,
      connectionNotice:
        'Tryb podglądu katalogu HELI. Kliknij „Konfiguracja” w górnym panelu, aby zapisać dane połączenia z Supabase (katalog_heli).',
      maxExportRows: MAX_EXPORT_ROWS,
    };
  }

  const colMap = await resolveColumnMap(conn.client, conn.tableName);
  let totalEstimate = 0;

  const { count, error } = await conn.client
    .from(conn.tableName)
    .select('*', { count: 'estimated', head: true });

  if (!error && typeof count === 'number') {
    totalEstimate = count;
  }

  return {
    mode: 'supabase',
    tableName: conn.tableName,
    totalEstimate,
    mappedColumns: colMap,
    maxExportRows: MAX_EXPORT_ROWS,
  };
}

export async function queryCatalogParts(params: CatalogQueryParams): Promise<CatalogPartsResponse> {
  const conn = getSupabaseClient();

  if (!conn) {
    const allFiltered = applyDemoFiltering(params);
    const total = allFiltered.length;
    const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
    const safePage = Math.min(Math.max(1, params.page), totalPages);
    const start = (safePage - 1) * params.pageSize;
    const items = allFiltered.slice(start, start + params.pageSize);

    return {
      mode: 'demo',
      items,
      total,
      page: safePage,
      pageSize: params.pageSize,
      totalPages,
    };
  }

  const colMap = await resolveColumnMap(conn.client, conn.tableName);
  const sortCol = colMap[params.sortBy];
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  const hasActiveFilters =
    Boolean(params.globalSearch.trim()) ||
    params.truckSeries !== 'all' ||
    params.partGroup !== 'all' ||
    Object.values(params.filters).some((v) => Boolean(v?.trim()));

  const countMode = hasActiveFilters ? 'exact' : 'estimated';

  let query = conn.client.from(conn.tableName).select('*', { count: countMode });
  query = applySupabaseFilters(query, params, colMap);
  query = query.order(sortCol, { ascending: params.sortDir === 'asc', nullsFirst: false });
  query = query.range(from, to);

  let { data, count, error } = await query;
  let totalIsEstimate = countMode === 'estimated';

  if (error && countMode === 'exact') {
    let retryQuery = conn.client.from(conn.tableName).select('*', { count: 'estimated' });
    retryQuery = applySupabaseFilters(retryQuery, params, colMap);
    retryQuery = retryQuery.order(sortCol, {
      ascending: params.sortDir === 'asc',
      nullsFirst: false,
    });
    retryQuery = retryQuery.range(from, to);
    const retry = await retryQuery;
    data = retry.data;
    count = retry.count;
    error = retry.error;
    totalIsEstimate = true;
  }

  if (error) {
    throw new Error(`Błąd zapytania Supabase (${conn.tableName}): ${error.message}`);
  }

  const rows = (data || []) as Record<string, unknown>[];
  const items = rows.map((row) => mapRawRow(row, colMap));
  const total = typeof count === 'number' ? count : from + items.length;
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  return {
    mode: 'supabase',
    items,
    total,
    totalIsEstimate,
    page: params.page,
    pageSize: params.pageSize,
    totalPages,
  };
}

function escapeCsvCell(rawValue: unknown): string {
  let str = rawValue === null || rawValue === undefined ? '' : String(rawValue);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  const needsQuotes = /[;"\n\r,]/.test(str);
  if (needsQuotes) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportCatalogCsv(
  params: CatalogQueryParams
): Promise<{ csv: string; rowCount: number; truncated: boolean }> {
  const conn = getSupabaseClient();
  let items: CatalogPart[] = [];
  let truncated = false;

  if (!conn) {
    const allFiltered = applyDemoFiltering(params);
    truncated = allFiltered.length > MAX_EXPORT_ROWS;
    items = allFiltered.slice(0, MAX_EXPORT_ROWS);
  } else {
    const colMap = await resolveColumnMap(conn.client, conn.tableName);
    const sortCol = colMap[params.sortBy];
    const batchSize = 1000;
    let offset = 0;

    while (items.length < MAX_EXPORT_ROWS) {
      let query = conn.client.from(conn.tableName).select('*');
      query = applySupabaseFilters(query, params, colMap);
      query = query.order(sortCol, { ascending: params.sortDir === 'asc', nullsFirst: false });
      query = query.range(offset, offset + batchSize - 1);

      const { data, error } = await query;
      if (error) {
        throw new Error(`Błąd eksportu CSV z Supabase: ${error.message}`);
      }

      const rows = (data || []) as Record<string, unknown>[];
      const mapped = rows.map((row) => mapRawRow(row, colMap));
      items.push(...mapped);

      if (rows.length < batchSize) {
        break;
      }
      offset += batchSize;
      if (items.length >= MAX_EXPORT_ROWS) {
        truncated = true;
        items = items.slice(0, MAX_EXPORT_ROWS);
        break;
      }
    }
  }

  const headers = [
    'Lp',
    'Model wózka',
    'Nr katalogowy',
    'Nazwa towaru (PL)',
    'Nazwa towaru (EN)',
    'Nazwa towaru (CN)',
    'Ilość',
    'Uwagi',
    'Strona w PDF',
  ];

  const lines = [headers.map(escapeCsvCell).join(';')];
  for (const item of items) {
    lines.push(
      [
        item.lp,
        item.modelWozka,
        item.nrKatalogowy,
        item.nazwaPl,
        item.nazwaEn,
        item.nazwaCn,
        item.ilosc,
        item.uwagi,
        item.stronaPdf,
      ]
        .map(escapeCsvCell)
        .join(';')
    );
  }

  return {
    csv: `\uFEFF${lines.join('\r\n')}`,
    rowCount: items.length,
    truncated,
  };
}
