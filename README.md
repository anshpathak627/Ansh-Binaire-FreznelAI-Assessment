# Model Search

A desktop web app (Vite + React + TypeScript + Adobe React Spectrum) for browsing, searching,
filtering, and sorting ML models from the public HuggingFace models API
(`https://huggingface.co/api/models`), built for the Binaire Private Limited take-home assessment.

## Setup

```bash
npm install
npm run dev
```

Then open the printed local URL (typically http://localhost:5173, or the next free port).

## Environment variables (`.env`)

A `.env` is already checked in with mock auth enabled so the app runs out of the box. See
`.env.example` for the documented template.

| Variable | Purpose |
|---|---|
| `VITE_AUTH_MOCK` | `"true"` uses a localStorage-backed mock auth (no Firebase project needed, default). `"false"` uses real Firebase Authentication. |
| `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_AUTH_DOMAIN` / `VITE_FIREBASE_PROJECT_ID` / `VITE_FIREBASE_APP_ID` | Only needed when `VITE_AUTH_MOCK=false`. Fill in from your Firebase project's web app config (Firebase console → Project settings → General → Your apps). Enable Email/Password sign-in under Authentication → Sign-in method. |

## Requirement → implementation map

| Requirement | Where |
|---|---|
| Search by name (substring, anywhere) and family | `src/lib/ModelQueryBuilder.ts` (`apply()`), family derivation in `src/types/model.ts` (`deriveFamily`) |
| Debounce (keystrokes) | `src/lib/Debouncer.ts`, used in `src/hooks/useModelSearch.ts` (`handleSearchInput`) |
| Throttle (network trigger) | `src/lib/Throttler.ts`, used in `src/hooks/useModelSearch.ts` (`loadModels`) — see the comment in `Debouncer.ts` explaining why both exist |
| Filter: pipeline tag, family, architecture tag, precision/weight tag | `ModelQueryBuilder.apply()`, tag derivation in `src/types/model.ts`, UI in `src/components/ModelFilters.tsx` |
| Filter: safetensor count min–max range slider | `ModelFilters.tsx` (`RangeSlider`), `ModelQueryBuilder.setSafetensorRange` |
| Sort: safetensor count asc/desc, name A→Z/Z→A | `ModelQueryBuilder.sortModels`, `Picker` in `ModelFilters.tsx` |
| All filters/search combine with AND | `ModelQueryBuilder.apply()` — single filter predicate chains every condition |
| Sign-up screen, Firebase auth + mock fallback | `src/lib/firebase.ts`, `src/components/AuthScreen.tsx`, gated in `src/App.tsx` |
| Animations between screens / on list updates | `src/App.css` (`fade-in`, `fade-in-item`, hover transitions), applied in `App.tsx` / `ModelList.tsx` |
| Offline-capable, full search/filter/sort against cache | `src/lib/OfflineCache.ts` (IndexedDB via `idb`), `src/lib/ModelApiClient.ts` fallback path |
| Realistic connectivity detection (not just `navigator.onLine`) + live banner | `src/lib/ConnectivityMonitor.ts` (online/offline events + periodic heartbeat probe against the HF API), `src/components/ConnectionBanner.tsx` |
| Background fetch without `async`/`await` | `src/lib/ModelApiClient.ts` — pure `.then()/.catch()/.finally()` chains, explained in a code comment there and in `DESIGN_NOTES.md` |
| Large-JSON download safety / corruption prevention | `ModelApiClient.readStreamSafely` (streamed reader) + `OfflineCache.stage`/`commitStaged` (atomic temp-then-swap), explained in `DESIGN_NOTES.md` |
| OOP architecture (classes) | `ModelApiClient`, `ModelQueryBuilder`, `Debouncer`, `Throttler`, `ConnectivityMonitor`, `OfflineCache` in `src/lib/` — components/hooks are thin consumers |
| TypeScript throughout | entire `src/` tree |
| Adobe React Spectrum UI | `Provider`/`defaultTheme` in `App.tsx`, all form/list controls in `AuthScreen.tsx`, `ModelFilters.tsx`, `ModelList.tsx`, `ConnectionBanner.tsx` |

## Notes / testing performed

- Verified in mock-auth mode (`VITE_AUTH_MOCK=true`): sign-up screen appears, an account can be
  created, and after sign-up the app fetches live data from `https://huggingface.co/api/models`,
  populates filter facets, and renders the model list.
- Verified the search box filters the list after a short debounce delay (typing "bert" narrowed
  200 loaded models down to 3 matching by name/family).
- Toggling `VITE_AUTH_MOCK=false` and filling in real Firebase web config switches the app to real
  Firebase Authentication with no other code changes.
- Offline behavior: data fetched once is staged and committed into IndexedDB (`model-search-cache`
  database); if a subsequent fetch fails (e.g. offline), the app falls back to the last committed
  cache and search/filter/sort continue to operate fully against it. The connection banner reflects
  live status via both browser online/offline events and a periodic heartbeat probe against the
  real API (not `navigator.onLine` alone).
