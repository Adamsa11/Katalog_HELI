import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  PART_GROUP_CATEGORIES,
  TRUCK_SERIES_CATEGORIES,
  type CatalogMetaResponse,
  type CatalogPart,
  type CatalogPartsResponse,
  type ColumnFilters,
  type ColumnKey,
  type SortDirection,
} from '../src/types/catalog.ts';
import { DEMO_CATALOG } from './demoData.ts';

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
  nrKatalogowy: ['nrkatalogowy', 'numerkatalogowy', 'kodczesci', 'partnumber', 'partno', 'kod', 'sku', 'nrkat'],
  nazwaPl: ['nazwatowarupl', 'nazwapl', 'nazwa_pl', 'polskanazwa', 'opispl', 'namepl', 'towarpl'],
  nazwaEn: ['nazwatowaruen', 'nazwaen', 'nazwa_en', 'englishname', 'nameen', 'descriptionen', 'towaren'],
  nazwaCn: ['nazwatowarucn', 'nazwacn', 'nazwa_cn', 'chinesename', 'namecn', 'nazwachinska', 'towarcn'],
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

function getTableName(): string {
  const raw = (process.env.SUPABASE_TABLE_NAME || 'katalog_heli').trim();
  // Restrict table identifier strictly to safe SQL identifier chars
  return /^[a-zA-Z0-9_]+$/.test(raw) ? raw : 'katalog_heli';
}

function getSupabaseClient(): SupabaseClient | null {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

  if (!url || !key) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
  } catch {
    return null;
  }

  const configKey = `${url}::${key.slice(0, 12)}`;
  if (cachedClient && cachedConfigKey === configKey) {
    return cachedClient;
  }

  cachedClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  cachedConfigKey = configKey;
  cachedColumnMap = null;
  return cachedClient;
}

function applyEnvColumnOverrides(base: Record<ColumnKey, string>): Record<ColumnKey, string> {
  const envMap: Partial<Record<ColumnKey, string | undefined>> = {
    lp: process.env.SUPABASE_COL_LP,
    modelWozka: process.env.SUPABASE_COL_MODEL,
    nrKatalogowy: process.env.SUPABASE_COL_PART_NO,
    nazwaPl: process.env.SUPABASE_COL_NAME_PL,
    nazwaEn: process.env.SUPABASE_COL_NAME_EN,
    nazwaCn: process.env.SUPABASE_COL_NAME_CN,
    ilosc: process.env.SUPABASE_COL_QTY,
    uwagi: process.env.SUPABASE_COL_REMARKS,
    stronaPdf: process.env.SUPABASE_COL_PDF_PAGE,
  };

  const result = { ...base };
  for (const key of Object.keys(envMap) as ColumnKey[]) {
    const val = envMap[key]?.trim();
    if (val && val.length <= 120) {
      result[key] = val;
    }
  }
  return result;
}

async function resolveColumnMap(client: SupabaseClient): Promise<Record<ColumnKey, string>> {
  const now = Date.now();
  if (cachedColumnMap && now - cachedColumnMapTime < 5 * 60 * 1000) {
    return cachedColumnMap;
  }

  const table = getTableName();
  const { data, error } = await client.from(table).select('*').limit(1);

  if (error || !data || data.length === 0) {
    return applyEnvColumnOverrides(DEFAULT_COLUMN_MAP);
  }

  const actualKeys = Object.keys(data[0] as Record<string, unknown>);
  const normalizedPairs = actualKeys.map((actual) => ({
    actual,
    norm: normalizeHeader(actual),
  }));

  const resolved: Record<ColumnKey, string> = { ...DEFAULT_COLUMN_MAP };
  const used = new Set<string>();

  for (const canonical of Object.keys(COLUMN_CANDIDATES) as ColumnKey[]) {
    const candidates = COLUMN_CANDIDATES[canonical];
    // 1. Exact normalized match
    let matched = normalizedPairs.find(
      (p) => !used.has(p.actual) && candidates.includes(p.norm)
    );
    // 2. Partial containment fallback
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

  const finalMap = applyEnvColumnOverrides(resolved);
  cachedColumnMap = finalMap;
  cachedColumnMapTime = now;
  return finalMap;
}

export function sanitizePostgrestTerm(raw: string): string {
  // Strip PostgREST syntax delimiters & wildcard injection characters
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

export function parseNumericFilter(raw: string): ParsedNumericFilter | null {
  const cleaned = raw.trim().replace(/\s+/g, '');
  if (!cleaned) return null;

  // Range: 10-50 or 10..50
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
  const tableName = getTableName();
  const client = getSupabaseClient();

  if (!client) {
    return {
      mode: 'demo',
      tableName,
      totalEstimate: DEMO_CATALOG.length,
      mappedColumns: DEFAULT_COLUMN_MAP,
      connectionNotice:
        'Tryb podglądu katalogu HELI. Ustaw SUPABASE_URL i SUPABASE_ANON_KEY w Secrets, aby podpiąć pełną tabelę katalog_heli (582 317 rekordów).',
      maxExportRows: MAX_EXPORT_ROWS,
    };
  }

  const colMap = await resolveColumnMap(client);
  let totalEstimate = 0;

  const { count, error } = await client
    .from(tableName)
    .select('*', { count: 'estimated', head: true });

  if (!error && typeof count === 'number') {
    totalEstimate = count;
  }

  return {
    mode: 'supabase',
    tableName,
    totalEstimate,
    mappedColumns: colMap,
    maxExportRows: MAX_EXPORT_ROWS,
  };
}

export async function queryCatalogParts(params: CatalogQueryParams): Promise<CatalogPartsResponse> {
  const client = getSupabaseClient();

  if (!client) {
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

  const tableName = getTableName();
  const colMap = await resolveColumnMap(client);
  const sortCol = colMap[params.sortBy];
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  const hasActiveFilters =
    Boolean(params.globalSearch.trim()) ||
    params.truckSeries !== 'all' ||
    params.partGroup !== 'all' ||
    Object.values(params.filters).some((v) => Boolean(v?.trim()));

  // For unfiltered 582k rows, 'estimated' avoids full sequential scan timeout while remaining instant.
  const countMode = hasActiveFilters ? 'exact' : 'estimated';

  let query = client.from(tableName).select('*', { count: countMode });
  query = applySupabaseFilters(query, params, colMap);
  query = query.order(sortCol, { ascending: params.sortDir === 'asc', nullsFirst: false });
  query = query.range(from, to);

  let { data, count, error } = await query;

  // Fallback to estimated count if exact count timed out on broad ILIKE query
  let totalIsEstimate = countMode === 'estimated';
  if (error && countMode === 'exact') {
    let retryQuery = client.from(tableName).select('*', { count: 'estimated' });
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
    throw new Error(`Błąd zapytania Supabase (${tableName}): ${error.message}`);
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
  // Neutralize spreadsheet formula injection (CSV Injection protection)
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
  const client = getSupabaseClient();
  let items: CatalogPart[] = [];
  let truncated = false;

  if (!client) {
    const allFiltered = applyDemoFiltering(params);
    truncated = allFiltered.length > MAX_EXPORT_ROWS;
    items = allFiltered.slice(0, MAX_EXPORT_ROWS);
  } else {
    const tableName = getTableName();
    const colMap = await resolveColumnMap(client);
    const sortCol = colMap[params.sortBy];
    const batchSize = 1000;
    let offset = 0;

    while (items.length < MAX_EXPORT_ROWS) {
      let query = client.from(tableName).select('*');
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

  // UTF-8 BOM + semicolon separator for instant Polish Excel & CJK compatibility
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
