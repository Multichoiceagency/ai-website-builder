# Handover voor Claude Code

## Doel

Maak de gegenereerde pagina-editor af en verbeter de standaardoutput van **alle nieuw gegenereerde websites**:

1. Registry-secties moeten zichtbaar en bewerkbaar blijven in de editor.
2. Assistentwijzigingen aan secties moeten via de lokale editorstaat en undo-history lopen.
3. Een merklogo staat standaard groot en gecentreerd op een eigen rij boven de navigatie.
4. Het logo heeft geen kaart, pil, rand, achtergrond, radius of schaduw eromheen.
5. Nieuwe sites krijgen maximaal drie relevante beelden: eerst bestaande tenant-media of Pexels hergebruiken, daarna alleen ontbrekende beelden met een apart image-model genereren.

GPT-5.6-sol is het code/tekstmodel voor deze implementatie, niet de image-provider. Gebruik voor afbeeldingsbestanden in de eerste implementatie Gemini image generation, omdat het project al een gevalideerde Gemini HTTP-client en `GEMINI_API_KEY` heeft. De image-modelnaam blijft verplicht configureerbaar.

## Huidige Git-status

Werk vanuit:

```text
/Users/multichoiceagency/Documents/GitHub/ai-website-builder
```

Laat bestaande wijzigingen staan. De worktree bevat bewust een onafgemaakte wijziging:

```text
 M apps/dashboard/app/components/AssistantPanel.vue
```

De editorreparatie is al gecommit:

```text
162cb6a0ba9e39a961bd68fd7f0dd89012fc3d83
fix(editor): show the sections a generated page actually has
```

Die commit doet het volgende in `apps/dashboard/app/pages/pages/[pageId].vue`:

- `freeformOnly` staat op `false`.
- `EditorCanvas` ontvangt alle `sections` in plaats van alleen canvas-secties.
- Een leeg start-artboard wordt alleen toegevoegd wanneer de pagina nul secties heeft.
- Registry-secties krijgen `SectionProperties` en `SectionForm` in de inspector.
- `?mode=ai` opent de assistent ook wanneer opgeslagen paneelstaat dicht stond.

## Onaf werk: AssistantPanel

`apps/dashboard/app/components/AssistantPanel.vue` bevat al een lokale `SectionLike` interface, een optionele `applySections` prop en de helper `patchSections()`.

De volgende acties gebruiken die helper al:

- `setContentWidth` / `setPageLayout`
- `setHeaderLogo`
- `setHeaderLogoSize`
- `patchSectionProps`

De reden: een directe API-`PATCH` werd later overschreven door de verouderde lokale kopie van de editor. In de editor moet elke sectiemutatie daarom door dezelfde `mutate()`-route lopen als handmatige bewerkingen.

### Nog doen

1. Geef `AssistantPanel` in `apps/dashboard/app/pages/pages/[pageId].vue` een `:apply-sections` callback.
2. Laat de callback de transform uitvoeren op `sections.value`.
3. Wanneer de transform dezelfde arrayreferentie teruggeeft: retourneer `{ applied: false }` en roep `mutate()` niet aan.
4. Wanneer er een nieuwe array terugkomt: roep `mutate(next)` aan en retourneer `{ applied: true }`.
5. Controleer ook de overige assistentacties op directe page-`PATCH`-calls die secties wijzigen. Routeer alleen sectiemutaties via `patchSections()`; laat site/theme-mutaties ongemoeid.
6. Verwijder de lange nieuwe comments in `AssistantPanel.vue` waar namen en types het contract al duidelijk maken. Houd alleen informatie die niet uit de code afleidbaar is.

Relevante plekken:

- `apps/dashboard/app/pages/pages/[pageId].vue:178` bevat `mutate(next)`.
- `apps/dashboard/app/pages/pages/[pageId].vue:1888` mount `AssistantPanel`.
- `apps/dashboard/app/components/AssistantPanel.vue:156` bevat `patchSections()`.

## Logo-eis voor nieuwe websites

De gebruiker heeft expliciet gekozen voor:

- bereik: alle nieuw gegenereerde websites;
- positie: gecentreerd op een eigen rij boven de navigatie;
- formaat: 48 px hoog op mobiel en 64 px vanaf `md`, met `max-width: min(320px, 80vw)`;
- omlijsting: volledig transparant en zonder border, shadow of afgeronde kaart/pil.

De screenshots zijn met een observer-agent bekeken. De eerste toont een te klein merkblok boven de hoofdtekst. De tweede toont een horizontaal Webcare Studio-logo in een witte pill/card met rand en zachte schaduw. Leg de tijdelijke screenshotpaden niet vast; ze leven onder `/var/folders/...`.

### Aanbevolen implementatie

Beperk nieuw gedrag tot gegenereerde sectieprops, zodat bestaande websites niet stilzwijgend veranderen.

1. Voeg aan iedere registry-header die de generator kan kiezen een expliciete gestapelde variant toe, bijvoorbeeld `layout: 'stacked'`, als de bestaande `center`-variant het logo op desktop weer naast de navigatie zet. Begin met `header-simple-01` en `header-liquid-glass-01`; controleer de generatiecatalogus op aanvullende header-ID's.
2. Render in die variant eerst een merkrij en daaronder de navigatie/CTA.
3. Gebruik voor gegenereerde headers standaard `logoHeight: 'xl'` en de gestapelde variant wanneer `profile.brand.logo` gevuld is. Definieer `xl` in deze variant als 48 px mobiel en 64 px vanaf `md`; zet daarnaast de maximale breedte hierboven.
4. Render de brand-anchor en logo-wrapper zonder achtergrond, border, ring, radius of shadow.
5. Houd de afbeelding `w-auto object-contain`; forceer geen vierkant formaat voor horizontale logo's.
6. Als de witte omlijsting in de afbeeldingspixels zelf zit, los dat niet met CSS op. Detecteer dit eerst in de browser/asset-preview en gebruik dan een transparante bron of een expliciete media-bewerking.

Relevante bestanden:

- `services/core-api/src/lib/generation/index.ts:344-364` bouwt props voor alle header-blocks.
- `packages/blocks/src/library/layout.ts` definieert header-fields en Zod-schema's.
- `packages/blocks-nuxt/components/Block/HeaderSimple01.vue` rendert de standaardheader.
- `packages/blocks-nuxt/components/Block/HeaderLiquidGlass01.vue` heeft een tweede headerimplementatie.

Voorkom een globale wijziging van de bestaande `md` default als dat bestaande pagina's aanpast. De generator moet de nieuwe props expliciet opslaan.

## Beeldstrategie voor nieuwe websites

Besloten defaults:

- maximaal drie beelden per nieuwe site;
- eerst tenant-assets hergebruiken;
- daarna Pexels zoeken en in de tenantbibliotheek importeren;
- alleen ontbrekende beelden genereren met een apart image-model;
- geen persoonsgegevens of geheime configuratie in prompts;
- bij providerfouten doorgaan met bestaand beeld, stock of een neutrale placeholder;
- assets dedupliceren en later opnieuw bruikbaar houden.

De limiet van drie geldt voor inhoudelijke foto's/illustraties die in pagina-secties worden geplaatst, inclusief bestaande `BusinessProfile.media`. Logo's, favicons, iconen en decoratieve CSS/SVG-vormen tellen niet mee. Een asset mag maar één keer binnen dezelfde site worden gekozen, tenzij de gebruiker expliciet herhaling vraagt.

### Wat al bestaat

- `BusinessProfile.media` bevat ontdekte websitebeelden.
- `services/core-api/src/adapters/stock/pexels.ts` zoekt Pexels-foto's via `PEXELS_API_KEY`.
- `services/core-api/src/routes/stock.ts` valideert provider-URL's, downloadt bytes, gebruikt `prepareUpload()`, schrijft naar storage en maakt een `MediaAsset`.
- `services/core-api/src/db/repositories/content.ts` bevat `listMediaLibrary()`, `insertMediaAsset()` en lookupfuncties.
- `services/core-api/src/lib/generation/index.ts:378-389` vult `hero-split-*` nu alleen met `profile.media[0]`.
- `services/core-api/src/routes/onboarding.ts:399-553` composeert en bewaart gegenereerde sites.

### Aanbevolen datastroom

1. Maak een server-side media-resolver die een korte lijst zoekintenties ontvangt, afgeleid van branche, diensten, locatie en sectierol (`hero`, `service`, `about`).
2. Zoek eerst geschikte tenant-assets op tags/metadata en voorkom herhaling binnen dezelfde site.
3. Zoek daarna Pexels via de bestaande adapter. Refactor de importlogica uit de route naar een herbruikbare service; roep geen interne HTTP-route aan.
4. Gebruik alleen bij resterende gaten een `ImageGenerationProvider` interface met in eerste instantie één implementatie: `GeminiImageGenerationProvider`. Deze gebruikt de bestaande `GEMINI_API_KEY` en vereist `GEMINI_IMAGE_MODEL`. Er is bewust geen hardcoded image-modeldefault: ontbreekt key of model, dan is AI-imagegeneratie uitgeschakeld en blijft stock/placeholder actief. Voeg geen nieuw SDK toe als de bestaande HTTP-aanpak volstaat. Maak naast `generateGeminiContent()` een image-specifieke call die `inlineData`/`inline_data` bytes en MIME uit de response leest; verander de tekstparser niet in een union die ieder bestaand pad complexer maakt. Geen sleutel of echte endpoint-credential in source, tests, logs of documentatie.
5. Sla elk gekozen of gegenereerd bestand als `MediaAsset` op met bruikbare alttekst, tags, bron/provider en checksum. Hergebruik de bestaande uploadvalidatie en storagecode.
6. Geef de composer een verrijkt profiel of een expliciete media-map per sectierol. Gebruik niet blind hetzelfde beeld in elke sectie.
7. Houd de sitegeneratie betrouwbaar: stock/hergebruik gebeurt voor compositie. AI-imagegeneratie mag na het bewaren van de site draaien, maar alleen via een duurzame job die `siteId`, `pageId`, sectierol en promptmetadata opslaat en de bedoelde sectie daarna conditioneel patcht. De job moet idempotent en retrybaar zijn. Als het project geen duurzame jobrunner heeft, implementeer geen los `void promise`-pad: gebruik dan tijdelijk een awaited providercall met een totale timeout van 20 seconden per site en val daarna terug op stock/placeholder. Noteer die fallback duidelijk in de codewijziging/PR.

Geschiktheid en deduplicatie:

- tenant-media: geef voorkeur aan image-MIME, liggende oriëntatie voor hero's en tags die branche, dienst of sectierol raken;
- Pexels: gebruik de bestaande landschapzoekopdracht en neem per intentie hoogstens één resultaat;
- tenant-breed: voorkom dubbele opslag via de checksum die `prepareUpload()` al berekent;
- site-breed: houd gekozen media-ID's/URL's in een set om dezelfde asset niet tweemaal te plaatsen;
- een ontdekt `BusinessProfile.media`-beeld telt als eerste kandidaat, maar moet dezelfde MIME/URL-validatie en sitebrede deduplicatie doorlopen.

### Security en kosten

- Valideer alle externe download-URL's met de bestaande provider-allowlist.
- Accepteer alleen ondersteunde image MIME-types en maximale bestandsgrootte via `prepareUpload()`.
- Log provider, duur, status en aantallen, nooit prompts met PII of credentials.
- Leg per generatie vast: hergebruikte assets, geïmporteerde stock, gegenereerde beelden, fouten en geschatte kosten.
- Maak Gemini image generation optioneel wanneer `GEMINI_API_KEY` of `GEMINI_IMAGE_MODEL` ontbreekt.
- Patch een asynchroon gegenereerd beeld alleen wanneer de doelsectie nog bestaat en het media-veld niet ondertussen door een gebruiker is aangepast.

## Testverwachtingen

Voeg gerichte tests toe voor:

1. `applySections` gebruikt lokale editorstaat en maakt precies één undo-stap.
2. Een no-op transform markeert de pagina niet dirty.
3. Een nieuwe site met logo krijgt gestapelde headerprops en `xl` logoformaat.
4. Een headerlogo heeft in de gerenderde output geen wrapperclasses voor background/border/shadow/radius.
5. Een horizontaal logo behoudt aspect ratio op mobiel en desktop.
6. Media-resolutie gebruikt eerst tenant-media, dan Pexels, dan image-generatie.
7. De resolver stopt bij drie unieke assets.
8. Pexels- en image-providerfouten laten sitegeneratie slagen.
9. Checksum/tag-deduplicatie voorkomt dubbele imports.
10. Alttekst en bronmetadata worden opgeslagen.

## Verificatie

Run minimaal:

```bash
pnpm --filter @platform/dashboard typecheck
pnpm --filter @platform/dashboard test
pnpm --filter @platform/core-api typecheck
pnpm --filter @platform/core-api test
pnpm --filter @platform/blocks-nuxt build
pnpm --filter @platform/blocks-nuxt test
git diff --check
git status --short
```

De dashboard- en blocks-tests zijn momenteel doorverwijzende/no-op scripts. Voeg gerichte Vitest/componenttests toe in het pakket dat het gedrag bezit; beschouw de bestaande echo-scripts niet als bewijs voor undo-, dirty- of rendergedrag.

Voer daarna een handmatige browsercheck uit op mobiel en desktop:

- genereer een nieuwe site met een breed horizontaal logo;
- bevestig dat de echte registry-secties direct zichtbaar zijn;
- wijzig logo en logoformaat via de assistent en gebruik undo/redo;
- herlaad voor save en na save om stale-state overschrijvingen uit te sluiten;
- controleer dat het logo groot, boven de navigatie en volledig frameless is;
- controleer dat maximaal drie passende beelden zijn gekozen en in de mediabibliotheek staan.

Lokale voorwaarden voor die check:

```bash
pnpm infra:up
pnpm dev
```

- Gebruik een testtenant met `page:write`, `media:read` en `media:write`.
- Stel `PEXELS_API_KEY` alleen lokaal/deployment-side in; zonder key moet de fallback nog steeds slagen.
- Test AI-images eenmaal zonder providerconfiguratie en eenmaal met geldige `GEMINI_API_KEY` en `GEMINI_IMAGE_MODEL`.
- Gebruik als fixture een transparant horizontaal logo van ongeveer 4:1, plus een variant met een ingebakken witte achtergrond om CSS-frame en assetpixels uit elkaar te houden.

## Niet doen

- Revert of overschrijf de bestaande wijziging in `AssistantPanel.vue` niet.
- Commit geen `.env`-bestand, API-key, modelcredential of prompt met persoonsgegevens.
- Laat de browser niet rechtstreeks met Pexels of een image-provider praten.
- Verander bestaande gepubliceerde websites niet via een nieuwe globale componentdefault.
- Claim niet dat GPT-5.6-sol zelf images genereert.
