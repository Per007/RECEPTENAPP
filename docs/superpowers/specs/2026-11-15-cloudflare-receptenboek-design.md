# Ontwerp: recepten op meerdere apparaten via Cloudflare

Datum: 2026-11-15
Status: ter goedkeuring

## Waarom

"Mijn Recepten" is een eenvoudige receptenapp voor ouderen. Recepten staan nu
alleen op het apparaat waarop ze zijn ingevoerd, en de app werd gepubliceerd via
GitHub Pages, waar geen werkend account meer voor is.

De eigenaar wil dat recepten vanaf meerdere apparaten te benaderen zijn (bijvoorbeeld
telefoon en tablet, of een familielid dat meekijkt), en wil de app via Cloudflare
laten draaien. Er is nog geen Cloudflare-account.

## Doelen

- Dezelfde recepten zijn op elk gekoppeld apparaat te zien en te wijzigen.
- Koppelen kan zonder e-mailadres en zonder wachtwoord.
- Recepten nalezen werkt ook zonder internet.
- De app draait volledig op het gratis abonnement van Cloudflare, zonder betaalgegevens.
- Publiceren gebeurt vanaf deze computer, zonder GitHub.

## Niet-doelen

- Geen e-mail, wachtwoorden, gebruikersbeheer of rechten per persoon.
- Geen toevoegen of wijzigen zonder internet.
- Geen herstel van een kwijtgeraakte code als er geen gekoppeld apparaat meer is.
- Geen eigen domeinnaam; het adres wordt `<naam>.<account>.workers.dev`.
- Geen automatische overdracht van recepten uit de oude GitHub Pages-versie.

## Anti-doelen

Dit zou de app laten mislukken, ook als het technisch werkt:

- Een oudere gebruiker moet iets begrijpen van accounts, synchronisatie of conflicten.
- Recepten verdwijnen of verschijnen in twee versies.
- De app toont een leeg scherm of een technische foutmelding als er geen internet is.
- Schermen met kleine letters, veel keuzes of Engelse tekst.

## Uitgangssituatie

- SvelteKit 2 / Svelte 5, `adapter-static`, alle pagina's als SPA (`ssr = false`).
- PWA via `@vite-pwa/sveltekit`.
- Opslag: IndexedDB (`src/lib/db/database.ts`), aangestuurd via `src/lib/stores/recipes.ts`.
- Foto's: door `PhotoCapture.svelte` verkleind tot maximaal 800 px, JPEG kwaliteit 0,8,
  als base64-tekst in het recept zelf (`photos: string[]`).
- Export en import als JSON-bestand bestaan al (Instellingen).
- `svelte.config.js` zet in productie het basispad `/RECEPTENAPP` voor GitHub Pages.
- `.github/workflows/deploy.yml` publiceert naar GitHub Pages en hoogt het versienummer op.

## Overwogen aanpakken

| | Aanpak | Voor | Tegen |
|---|---|---|---|
| A | Alles alleen online | Eenvoudigst; altijd gelijk | Zonder internet is de app leeg |
| **B** | **Online bewaren, offline lezen** | Lezen werkt altijd; geen botsende versies; hergebruikt bestaande lokale opslag | Wijzigen vraagt internet |
| C | Alles offline, achteraf gelijktrekken | Wijzigen kan altijd | Meeste werk; wijzigingen kunnen botsen en dan wint stilletjes de laatste |

**Gekozen: B** (door de eigenaar). Nalezen gebeurt vaak en moet altijd werken;
wijzigen is zeldzaam en mag op internet wachten.

Voor het koppelen van apparaten zijn drie manieren overwogen: een receptenboek-code,
inloggen per e-mail, en gebruikersnaam met wachtwoord. **Gekozen: de receptenboek-code**
(door de eigenaar), omdat die geen e-mail of wachtwoord vraagt.

## Gedrag

### Eerste keer openen

Een apparaat dat nog niet gekoppeld is, ziet alleen een welkomstscherm met twee grote knoppen:

- **Nieuw receptenboek maken**: de server maakt een receptenboek en een code aan; de app
  gaat direct naar de recepten.
- **Ik heb al een code**: invoerveld voor de code. Bij een juiste code worden de recepten
  opgehaald en getoond. Bij een onbekende code: "Deze code kennen we niet. Controleer de code
  en probeer het opnieuw."

Beide knoppen vragen internet. Zonder internet staat er: "Voor de eerste keer instellen is
internet nodig."

Het apparaat blijft daarna gekoppeld. Het welkomstscherm komt niet terug.

### Ander apparaat koppelen

Instellingen krijgt een onderdeel "Ander apparaat koppelen" dat toont:

- de code in grote letters, bijvoorbeeld `KOEK-4827-TAART`;
- een QR-code;
- de tekst "Bewaar deze code goed. Wie de code heeft, kan de recepten zien en wijzigen."

De QR-code bevat een link naar de app met de code erin (`/koppelen?code=…`). Scannen met de
gewone camera van telefoon of tablet opent de app en koppelt het apparaat. Er komt geen
QR-scanner in de app zelf.

Instellingen krijgt ook "Dit apparaat ontkoppelen", met een bevestigingsvraag. Dat wist de
lokale kopie en brengt het apparaat terug naar het welkomstscherm. De recepten op de server
blijven bestaan.

### De code

- Vorm: Nederlands woord, vier cijfers, Nederlands woord. Korte, gangbare woorden zonder
  trema's of accenten, geen woorden die op elkaar lijken.
- Invoer is niet hoofdlettergevoelig; spaties en streepjes worden genegeerd.
- De code is de enige sleutel. Iedereen met de code kan alles lezen en wijzigen.

### Dagelijks gebruik

- Bij openen, en wanneer de app weer naar voren komt, haalt de app de laatste stand op.
- Zonder internet toont de app de recepten zoals ze het laatst waren opgehaald.
- Toevoegen, wijzigen, verwijderen en favoriet maken gaan eerst naar de server. Pas als de
  server bevestigt, wordt de lokale kopie bijgewerkt. Dit geldt dan voor alle gekoppelde
  apparaten. Favorieten zijn dus gedeeld.
- Zonder verbinding toont de bestaande balk bovenaan: "Geen internet: je kunt lezen, niet
  wijzigen". (Nu staat daar dat wijzigingen lokaal worden opgeslagen; dat klopt dan niet meer.)
- Lukt bewaren niet, dan blijft het formulier met de ingevulde gegevens staan en verschijnt:
  "Bewaren is niet gelukt. Controleer de internetverbinding en probeer het opnieuw."
- Wijzigen twee apparaten vrijwel tegelijk hetzelfde recept, dan geldt de laatst bewaarde
  versie. Daar komt geen melding over.
- Thema en de instelling voor de WhatsApp-knop blijven per apparaat.

### Bestaande recepten

- Het webadres verandert, dus recepten uit de oude versie komen niet vanzelf mee.
- Exporteren blijft werken vanuit de lokale kopie.
- Importeren stuurt de recepten uit het bestand naar de server (samenvoegen), zodat ze op
  alle gekoppelde apparaten verschijnen. De keuze "vervangen" verwijdert eerst alle recepten
  in het receptenboek en vraagt daar een extra bevestiging voor.

## Techniek

Deze keuzes zijn door Claude gemaakt, niet door de eigenaar.

### Cloudflare

- **Eén Worker** met statische bestanden: de gebouwde SvelteKit-app (`build/`) wordt als
  static assets geserveerd; alles onder `/api/` gaat naar de Worker-code.
- **D1-database** voor receptenboeken, recepten en foto's.
- **Foto's in D1**, niet in R2: R2 vraagt ook in de gratis variant om betaalgegevens.
  Een verkleinde foto is naar schatting 100 tot 300 kB.
- Configuratie in `wrangler.jsonc`; databaseschema als D1-migraties in de repo.
- De Worker heet `mijn-recepten`; het adres wordt dus `mijn-recepten.<account>.workers.dev`.

### Gegevens

- `books`: id, hash van de code, aanmaakdatum. De code zelf staat niet leesbaar in de database.
- `recipes`: id, book_id, de receptvelden, `updated_at`.
- `photos`: id, book_id, recipe_id, volgorde, de afbeelding als binaire data.

Elke aanvraag onder `/api/` (behalve het aanmaken van een receptenboek en het ophalen van
een foto, zie hieronder) stuurt de code mee
in een header. De Worker zoekt daarmee het receptenboek op en beperkt elke query tot dat
`book_id`.

### API

| Aanvraag | Doel |
|---|---|
| `POST /api/books` | Nieuw receptenboek; geeft de code terug |
| `GET /api/book` | Controleren of een code bestaat (koppelen) |
| `GET /api/recipes` | Alle recepten van het boek, met per recept de foto-id's, zonder de foto's zelf |
| `PUT /api/recipes/:id/photos/:photoId` | Eén foto uploaden als JPEG-bestand |
| `PUT /api/recipes/:id` | Recept aanmaken of vervangen; verwijst naar eerder geüploade foto's |
| `DELETE /api/recipes/:id` | Recept en bijbehorende foto's verwijderen |
| `GET /api/photos/:id` | Eén foto; verandert nooit, dus lang te cachen |

Foto's gaan los van het recept omhoog, als bestand in plaats van als tekst, omdat een gratis
Worker maar 10 ms rekentijd per aanvraag heeft. Het ophalen van een foto vraagt geen code:
het foto-id is een lang willekeurig getal en daarmee zelf de sleutel.

Nagekeken limieten (Cloudflare-documentatie, 15-11-2026): D1 gratis 500 MB per database,
2 MB per rij, 100.000 schrijfacties per dag, 50 queries per aanvraag; Workers gratis 100.000
aanvragen per dag.

### In de app

- IndexedDB blijft bestaan als lokale kopie; de schermen blijven daaruit lezen.
- Een nieuwe laag tussen de stores en IndexedDB doet het ophalen en bewaren via de API.
- Ophalen vergelijkt de lijst van de server met de lokale kopie: nieuwe en gewijzigde recepten
  worden overgenomen, recepten die op de server niet meer bestaan worden lokaal verwijderd.
  Foto's die het apparaat al heeft, worden niet opnieuw gedownload.
- De code staat in `localStorage`.
- Bij koppelen of een nieuw receptenboek wordt de lokale kopie vervangen door de stand van
  de server. Op het nieuwe adres is die lokale kopie altijd leeg, dus er gaat niets verloren.
- De service worker cachet `/api/` niet.
- Het basispad `/RECEPTENAPP` vervalt; de app draait op de hoofdmap van het adres.

### Publiceren

- `npm run deploy` bouwt de app en publiceert met Wrangler.
- `.github/workflows/deploy.yml` wordt verwijderd. Daarmee vervalt ook het automatisch
  ophogen van het versienummer.
- Eenmalig, door de eigenaar zelf: Cloudflare-account aanmaken en `npx wrangler login`
  uitvoeren (opent de browser). De rest gebeurt vanuit deze repo.

## Beperkingen en risico's

- **Gratis limieten van D1** (grootte per rij, opslag per database, schrijfacties per dag)
  moeten bij de bouw worden nagekeken in de actuele Cloudflare-documentatie. Blijkt een foto
  niet in één rij te passen, dan wordt de foto verder verkleind in plaats van naar R2 uit te
  wijken.
- **Raden van codes**: de code is kort genoeg om over te typen en dus te raden met veel
  pogingen. De Worker moet het aantal mislukte pogingen per afzender begrenzen.
- **iPhone/iPad**: een app op het beginscherm heeft daar eigen opslag, los van Safari. Wie
  via de QR-code in Safari koppelt en daarna de app op het beginscherm zet, moet de code daar
  mogelijk nog één keer intypen.
- **Kwijtgeraakte code**: zonder gekoppeld apparaat is het receptenboek niet meer te bereiken.
  De eigenaar kan in dat geval via het Cloudflare-dashboard nog bij de gegevens, maar daar
  komt geen functie voor in de app.

## Aan de bouwer

- De woordenlijst voor codes en de precieze sterkte ervan.
- De manier van begrenzen van mislukte pogingen.
- De bibliotheek voor het tekenen van de QR-code.
- De indeling van de nieuwe laag in de app en de vorm van de receptvelden in D1
  (losse kolommen of één JSON-veld).
- De vormgeving van de nieuwe schermen, binnen de bestaande stijl (`variables.css`,
  `Button.svelte`): grote knoppen, grote letters, Nederlandse tekst.
- Tests: de bestaande Vitest-opzet uitbreiden; de Worker-routes en de vergelijking tussen
  server en lokale kopie moeten getest zijn.
