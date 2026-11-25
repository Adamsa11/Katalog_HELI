# Katalog Części HELI (`katalog_heli`)

Statyczna przeglądarka katalogu części wózków widłowych HELI podłączona bezpośrednio do bazy Supabase.

## Publikacja na GitHub Pages

1. Wypchnij kod do repozytorium na gałęzi `main` lub `master`.
2. W ustawieniach repozytorium na GitHubie przejdź do **Settings → Pages**.
3. W sekcji **Build and deployment → Source** wybierz **GitHub Actions** (nie wybieraj *Deploy from a branch*).
4. Przejdź do zakładki **Actions** — workflow `Deploy Katalog HELI to GitHub Pages` automatycznie zbuduje folder `dist/` i opublikuje stronę.

## Podłączenie bazy Supabase

- **W przeglądarce**: kliknij **Konfiguracja** w górnym pasku aplikacji, wpisz `Supabase Project URL`, publiczny klucz `anon / publishable` i nazwę tabeli (`katalog_heli`), przetestuj połączenie i zapisz.
- **Przy budowaniu w GitHub Actions (opcjonalnie)**: dodaj w **Settings → Secrets and variables → Actions → Variables** zmienne:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_TABLE_NAME` (`katalog_heli`)
