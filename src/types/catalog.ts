export type ColumnKey =
  | 'lp'
  | 'modelWozka'
  | 'nrKatalogowy'
  | 'nazwaPl'
  | 'nazwaEn'
  | 'nazwaCn'
  | 'ilosc'
  | 'uwagi'
  | 'stronaPdf';

export type SortDirection = 'asc' | 'desc';

export interface CatalogPart {
  lp: number | string;
  modelWozka: string;
  nrKatalogowy: string;
  nazwaPl: string;
  nazwaEn: string;
  nazwaCn: string;
  ilosc: number | string;
  uwagi: string;
  stronaPdf: number | string;
}

export type ColumnFilters = Record<ColumnKey, string>;

export interface ColumnDefinition {
  key: ColumnKey;
  label: string;
  shortLabel: string;
  placeholder: string;
  numeric?: boolean;
  monospace?: boolean;
  minWidth: string;
  align: 'left' | 'right';
}

export interface CategoryOption {
  id: string;
  label: string;
  sublabel: string;
  keywords: string[];
}

export interface CatalogMetaResponse {
  mode: 'supabase' | 'demo';
  tableName: string;
  totalEstimate: number;
  mappedColumns: Record<ColumnKey, string>;
  connectionNotice?: string;
  maxExportRows: number;
}

export interface CatalogPartsResponse {
  mode: 'supabase' | 'demo';
  items: CatalogPart[];
  total: number;
  totalIsEstimate?: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const EMPTY_COLUMN_FILTERS: ColumnFilters = {
  lp: '',
  modelWozka: '',
  nrKatalogowy: '',
  nazwaPl: '',
  nazwaEn: '',
  nazwaCn: '',
  ilosc: '',
  uwagi: '',
  stronaPdf: '',
};

export const CATALOG_COLUMNS: ColumnDefinition[] = [
  {
    key: 'lp',
    label: 'Lp',
    shortLabel: 'Lp',
    placeholder: 'np. 1-500',
    numeric: true,
    monospace: true,
    minWidth: '96px',
    align: 'right',
  },
  {
    key: 'modelWozka',
    label: 'Model wózka',
    shortLabel: 'Model',
    placeholder: 'np. CBD16',
    monospace: true,
    minWidth: '164px',
    align: 'left',
  },
  {
    key: 'nrKatalogowy',
    label: 'Nr katalogowy',
    shortLabel: 'Nr kat.',
    placeholder: 'np. Z-32014',
    monospace: true,
    minWidth: '188px',
    align: 'left',
  },
  {
    key: 'nazwaPl',
    label: 'Nazwa towaru (PL)',
    shortLabel: 'Nazwa PL',
    placeholder: 'Filtruj PL…',
    minWidth: '240px',
    align: 'left',
  },
  {
    key: 'nazwaEn',
    label: 'Nazwa towaru (EN)',
    shortLabel: 'Nazwa EN',
    placeholder: 'Filter EN…',
    minWidth: '220px',
    align: 'left',
  },
  {
    key: 'nazwaCn',
    label: 'Nazwa towaru (CN)',
    shortLabel: 'Nazwa CN',
    placeholder: '中文…',
    minWidth: '172px',
    align: 'left',
  },
  {
    key: 'ilosc',
    label: 'Ilość',
    shortLabel: 'Ilość',
    placeholder: 'np. 2 lub >=4',
    numeric: true,
    monospace: true,
    minWidth: '96px',
    align: 'right',
  },
  {
    key: 'uwagi',
    label: 'Uwagi',
    shortLabel: 'Uwagi',
    placeholder: 'Specyfikacja…',
    minWidth: '190px',
    align: 'left',
  },
  {
    key: 'stronaPdf',
    label: 'Strona w PDF',
    shortLabel: 'PDF',
    placeholder: 'np. 12-40',
    numeric: true,
    monospace: true,
    minWidth: '112px',
    align: 'right',
  },
];

export const TRUCK_SERIES_CATEGORIES: CategoryOption[] = [
  {
    id: 'all',
    label: 'Wszystkie serie',
    sublabel: 'Pełny katalog HELI',
    keywords: [],
  },
  {
    id: 'CBD',
    label: 'Seria CBD',
    sublabel: 'Paletowe elektryczne',
    keywords: ['CBD'],
  },
  {
    id: 'CPCD',
    label: 'Seria CPCD',
    sublabel: 'Czołowe spalinowe Diesel',
    keywords: ['CPCD'],
  },
  {
    id: 'CPD',
    label: 'Seria CPD',
    sublabel: 'Czołowe elektryczne',
    keywords: ['CPD'],
  },
  {
    id: 'CDD',
    label: 'Seria CDD',
    sublabel: 'Podnośnikowe elektryczne',
    keywords: ['CDD'],
  },
  {
    id: 'CQD',
    label: 'Seria CQD',
    sublabel: 'Wysokiego składowania',
    keywords: ['CQD'],
  },
  {
    id: 'CPQD',
    label: 'Seria CPQD',
    sublabel: 'Spalinowe benzyna / LPG',
    keywords: ['CPQD'],
  },
];

export const PART_GROUP_CATEGORIES: CategoryOption[] = [
  {
    id: 'all',
    label: 'Wszystkie podzespoły',
    sublabel: 'Bez ograniczenia grupy',
    keywords: [],
  },
  {
    id: 'naped',
    label: 'Napęd i przekładnie',
    sublabel: 'Zespoły napędowe, koła, wały',
    keywords: ['napęd', 'przekładni', 'koło', 'wał', 'silnik', 'półoś', 'sprzęgł'],
  },
  {
    id: 'lozyska',
    label: 'Łożyska i uszczelnienia',
    sublabel: 'Łożyska, simeringi, oringi',
    keywords: ['łożysk', 'uszczel', 'simering', 'pierścień', 'o-ring', 'tulej'],
  },
  {
    id: 'hydraulika',
    label: 'Hydraulika i siłowniki',
    sublabel: 'Siłowniki, pompy, zawory, węże',
    keywords: ['siłownik', 'hydraul', 'pompa', 'zawór', 'rozdzielacz', 'wąż', 'zestaw naprawczy'],
  },
  {
    id: 'maszt',
    label: 'Maszt i łańcuchy',
    sublabel: 'Rolki masztu, łańcuchy, karetki',
    keywords: ['maszt', 'łańcuch', 'rolk', 'karetk', 'widł', 'prowadnic'],
  },
  {
    id: 'hamulce_kierowanie',
    label: 'Hamulce i kierowanie',
    sublabel: 'Szczęki, cylinderki, zwrotnice',
    keywords: ['hamulc', 'szczęk', 'bęben', 'zwrotnic', 'drążek', 'kierownicz', 'sworzeń'],
  },
  {
    id: 'elektryka',
    label: 'Elektryka i sterowanie',
    sublabel: 'Sterowniki, styczniki, czujniki',
    keywords: ['sterownik', 'stycznik', 'czujnik', 'wiązk', 'przełącznik', 'akumulator', 'bezpiecznik', 'wyświetlacz', 'stacyjk'],
  },
  {
    id: 'filtry',
    label: 'Filtry i eksploatacja',
    sublabel: 'Filtry oleju, powietrza, paliwa',
    keywords: ['filtr', 'wkład', 'pasek', 'świec', 'chłodnic'],
  },
];
