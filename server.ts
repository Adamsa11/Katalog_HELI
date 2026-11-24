import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ALLOWED_COLUMNS,
  exportCatalogCsv,
  getCatalogMeta,
  queryCatalogParts,
  type CatalogQueryParams,
} from './server/supabaseCatalog.ts';
import type { ColumnFilters, ColumnKey, SortDirection } from './src/types/catalog.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseQueryParams(req: Request): CatalogQueryParams {
  const q = req.query;

  const rawPage = Number(q.page);
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 100000 ? rawPage : 1;

  const rawPageSize = Number(q.pageSize);
  const allowedPageSizes = [25, 50, 100, 250];
  const pageSize = allowedPageSizes.includes(rawPageSize) ? rawPageSize : 50;

  const rawSortBy = typeof q.sortBy === 'string' ? (q.sortBy as ColumnKey) : 'lp';
  const sortBy: ColumnKey = ALLOWED_COLUMNS.has(rawSortBy) ? rawSortBy : 'lp';

  const sortDir: SortDirection = q.sortDir === 'desc' ? 'desc' : 'asc';

  const globalSearch = typeof q.globalSearch === 'string' ? q.globalSearch.slice(0, 120) : '';
  const truckSeries = typeof q.truckSeries === 'string' ? q.truckSeries.slice(0, 40) : 'all';
  const partGroup = typeof q.partGroup === 'string' ? q.partGroup.slice(0, 40) : 'all';

  const filters: Partial<ColumnFilters> = {};
  for (const col of ALLOWED_COLUMNS) {
    const paramKey = `f_${col}`;
    const val = q[paramKey];
    if (typeof val === 'string' && val.trim().length > 0) {
      filters[col] = val.trim().slice(0, 120);
    }
  }

  return {
    page,
    pageSize,
    sortBy,
    sortDir,
    globalSearch,
    truckSeries,
    partGroup,
    filters,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/catalog/meta', async (_req: Request, res: Response) => {
    try {
      const meta = await getCatalogMeta();
      res.json(meta);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nieznany błąd konfiguracji bazy.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/catalog/parts', async (req: Request, res: Response) => {
    try {
      const params = parseQueryParams(req);
      const result = await queryCatalogParts(params);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się pobrać danych katalogu.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/catalog/export', async (req: Request, res: Response) => {
    try {
      const params = parseQueryParams(req);
      const { csv, rowCount, truncated } = await exportCatalogCsv(params);
      const stamp = new Date().toISOString().slice(0, 10);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="katalog_heli_${stamp}.csv"`
      );
      res.setHeader('X-Export-Row-Count', String(rowCount));
      res.setHeader('X-Export-Truncated', truncated ? 'true' : 'false');
      res.send(csv);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się wygenerować pliku CSV.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Katalog HELI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
