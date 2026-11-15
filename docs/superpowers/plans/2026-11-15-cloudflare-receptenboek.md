# Cloudflare-receptenboek Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recepten staan op Cloudflare en zijn via een receptenboek-code op meerdere apparaten te lezen en te wijzigen; lezen werkt ook offline.

**Architecture:** Eén Cloudflare Worker serveert de gebouwde SvelteKit-SPA als static assets en handelt `/api/*` af tegen een D1-database. In de app blijft IndexedDB de lokale leeskopie; schrijven gaat eerst naar de server en pas na bevestiging naar de lokale kopie. Een sync-functie trekt de lokale kopie gelijk met de server.

**Tech Stack:** SvelteKit 2 / Svelte 5 (`adapter-static`), `@vite-pwa/sveltekit`, Cloudflare Workers + static assets + D1, Wrangler ≥ 4.36, Vitest ≥ 4.1 met `@cloudflare/vitest-plugin`, `qrcode`.

**Spec:** `docs/superpowers/specs/2026-11-15-cloudflare-receptenboek-design.md`

## Global Constraints

- Alle zichtbare tekst is Nederlands; teksten die de spec letterlijk geeft, worden letterlijk overgenomen.
- Nieuwe schermen gebruiken `Button.svelte` en de variabelen uit `src/lib/styles/variables.css`; grote knoppen, grote letters, hooguit twee keuzes per scherm.
- Geen betaalde Cloudflare-onderdelen en geen R2.
- Geen e-mail, wachtwoorden of rechten per persoon.
- Schrijven (toevoegen, wijzigen, verwijderen, favoriet) werkt alleen met een bevestiging van de server; er wordt nooit alleen lokaal geschreven.
- Limieten: foto ≤ 1.500.000 bytes, ≤ 20 foto's per recept, recept-JSON ≤ 200.000 bytes, ≤ 50 D1-queries per aanvraag.
- De Worker heet `mijn-recepten`, de D1-database `mijn-recepten`, binding `DB`.
- Werk op branch `cloudflare-receptenboek`, niet op `main`.
- Testcommando's: `npm test -- --run` (app) en `npm run test:worker` (Worker). `npm run check` moet schoon blijven.

## Review Focus

1. Code ingetypt als `koek 4827 taart`, `Koek-4827-Taart` of met spatie achteraan: koppelt gewoon. → Task 1.
2. Wel wifi, geen internet (`navigator.onLine` is waar, `fetch` faalt): de app toont de lokale recepten en bewaren geeft de melding uit de spec, geen leeg scherm. → Task 5 en 6.
3. Server antwoordt 401 tijdens ophalen (code bestaat niet meer): de lokale kopie blijft staan en wordt niet leeggemaakt. → Task 5.
4. Importbestand uit de oude app (foto's als base64 in `photos`, geen `photoIds`, datums als tekst) of een kapot bestand: recepten komen met foto's op de server, of er komt een Nederlandse foutmelding en er verandert niets. → Task 6.
5. Foto groter dan 1.500.000 bytes of een 21e foto: de server weigert met 413/400 en de app toont de bewaar-melding; het recept wordt niet half opgeslagen. → Task 3 en 6.

---

## Bestandsoverzicht

| Bestand | Verantwoordelijkheid |
|---|---|
| `src/lib/api/code.ts` | Code normaliseren en opmaken (gedeeld door app en Worker) |
| `src/lib/api/types.ts` | `RemoteRecipe` en API-antwoorden (gedeeld) |
| `worker/words.ts` | Woordenlijst voor codes |
| `worker/code.ts` | Code genereren en hashen |
| `worker/index.ts` | Routes, authenticatie, begrenzing |
| `worker/tsconfig.json`, `vitest.worker.config.ts` | Typen en tests voor de Worker |
| `migrations/0001_init.sql` | D1-schema |
| `wrangler.jsonc` | Worker, assets, D1, begrenzing |
| `src/lib/api/client.ts` | `fetch`-laag met fouttypen |
| `src/lib/stores/book.ts` | De gekoppelde code (localStorage) |
| `src/lib/sync/sync.ts` | Lokale kopie gelijktrekken met de server |
| `src/lib/db/database.ts` | + `putRecipe`, `clearRecipes` |
| `src/lib/stores/recipes.ts` | Schrijven via de server, daarna lokaal |
| `src/routes/welkom/+page.svelte` | Nieuw receptenboek / code invoeren |
| `src/routes/koppelen/+page.svelte` | Koppelen via QR-link `?code=` |
| `src/lib/components/QrCode.svelte` | QR-code tekenen |
| `src/routes/instellingen/+page.svelte` | Koppelen tonen, ontkoppelen, teksten |
| `src/routes/+layout.svelte`, `+layout.ts` | Doorsturen naar welkom, offline-balk, verversen |

---

### Task 1: Code normaliseren, opmaken, genereren en hashen

**Files:**
- Create: `src/lib/api/code.ts`, `src/lib/api/code.test.ts`, `worker/words.ts`, `worker/code.ts`, `worker/code.test.ts`, `worker/tsconfig.json`, `vitest.worker.config.ts`, `wrangler.jsonc`
- Modify: `package.json` (devDependencies `wrangler@^4.36`, `@cloudflare/vitest-plugin@^1`, `@cloudflare/workers-types`, `vitest@^4.1`; scripts `test:worker`: `vitest --run --config vitest.worker.config.ts`), `vitest.config.ts` (include blijft `src/**`, dus `worker/**` valt erbuiten)

**Interfaces:**
- Produces:
  - `normalizeCode(input: string): string` — hoofdletters, alles behalve A–Z en 0–9 weg.
  - `formatCode(normalized: string): string` — `KOEK4827TAART` → `KOEK-4827-TAART` (streepjes op de grens letter/cijfer).
  - `isValidCodeShape(normalized: string): boolean` — letters, precies 4 cijfers, letters.
  - `WORDS: readonly string[]` in `worker/words.ts`: minimaal 512 unieke Nederlandse woorden, 3–6 letters, alleen A–Z, hoofdletters, eten/keuken/huis-thema, geen aanstootgevende woorden.
  - `generateCode(): string` (genormaliseerde vorm, `crypto.getRandomValues`), `hashCode(normalized: string): Promise<string>` (SHA-256, hex).

- [ ] **Step 1: Branch en gereedschap.** `git switch -c cloudflare-receptenboek`; installeer de devDependencies; maak `wrangler.jsonc` met `name: "mijn-recepten"`, `main: "worker/index.ts"`, `compatibility_date: "2026-11-01"`, `assets: { directory: "./build", binding: "ASSETS", not_found_handling: "single-page-application", run_worker_first: ["/api/*"] }`, `d1_databases: [{ binding: "DB", database_name: "mijn-recepten", database_id: "LOCAL", migrations_dir: "migrations" }]`. Maak `vitest.worker.config.ts` met `cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })` en `include: ["worker/**/*.test.ts"]`. Tijdelijk een lege `worker/index.ts` met `export default { fetch: () => new Response("ok") }`.

- [ ] **Step 2: Failing tests** in `src/lib/api/code.test.ts`:

```ts
expect(normalizeCode(' koek 4827 taart ')).toBe('KOEK4827TAART');
expect(normalizeCode('Koek-4827-Taart')).toBe('KOEK4827TAART');
expect(formatCode('KOEK4827TAART')).toBe('KOEK-4827-TAART');
expect(isValidCodeShape('KOEK4827TAART')).toBe(true);
expect(isValidCodeShape('KOEK482TAART')).toBe(false);
expect(isValidCodeShape('')).toBe(false);
```

en in `worker/code.test.ts`:

```ts
expect(new Set(WORDS).size).toBe(WORDS.length);
expect(WORDS.length).toBeGreaterThanOrEqual(512);
expect(WORDS.every((w) => /^[A-Z]{3,6}$/.test(w))).toBe(true);
expect(isValidCodeShape(generateCode())).toBe(true);
expect(generateCode()).not.toBe(generateCode());
expect(await hashCode('KOEK4827TAART')).toMatch(/^[0-9a-f]{64}$/);
expect(await hashCode('KOEK4827TAART')).toBe(await hashCode('KOEK4827TAART'));
```

- [ ] **Step 3:** Run `npm test -- --run src/lib/api` en `npm run test:worker` → FAIL (modules bestaan niet).
- [ ] **Step 4:** Implementeer de vijf functies en de woordenlijst.
- [ ] **Step 5:** Beide testcommando's → PASS.
- [ ] **Step 6:** Commit `feat: receptenboek-code en Worker-testopzet`.

---

### Task 2: D1-schema en receptenboek-routes

**Files:**
- Create: `migrations/0001_init.sql`, `src/lib/api/types.ts`, `worker/index.test.ts`, `worker/test-setup.ts`
- Modify: `worker/index.ts`, `vitest.worker.config.ts` (setup-bestand dat de migratie toepast; volg de D1-recept op https://developers.cloudflare.com/workers/testing/vitest-integration/recipes/), `wrangler.jsonc` (`ratelimits: [{ name: "API_LIMITER", namespace_id: "1001", simple: { limit: 120, period: 60 } }]`)

**Interfaces:**
- Consumes: Task 1 (`generateCode`, `hashCode`, `normalizeCode`, `isValidCodeShape`).
- Produces:
  - Schema: `books(id TEXT PRIMARY KEY, code_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL)`; `recipes(id TEXT NOT NULL, book_id TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (book_id, id))`; `photos(id TEXT PRIMARY KEY, book_id TEXT NOT NULL, recipe_id TEXT NOT NULL, data BLOB NOT NULL)` met index op `(book_id, recipe_id)`.
  - `interface Env { DB: D1Database; ASSETS: Fetcher; API_LIMITER?: RateLimit }`.
  - Header `X-Receptenboek-Code` op alle `/api/*`-aanvragen behalve `POST /api/books` en `GET /api/photos/:id`.
  - `POST /api/books` → 201 `{ code: string }` (genormaliseerd). Bij een hash-botsing opnieuw proberen, maximaal 5 keer.
  - `GET /api/book` → 200 `{ ok: true }`, of 401 `{ error: "unknown_code" }`.
  - Intern: `authenticate(request, env): Promise<string | null>` geeft het `book_id`.
  - Begrenzing: vóór authenticatie, op alle `/api/*` behalve `GET /api/photos/*`, `env.API_LIMITER?.limit({ key: <CF-Connecting-IP of "unknown"> })`; bij `success === false` → 429 `{ error: "rate_limited" }`. Ontbreekt de binding, dan geen begrenzing.
  - Onbekende `/api/`-route → 404 `{ error: "not_found" }`; alle fouten zijn JSON.

- [ ] **Step 1: Failing tests** (`worker/index.test.ts`, via `SELF.fetch` of de `exports.default.fetch`-vorm uit de actuele docs):

```ts
// POST /api/books → 201, isValidCodeShape(body.code) === true
// GET /api/book met die code → 200 { ok: true }
// GET /api/book met dezelfde code als 'koek 4827 taart'-achtige variant (kleine letters, spaties) → 200
// GET /api/book met 'APPEL0000PEER' → 401 { error: 'unknown_code' }
// GET /api/book zonder header → 401
// GET /api/bestaatniet → 404 { error: 'not_found' }
// In D1 staat code_hash, en geen rij bevat de leesbare code
```

- [ ] **Step 2:** `npm run test:worker` → FAIL.
- [ ] **Step 3:** Schrijf de migratie, de types en de routes.
- [ ] **Step 4:** `npm run test:worker` → PASS.
- [ ] **Step 5:** Commit `feat: D1-schema en receptenboek-routes`.

---

### Task 3: Recept- en fotoroutes

**Files:**
- Modify: `worker/index.ts`, `worker/index.test.ts`, `src/lib/api/types.ts`

**Interfaces:**
- Consumes: `authenticate`, schema uit Task 2.
- Produces:

```ts
// src/lib/api/types.ts
export interface RemoteRecipe {
  id: string; title: string; category: RecipeCategory;
  ingredients?: string[]; instructions?: string; photoIds: string[];
  sourceUrl?: string; isFavorite: boolean; servings?: number;
  cookTime?: number; notes?: string;
  createdAt: string; updatedAt: string; // ISO
}
export type RecipeInput = Omit<RemoteRecipe, 'id' | 'updatedAt'>; // createdAt optioneel
```

  - `GET /api/recipes` → 200 `{ recipes: RemoteRecipe[] }`, alleen van het eigen boek.
  - `PUT /api/recipes/:id/photos/:photoId` — body `image/jpeg`, ruwe bytes. 204. Groter dan 1.500.000 bytes → 413 `{ error: "photo_too_large" }`. Bestaand `photoId` van een ander boek → 404.
  - `PUT /api/recipes/:id` — body `RecipeInput`. Server zet `updatedAt` op nu; `createdAt` blijft bij een bestaand recept, komt anders uit de body of is nu. Verwijdert foto's van dit recept die niet in `photoIds` staan. 200 met het opgeslagen `RemoteRecipe`. Validatie → 400 `{ error: "invalid_recipe" }`: `title` lege of geen tekst, `category` niet in de lijst van `src/lib/db/types.ts`, `photoIds` geen lijst of langer dan 20, een `photoId` dat niet bij dit recept en boek is geüpload, body groter dan 200.000 bytes.
  - `DELETE /api/recipes/:id` → 204, ook als het recept niet bestaat; verwijdert de foto's mee.
  - `GET /api/photos/:id` → 200 `image/jpeg` met `Cache-Control: public, max-age=31536000, immutable`; onbekend → 404. Geen code nodig.

- [ ] **Step 1: Failing tests:**

```ts
// PUT recept zonder foto's → 200; GET /api/recipes bevat het met gelijke velden en ISO-datums
// tweede PUT op hetzelfde id: createdAt gelijk, updatedAt later of gelijk, velden vervangen
// boek B ziet de recepten van boek A niet; DELETE door B laat het recept van A staan
// foto uploaden (3 bytes), recept PUT met dat photoId → GET /api/photos/:id geeft dezelfde bytes en de Cache-Control-header
// recept PUT met photoIds [] na eerdere foto → GET /api/photos/:id → 404
// DELETE recept → GET /api/recipes leeg, foto 404, tweede DELETE ook 204
// foto van 1_500_001 bytes → 413
// 21 photoIds → 400; title '' → 400; category 'pizza' → 400; onbekend photoId → 400
// elke route zonder geldige code → 401 (behalve GET foto)
```

- [ ] **Step 2:** `npm run test:worker` → FAIL.
- [ ] **Step 3:** Implementeer. Gebruik `env.DB.batch` waar meerdere statements bij elkaar horen; blijf onder 50 queries per aanvraag.
- [ ] **Step 4:** `npm run test:worker` → PASS.
- [ ] **Step 5:** Commit `feat: recept- en fotoroutes`.

---

### Task 4: API-client en code-store in de app

**Files:**
- Create: `src/lib/api/client.ts`, `src/lib/api/client.test.ts`, `src/lib/stores/book.ts`, `src/lib/stores/book.test.ts`

**Interfaces:**
- Consumes: `RemoteRecipe`, `RecipeInput`, `normalizeCode`.
- Produces:

```ts
// src/lib/stores/book.ts — localStorage-sleutel 'receptenboek-code'
export const bookCode: Readable<string | null>;
export function initBook(): void;            // leest localStorage
export function setBookCode(code: string): void; // slaat genormaliseerd op
export function clearBookCode(): void;
export function getBookCode(): string | null;

// src/lib/api/client.ts
export class OfflineError extends Error {}   // fetch gooide (geen verbinding)
export class ApiError extends Error { status: number; code: string }
export function createBook(): Promise<string>;                 // POST /api/books
export function checkCode(code: string): Promise<boolean>;     // 200 → true, 401 → false
export function listRecipes(): Promise<RemoteRecipe[]>;
export function saveRecipe(id: string, input: RecipeInput): Promise<RemoteRecipe>;
export function removeRecipe(id: string): Promise<void>;
export function uploadPhoto(recipeId: string, photoId: string, dataUrl: string): Promise<void>;
export function downloadPhoto(photoId: string): Promise<string>; // geeft een data-URL
```

  Alle functies behalve `createBook`, `checkCode` en `downloadPhoto` sturen `getBookCode()` mee. `uploadPhoto` zet de data-URL om naar een `Blob` en stuurt de bytes.

- [ ] **Step 1: Failing tests** met een gemockte `fetch` (`vi.stubGlobal`):

```ts
// setBookCode(' koek-4827-taart') → getBookCode() === 'KOEK4827TAART' en localStorage bevat dat
// clearBookCode() → getBookCode() === null
// listRecipes stuurt header X-Receptenboek-Code met de opgeslagen code
// fetch gooit TypeError → OfflineError
// antwoord 401 { error: 'unknown_code' } → ApiError met status 401, code 'unknown_code'
// checkCode: 200 → true, 401 → false, 429 → ApiError
// uploadPhoto: body is een Blob met type image/jpeg en de bytes van de data-URL
// downloadPhoto: antwoord met 3 bytes → 'data:image/jpeg;base64,...' met die bytes
```

- [ ] **Step 2:** `npm test -- --run src/lib/api src/lib/stores` → FAIL.
- [ ] **Step 3:** Implementeer.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5:** Commit `feat: API-client en code-store`.

---

### Task 5: Lokale kopie gelijktrekken met de server

**Files:**
- Create: `src/lib/sync/sync.ts`, `src/lib/sync/sync.test.ts`
- Modify: `src/lib/db/types.ts` (`Recipe` krijgt `photoIds: string[]`, evenwijdig aan `photos`), `src/lib/db/database.ts`, `src/lib/db/database.test.ts`

**Interfaces:**
- Consumes: `listRecipes`, `downloadPhoto`, `RemoteRecipe`.
- Produces:

```ts
// database.ts
export function putRecipe(recipe: Recipe): Promise<void>;  // overschrijft op id, raakt datums niet aan
export function clearRecipes(): Promise<void>;
// getAllRecipes/getRecipe vullen photoIds met [] als het veld ontbreekt

// sync.ts
export function toLocal(remote: RemoteRecipe, photos: string[]): Recipe; // ISO → Date
export interface SyncDeps {
  listRemote(): Promise<RemoteRecipe[]>;
  downloadPhoto(id: string): Promise<string>;
  getAllLocal(): Promise<Recipe[]>;
  putLocal(r: Recipe): Promise<void>;
  deleteLocal(id: string): Promise<void>;
}
export function syncFromServer(deps?: SyncDeps): Promise<Recipe[]>; // geeft de nieuwe lokale stand
```

  Regels: `listRemote` gooit → de fout gaat door en er wordt lokaal niets gewijzigd. Recept alleen op de server, of met een andere `updatedAt` → overnemen. Recept alleen lokaal → lokaal verwijderen. Een foto wordt alleen gedownload als het lokale recept dat `photoId` nog niet heeft. Lukt het downloaden van een foto niet, dan wordt dat ene recept overgeslagen (blijft zoals het lokaal was) en gaat de rest door.

- [ ] **Step 1: Failing tests** met nep-`SyncDeps`:

```ts
// server heeft A, lokaal leeg → putLocal(A) met Date-velden; resultaat [A]
// lokaal A met gelijke updatedAt → geen putLocal, geen downloadPhoto
// server A nieuwer, zelfde photoIds → putLocal, downloadPhoto 0 keer, foto's behouden
// server A met photoIds ['p1','p2'], lokaal alleen 'p1' → downloadPhoto precies 1 keer met 'p2'; volgorde van photos volgt photoIds
// lokaal B, server zonder B → deleteLocal('B')
// listRemote gooit ApiError(401) → syncFromServer gooit; putLocal en deleteLocal 0 keer
// listRemote gooit OfflineError → idem
// downloadPhoto gooit voor recept A → A ongewijzigd, recept C wel overgenomen
// database: putRecipe + getRecipe geeft hetzelfde recept; clearRecipes → getAllRecipes() is []
// database: oud recept zonder photoIds → getRecipe(...).photoIds is []
```

- [ ] **Step 2:** `npm test -- --run src/lib/sync src/lib/db` → FAIL.
- [ ] **Step 3:** Implementeer.
- [ ] **Step 4:** Tests → PASS; `npm run check` schoon (pas bestaande plekken aan waar `Recipe` zonder `photoIds` wordt gemaakt).
- [ ] **Step 5:** Commit `feat: lokale kopie gelijktrekken met server`.

---

### Task 6: Recepten-store schrijft via de server

**Files:**
- Modify: `src/lib/stores/recipes.ts`, `src/routes/recepten/[id]/bewerken/+page.svelte` (leest `getRecipe` nu direct uit de database; dat mag blijven, het is lezen)
- Create: `src/lib/stores/recipes.test.ts`

**Interfaces:**
- Consumes: Task 4 (client), Task 5 (`syncFromServer`, `toLocal`, `putRecipe`, `clearRecipes`).
- Produces (namen en parameters blijven zoals de schermen ze nu aanroepen):
  - `loadRecipes()`: eerst de lokale kopie tonen (`isLoading` uit), daarna als er een code is `syncFromServer()`; lukt dat, dan de store verversen. `OfflineError` wordt stil geslikt. Andere fouten zetten `error` op "Ophalen is niet gelukt. Je ziet de recepten van de vorige keer."
  - `addRecipe(data)`: nieuw id met `crypto.randomUUID()`; voor elke foto een nieuw `photoId` + `uploadPhoto`; dan `saveRecipe`; dan `putRecipe` en store bijwerken. Geeft het `Recipe` terug.
  - `updateRecipe(id, updates)`: een foto waarvan de data-URL al in het bestaande recept staat houdt zijn `photoId`; andere krijgen een nieuw id en worden geüpload.
  - `deleteRecipe(id)`: `removeRecipe`, daarna lokaal verwijderen.
  - `toggleFavorite(id)`: `saveRecipe` met omgekeerde `isFavorite`, geen foto-upload.
  - `importRecipes(file, mode)`: bestand eerst volledig lezen en controleren (`recipes` is een lijst; elk item heeft een `title`); ongeldig → `Error('Dit bestand kan niet worden gelezen.')` en geen enkele aanvraag. `mode === 'replace'`: eerst elk bestaand recept `removeRecipe`. Daarna elk recept via `addRecipe` (nieuwe id's, oude `createdAt` behouden). Geeft het aantal terug.
  - `exportRecipes()` ongewijzigd (uit de lokale kopie).
  - Elke schrijffunctie gooit de fout van de client door; de lokale kopie en de store wijzigen alleen na een geslaagd antwoord.
  - `export const SAVE_FAILED = 'Bewaren is niet gelukt. Controleer de internetverbinding en probeer het opnieuw.'`

- [ ] **Step 1: Failing tests** (client en database gemockt met `vi.mock`):

```ts
// addRecipe met 2 foto's → uploadPhoto 2x vóór saveRecipe; saveRecipe krijgt die 2 photoIds; daarna putRecipe; store bevat het recept
// addRecipe, saveRecipe gooit OfflineError → gooit; putRecipe 0 keer; store ongewijzigd
// addRecipe, uploadPhoto gooit ApiError(413) → gooit; saveRecipe 0 keer
// updateRecipe met 1 bestaande + 1 nieuwe foto → uploadPhoto 1x; photoIds = [bestaand, nieuw]
// toggleFavorite → saveRecipe met isFavorite omgekeerd; uploadPhoto 0 keer
// deleteRecipe, removeRecipe gooit → lokaal niet verwijderd
// loadRecipes, sync gooit OfflineError → store toont lokale recepten, error === null
// loadRecipes, sync gooit ApiError(401) → store toont lokale recepten, error gezet
// importRecipes met oud exportformaat (photos als data-URL's, geen photoIds, createdAt als tekst) → per recept uploadPhoto + saveRecipe; createdAt meegestuurd
// importRecipes met '{"foo":1}' of 'geen json' → gooit 'Dit bestand kan niet worden gelezen.'; removeRecipe en saveRecipe 0 keer, ook in mode 'replace'
```

- [ ] **Step 2:** `npm test -- --run src/lib/stores` → FAIL.
- [ ] **Step 3:** Implementeer.
- [ ] **Step 4:** Loop de schermen na die schrijven (`recepten/nieuw`, `recepten/[id]`, `recepten/[id]/bewerken`, `+page.svelte`, `favorieten`, `recepten/+page.svelte`): elke aanroep vangt de fout en toont `SAVE_FAILED` in de bestaande foutweergave van dat scherm (of een `role="alert"`-blok als die er niet is); het formulier blijft gevuld en er wordt niet weggenavigeerd.
- [ ] **Step 5:** `npm test -- --run` en `npm run check` → PASS.
- [ ] **Step 6:** Commit `feat: recepten bewaren via de server`.

---

### Task 7: Welkom, koppelen en instellingen

**Files:**
- Create: `src/routes/welkom/+page.svelte`, `src/routes/koppelen/+page.svelte`, `src/lib/components/QrCode.svelte`, `src/lib/stores/link.ts`, `src/lib/stores/link.test.ts`
- Modify: `src/routes/+layout.svelte`, `src/routes/+layout.ts`, `src/routes/instellingen/+page.svelte`, `svelte.config.js`, `vite.config.ts`, `package.json` (dependency `qrcode`, `@types/qrcode`)

**Interfaces:**
- Consumes: Task 4, 5, 6; `formatCode`, `isValidCodeShape`.
- Produces:

```ts
// src/lib/stores/link.ts
export type LinkResult = 'ok' | 'unknown' | 'offline' | 'error';
export function startNewBook(): Promise<LinkResult>;   // createBook → clearRecipes → setBookCode → loadRecipes
export function linkWithCode(input: string): Promise<LinkResult>; // vorm fout of checkCode false → 'unknown'
export function unlinkDevice(): Promise<void>;         // clearRecipes, clearBookCode, store leeg
```

- Gedrag en letterlijke teksten:
  - `+layout.ts`: `prerender = false`, `ssr = false`. `svelte.config.js`: `fallback: 'index.html'`, `paths.base` weg.
  - `+layout.svelte`: `initBook()` bij start. Zonder code en niet op `/welkom` of `/koppelen` → `goto('/welkom')`. Met code op `/welkom` → `goto('/')`. Op `/welkom` en `/koppelen` geen navigatiebalk. `loadRecipes()` ook bij `visibilitychange` naar zichtbaar en bij het `online`-event. Offline-balk: "Geen internet: je kunt lezen, niet wijzigen".
  - `/welkom`: titel "Mijn Recepten", knoppen "Nieuw receptenboek maken" en "Ik heb al een code". De tweede toont één invoerveld (label "Jouw receptenboek-code", `autocapitalize="characters"`, `autocomplete="off"`) en knop "Koppelen". Meldingen: `'unknown'` → "Deze code kennen we niet. Controleer de code en probeer het opnieuw."; `'offline'` → "Voor de eerste keer instellen is internet nodig."; `'error'` → "Dat is niet gelukt. Probeer het over een minuut opnieuw." Tijdens wachten zijn de knoppen uitgeschakeld.
  - `/koppelen?code=…`: is het apparaat al gekoppeld aan dezelfde code → naar `/`. Aan een andere code → vraag "Dit apparaat is al gekoppeld aan een ander receptenboek. Wil je overstappen?" met "Ja, overstappen" / "Nee". Anders direct `linkWithCode`; bij succes naar `/`, anders naar `/welkom` met de bijbehorende melding. De code wordt daarna uit de adresbalk gehaald (`replaceState`).
  - Instellingen, onderdeel "Ander apparaat koppelen": kop "Jouw receptenboek-code", `formatCode(code)` in grote letters, `<QrCode text={origin + '/koppelen?code=' + code} />`, tekst "Bewaar deze code goed. Wie de code heeft, kan de recepten zien en wijzigen."
  - Instellingen, "Dit apparaat ontkoppelen": bevestiging "Weet je het zeker? De recepten blijven bewaard, maar dit apparaat heeft daarna de code weer nodig." → `unlinkDevice()` → `/welkom`.
  - Bestaande knop voor alles wissen: bevestigingstekst wordt "Hiermee verwijder je alle recepten uit het receptenboek, op alle gekoppelde apparaten. Dit kan niet ongedaan worden gemaakt." Import met "vervangen" krijgt dezelfde extra bevestiging.
  - `QrCode.svelte`: prop `text: string`; rendert SVG via `QRCode.toString(text, { type: 'svg', margin: 1 })`, minimaal 220 px breed, `role="img"` met `aria-label="QR-code om een ander apparaat te koppelen"`.
  - `vite.config.ts`: workbox `navigateFallback: '/index.html'` en `navigateFallbackDenylist: [/^\/api\//]`; geen runtime-caching voor `/api/`.

- [ ] **Step 1: Failing tests** `src/lib/stores/link.test.ts` (client en database gemockt):

```ts
// startNewBook: createBook geeft 'KOEK4827TAART' → 'ok', getBookCode() gezet, clearRecipes aangeroepen
// startNewBook: createBook gooit OfflineError → 'offline', geen code gezet
// linkWithCode('koek 4827 taart'), checkCode true → 'ok', code 'KOEK4827TAART', clearRecipes vóór loadRecipes
// linkWithCode('abc') → 'unknown' zonder aanvraag
// linkWithCode geldig van vorm, checkCode false → 'unknown', geen code gezet
// linkWithCode, checkCode gooit ApiError(429) → 'error'
// unlinkDevice → getBookCode() null, clearRecipes aangeroepen, recipes-store leeg
```

- [ ] **Step 2:** `npm test -- --run src/lib/stores/link.test.ts` → FAIL.
- [ ] **Step 3:** Implementeer `link.ts`, de twee routes, `QrCode.svelte` en de wijzigingen in layout, instellingen en configuratie.
- [ ] **Step 4:** `npm test -- --run`, `npm run test:worker`, `npm run check`, `npm run build` → alles slaagt.
- [ ] **Step 5: Handmatige controle, lokaal.** `npx wrangler d1 migrations apply mijn-recepten --local`, daarna `npx wrangler dev` en in de browser:
  1. Eerste bezoek gaat naar `/welkom`; "Nieuw receptenboek maken" opent de recepten.
  2. Recept met foto toevoegen; Instellingen toont code en QR.
  3. Tweede browserprofiel (of privévenster): code met kleine letters en spaties intypen → hetzelfde recept met foto verschijnt.
  4. In het tweede venster favoriet maken; eerste venster naar voren halen → ster staat aan.
  5. DevTools → Offline, pagina `/recepten/<id>` herladen → recept en foto zichtbaar, balk toont de offline-tekst; bewaren toont `SAVE_FAILED` en het formulier blijft gevuld.
  6. De link uit de QR-code openen in een derde profiel → gekoppeld, code niet meer in de adresbalk.
  7. Ontkoppelen → terug op `/welkom`; opnieuw koppelen toont de recepten weer.
  8. Schermbreedte 360 px: geen horizontaal scrollen, knoppen minstens 48 px hoog.
- [ ] **Step 6:** Commit `feat: welkom, koppelen en instellingen`.

---

### Task 8: Publiceren op Cloudflare

**Files:**
- Modify: `wrangler.jsonc` (echte `database_id`), `package.json` (script `deploy`: `npm run build && wrangler d1 migrations apply mijn-recepten --remote && wrangler deploy`), `README.md` (vervang de sjabloontekst door: wat de app is, lokaal draaien, testen, publiceren, wat te doen bij een kwijtgeraakte code)
- Delete: `.github/workflows/deploy.yml`, `test_connection.js`

**Interfaces:**
- Consumes: alles hiervoor.

- [ ] **Step 1 (eigenaar):** `npx wrangler login` uitvoeren en in de browser op "Allow" klikken. Controle: `npx wrangler whoami` toont het account.
- [ ] **Step 2:** `npx wrangler d1 create mijn-recepten`; zet het getoonde `database_id` in `wrangler.jsonc`.
- [ ] **Step 3:** `npm run deploy`. Weigert Cloudflare de `ratelimits`-binding op het gratis account, haal dan het `ratelimits`-blok uit `wrangler.jsonc`, publiceer opnieuw en meld dit aan de eigenaar (de code werkt zonder binding).
- [ ] **Step 4: Controle op het echte adres** (`https://mijn-recepten.<account>.workers.dev`):
  - `curl -s -X POST <adres>/api/books` → 201 met een code; `curl -s <adres>/api/book -H "X-Receptenboek-Code: <code>"` → `{"ok":true}`; verwijder dit proefboek daarna met `npx wrangler d1 execute mijn-recepten --remote --command "DELETE FROM books WHERE ..."`.
  - Herhaal stap 1–4 van de handmatige controle uit Task 7 op het echte adres, bij voorkeur met een echte telefoon voor de QR-code.
  - Een diepe link (`/recepten`) rechtstreeks openen geeft de app, geen 404.
- [ ] **Step 5:** Commit `chore: publiceren via Cloudflare, GitHub Pages verwijderd`.
- [ ] **Step 6:** Meld de eigenaar het adres, hoe de app op het beginscherm komt, en dat het eerste echte receptenboek op het eigen apparaat moet worden aangemaakt (zodat de code alleen daar bekend is).
