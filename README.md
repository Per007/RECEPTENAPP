# Mijn Recepten

Live: https://mijn-recepten.receptenapp.workers.dev

Een eenvoudige receptenapp voor ouderen. Recepten staan in een *receptenboek* op
Cloudflare en zijn op elk gekoppeld apparaat te lezen en te wijzigen. Lezen werkt ook
zonder internet; wijzigen vraagt internet.

## Hoe het werkt

- **Koppelen zonder account.** Het eerste apparaat maakt een receptenboek en krijgt een
  code zoals `KOEK-4827-TAART`. Een ander apparaat typt die code in of scant de QR-code
  (Instellingen → Ander apparaat koppelen). Wie de code heeft, kan alles lezen en wijzigen.
- **Server is de waarheid.** Elke wijziging gaat eerst naar de server. Het apparaat houdt
  een kopie bij (IndexedDB) om te tonen, ook offline.
- **Techniek.** SvelteKit (statische SPA + PWA) in `src/`, een Cloudflare Worker in
  `worker/` voor alles onder `/api/`, en een D1-database (schema in `migrations/`).

Ontwerp en bouwplan staan in `docs/superpowers/`.

## Lokaal draaien

```sh
npm install --legacy-peer-deps
npm run dev:worker     # bouwt de app en start Worker + database lokaal op http://localhost:8787
```

`npm run dev` start alleen de schermen (zonder server); bewaren werkt dan niet.

## Testen

```sh
npm test -- --run      # app
npm run test:worker    # Worker en database
npm run check          # typen in de app
npm run check:worker   # typen in de Worker
```

## Publiceren

Eenmalig: `npx wrangler login`, daarna `npx wrangler d1 create mijn-recepten` en het
getoonde `database_id` in `wrangler.jsonc` zetten.

Daarna, bij elke nieuwe versie:

```sh
npm run deploy
```

## Code kwijt?

Zolang er nog één gekoppeld apparaat is: Instellingen → Ander apparaat koppelen toont de
code. Is er geen gekoppeld apparaat meer, dan is het receptenboek vanuit de app niet meer
te bereiken. De gegevens staan nog wel in de D1-database (Cloudflare-dashboard → D1 →
`mijn-recepten`), maar de code zelf is daar niet leesbaar opgeslagen.
