# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- The live pull mapper (`SyncQueueService.mapServerItemToRow`) normalizes `recurring_record.time` to `"HH:MM"` (`"14:30:00"` -> `"14:30"`, `"9:00:00"` -> `"09:00"`), falling back to the local row's time when the server omits it. The server stores the column as a MySQL TIME and hands back `"HH:MM:SS"`, which the client stored verbatim, so the row disagreed with the field hash the server computes over the `"HH:MM"` the client sent — a phantom conflict on every push (GitLab #17).
- The date picker derives its locale from the app's active language (`es` -> `es-ES`, `en` -> `en-US`) instead of forcing `en-US`, so the calendar and the time picker follow the language the user picked. An explicit `locale` prop still wins (GitLab #17).
- The app now pushes the changes it queued while it was offline as soon as the connection comes back, instead of leaving them pending until the user taps sync by hand. An item queued offline carries no retry evidence of its own, so the reconnect itself is what marks a push as owed (GitLab #14).
- A run whose chunks all failed with a network or server error no longer unblocks the retries against an expired token: the auth block is now only lifted by a successful response from the server (GitLab #14).

### Changed
- The merge retry lifecycle is now a single state machine (`SyncRetryScheduler`) with one predicate, one timer and one re-arm per transition, instead of four independent guards each with its own arming logic. Its lock-retry budget lives in that state, so a lock that never frees can no longer be retried forever (GitLab #14).

### Removed
- `fromApiFormat` (`front/src/services/sync/entityMappers.ts`): a second pull mapper that only the tests used. The live pull path is `SyncQueueService.mapServerItemToRow`, and its coverage now pins the cases the dead mapper used to cover (GitLab #17).

## [v0.80.0] - 2026-10-27

### Added
- CI job `frontend_e2e`: the Playwright suite (`front/tests/e2e-playwright/`) now runs in CI — in its own job, on the Playwright browser image, for merge requests and for release tags — uploading the HTML report and the test artifacts. It is `allow_failure: true` for now, so a red e2e does not block a merge while the suite stabilises (GitLab #18).
- `front/tests/e2e-playwright/global-setup.ts`: warms up vite's on-demand transform cache before the first spec runs, so the first navigation does not pay the cold start of the whole route.
- `front/tests/e2e-playwright/helpers/syncConfig.ts`: `enableSync()` opts the browser context into sync, which the sync specs need — sync is opt-in since LBDS-289, so without it the sync button stays disabled and nothing is ever pushed.
- Optional time of day on budget entries and optional category on recurring charges: `BudgetEntryRow.time` and `RecurringRecordRow.category` are declared on the row types, `toBudgetEntryRow` / `mapEntryRow` preserve them, and `addIngreso` / `addEgreso` carry `time` on the create path. The live pull path (`mapServerItemToRow`) restores `budget_entry.time` (normalizing the server's `HH:MM:SS` to `HH:MM`) and `recurring_record.category`; the push mapper (`toApiFormat`) sends both. The entry form gets a time picker (same popover as the date, commits on Apply, defaults to the current time for a new entry), the recurring form gets a category picker reusing `CategoryPickerModal`, and the Historial list shows the time when the entry has one. A recurring charge with `autoInsert` propagates its category to the entry it generates (LBDS-273).

### Changed
- `front/playwright.config.ts`: the browser locale is pinned to `es-ES` (the specs assert Spanish UI strings and the app picks its language from `navigator.language`), the global timeout goes from 60s to 300s for the cold start, the HTML report is generated, and chromium runs with `--no-sandbox --disable-dev-shm-usage` so it survives a container.
- `front/vite.config.ts`: the e2e dev server (`VITE_E2E=true`) hides the fixed dev-mode banner, which used to swallow the clicks aimed at the elements underneath it.

### Fixed
- `syncController.getResolvedConflicts()` no longer lets `SyncDisabledError` escape when sync is off: the rejection aborted the whole status refresh of the `/sync` page, leaving it without the conflict list and with a page error in the console.
- Untranslated strings replaced by vue-i18n keys in the budget, recurring, performance, suppliers, accounts and failed-items-queue views, and the missing English keys added to `en.json` (including 12 `sync.dlqview.*` keys that were never added and rendered as raw key paths).
- The performance help popovers resolve their glossary entry by slug (`section.key` / `row.key`) instead of the translated title, so the concept definition shows up again.
- E2E specs updated for the current app: the sync specs opt into sync, the accordion header is scrolled with the browser (Ionic scrolls inside the shadow root of `ion-content`, which Playwright's auto-scroll does not follow), the i18n audit opens a page per route and got a bigger timeout, and `sync-divergence` mocks the session check (without it the app drops the fake token and renders the login gate instead of the sync page).
- 27 keys in `front/src/locales/en.json` still carried the Spanish text (recurring charge form, sync screen, performance chart modals, cash flow periods, account balance) and are now translated, and the Spanish suppliers title typo (`Provedores`) is fixed. 14 keys used in the templates did not exist in either locale, so vue-i18n rendered the raw key path on screen (entry editor, provider editor, attachments modal, day summary modal, performance page, account modal, dev-mode banner): they are now declared in `es.json` and `en.json`, the day summary modal uses the `fallbackTime` / `fallbackAccount` keys that already existed, and a new `fallbackName` key replaces the time/account fallbacks that were being used as name fallbacks.
- `notes` field on budget entries saved and synced end-to-end: `BudgetEntryRow.notes` is declared on the row type, `toBudgetEntryRow` and `mapEntryRow` preserve it, `addIngreso` / `addEgreso` accept `notes` on create, and the live pull mapper (`mapServerItemToRow`) restores it from the server payload. The sync push (`toApiFormat('budget_entry')`) and pull (`fromApiFormat('budget_entry')`) carry the field. The form preserves the absence of a note as `undefined` (no `notes: ''` wipe on the first edit of a pre-fix row) and the notes textarea enforces a 2000-char limit to match the server validation (LBDS-275).

## [v0.79.0] - 2026-10-11

### Added
- **SSO endpoint override in Conexiones** — the SSO server URL and the SSO login-panel URL are now user-configurable fields under the existing `Ajustes → Conexiones` screen, alongside the sync server URL introduced in LBDS-289. Self-hosters can point the login flow at their own SSO without rebuilding the APK. The build-time `VITE_SSO_URL` / `VITE_SSO_FRONTEND_URL` env vars seed the placeholders; saving a value persists it in `configDb` and overrides the bundled default; clearing the field falls back to the env default. The `SSOClient` is now built with the resolved URLs at boot (LBDS-295, mezinster #1).
- `front/src/services/sso/ssoConfig.ts` — new resolver module mirroring the `syncConfig` pattern. `getSsoBaseUrl()` / `getSsoFrontendUrl()` read `configDb` first, fall back to the env-var defaults, and log a generic warning (no echo of the raw persisted value) when the row is missing, empty, malformed, or uses a non-http(s) scheme.

### Changed
- `front/src/main.ts` constructs the `SSOClient` after the resolver has resolved the URLs, so the client is always pointing at the user's URL by the time `init()` runs. A top-level try/catch around the resolver falls back to the env-var defaults if `configDb` fails to open at boot, so a Dexie error no longer blocks the app from starting.

### Fixed
- The Android WebView no longer queries `content-autofill.googleapis.com` on fresh install: `front/android/app/src/main/res/layout/activity_main.xml` sets `android:importantForAutofill="no"` on the WebView host layout. This is the same finding visheh10 raised for v0.77.0; the F-Droid static reviewer (mezinster) re-raised it for v0.78.0 (LBDS-295, mezinster #4).
- F-Droid metadata: `7800.txt` (the v0.78.0 user-visible changelog on F-Droid) is now present in both `en-US` and `es`; the F-Droid build no longer warns about a missing changelog for the new version.
- F-Droid `com.dowardev.onespend.yml` `Description` now declares the default servers (sync + SSO + login panel) in a "Default servers" paragraph and points at the public SSO source, so reviewers and end users see exactly what the build is pointing at before any user override (LBDS-295, mezinster #2).

### Changed
- Downloads page: removed the AppGallery accordion (OneSpend will not be published in AppGallery); the Uptodown entry now shows the `available` badge and its download button opens `https://onespend.en.uptodown.com/android` in a new tab via `openUptodown()` in `front/src/views/info/DownloadsPage.vue`.

## [v0.78.0] - 2026-10-06

### Added
- Sync page: a "Diagnóstico de divergencias" action runs the new `SyncDivergenceDetector`, reports drift per entity type (rows missing on server / missing locally, version drift, fields that would be dropped by a pull, dangling category ids, unapplied server tombstones), and exposes the full report through `window.__devDb.detectDivergence()` for scripted use. A second "Reparar divergencias" action requeues the local rows that never reached the server and triggers a pull to converge (LBDS-276).
- Detector module `front/src/services/sync/SyncDivergenceDetector.ts` with a pure `compareEntitySets` core driven by synthetic arrays, a small Dexie/HTTP wrapper, and a `LocalOnlyFieldRegistry` that lists fields the front holds but the server cannot reproduce (so `pull-droppable fields` can be computed).
- Sync opt-in: a new **Ajustes → Conexiones** page (route `/settings/connections`) exposes the `Sincronización` toggle and the `URL del servidor` input. The bundled `VITE_API_URL` only seeds the placeholder; the user can paste any other URL and the app syncs to that target without rebuilding the APK / web bundle. Both the toggle and a non-empty URL are required before any HTTP request is made (LBDS-289).
- Full i18n wrap with `vue-i18n` 9: a language selector in the side menu lets the user switch between Spanish and English. On the very first launch (no user pick, no persisted override), `detectSystemLocale()` in `front/src/i18n.ts` reads `navigator.language` and resolves `es-*` to Spanish, anything else to English (F-Droid reviewer's policy), then persists the result in `configDb` so subsequent launches skip the detection. Every user-visible string in the app is now behind a translation key, and the financial glossary (`useFinancialGlossary`) plus the income-statement label map (`useIncomeStatement.labelMap`) are sourced from the locale files (LBDS-289).
- F-Droid metadata now declares the opt-in sync posture and the in-app URL override in the `Description` field, and the YAML is quoted so `fdroid build` parses cleanly (LBDS-289).

### Changed
- Side-menu item "Ajustes de sincronización" was renamed to "Conexiones" and the route moved from `/settings/sync` to `/settings/connections` to match (LBDS-289).
- The sync page shows a "Sincronización desactivada" gate card (with a "Ir a Conexiones" CTA) when the toggle is off or the URL is empty, instead of letting the user start work that would fail. The form is also dimmed and the action buttons are disabled in that state (LBDS-289).
- The sync gate (HTTP layer in `SyncApiService`, queue scheduler in `SyncQueueService`, attachment drain in `processPendingAttachments`, and the `syncController.ensureSyncEnabled` short-circuit) now requires BOTH the opt-in toggle AND a non-empty server URL. `readSyncConfig()` reads both rows in parallel (LBDS-289).

### Fixed
- The sync queue no longer stays stuck at "N pending": a missing server acknowledgement or a busy sync lock now arms a retry on its own, and the automatic retry is bounded and respects both the offline state and an expired token.
- A failed queue push no longer suppresses the server pull, a sync failure is no longer reported as success, and the error toast is still shown when the status refresh also fails.
- Pull overwrites no longer drop fields that the server actually stored: `mapServerItemToRow` now reads every column the `RecurringRecord` model persists under the front's camelCase keys (`repeatFrequency`, `repeatInterval`, `repeatDays`, the repeat-month/weekday rules, `repeatYearMonth`, `repeatYearDay`, `time`, `autoInsert`, `estimated`, `items`, `notes`, `status`, `type`), and restores `budget_entry.category` and `budget_entry._from_recurring_id` from the server payload (`entityMappers.toApiFormat` now sends `_from_recurring_id` for budget entries too) (LBDS-276 / LBDS-275-class gap).
- `pullChanges` and the merge push now advance `last_sync` monotonically through `advanceLastSyncMonotonic` / `advanceLastSyncAfterPull`: a behind client clock cannot rewind the cursor, and the pull advance anchors on the max `updated_at` actually delivered instead of the server `now()`, closing the systematic skip window (LBDS-276).
- Tombstones no longer silently disappear when the row is in the local queue: `saveChangesToLocalDb` now distinguishes the queued operation. A queued `create` against a server-side tombstone drops the queue entry and applies the delete locally (no resurrection). A queued `delete` against the same tombstone applies the delete and drops the now-satisfied queue entry. A queued `update` against a tombstone escalates a conflict so the divergence detector and the user can resolve it (LBDS-276 class 4).
- `EntryEditPage.confirmDelete()` now deletes the underlying `BudgetEntryRow` (previously the confirm alert only cleared the entry's attachments and navigated back, leaving the row in IndexedDB and the sync queue without a `delete` op). `BudgetEntriesController.removeEntry()` falls back to Dexie when the entry is not in the date-filtered Pinia store, covering deep-link scenarios where `useEntryLoader` loads the entry straight from IndexedDB without going through `BudgetView`. A success/error toast reports the outcome (LBDS-279).
- `last_sync` cursor no longer stuck on first sync: the `!wasFullSync` guard was removed in `processQueue`, `pullChanges`, and `fullSync`, so the cursor advances the first time data is pulled (LBDS-289).
- `SyncStatus` no longer stuck on "Sincronizando..." after a sync error: the `reconstructQueueForUnsyncedCreates()` call was moved INSIDE the try block in `syncController.syncNow()` so the `finally` always resets `isSyncing` (LBDS-289).
- "Sincronizado hace 20710d" unit-mismatch bug: the cursor was stored as seconds, the display compared against `Date.now()` (ms). Added `LAST_SYNC_DISPLAY_KEY` (client wall-clock) and `getLastSyncDisplayTime()` to keep the server cursor and the UI display on separate clocks (LBDS-289).
- vue-i18n "Invalid arguments" runtime errors: the invalid `t({ key, es })` pattern in `SyncStatus.formatTime` and `PendingRecurringModal.frequencyLabel` was replaced with the vue-i18n `t(key, params)` signature (LBDS-289).
- The user section in `MainMenu` now appears on page reload: the auth store now persists the user object in `localStorage` (sync fast-path) and in `configDb` IndexedDB (async hydration) on every login / logout (LBDS-289).
- `authStore.logout()` race: `logout()` is now async and awaits the IndexedDB delete, and a `loggedOut` latch prevents the async hydration IIFE from restoring a stale user if the delete fails or is slow (LBDS-289).
- `ensureSyncEnabled` / `isSyncEnabledForRun` previously checked only the opt-in flag, leaving a window where a scheduled retry could acquire the lock and only fail on the first API call. Both gates now require flag + URL (LBDS-289).
- F-Droid `com.dowardev.onespend.yml` was failing `yaml.safe_load` because the `Description` value contained an unquoted `opt-in: ` scalar; the value is now quoted (LBDS-289).
- 12 hardcoded Spanish strings (e.g. "Seleccionar cuenta", "Pausar / Reanudar", "Sin nombre", "Cálculo:", "elemento fallido / elementos fallidos", "Archivos seleccionados / existentes", "Costo de Vida", etc.) are now behind i18n keys; the financial glossary entries plus the income-statement labels render in the user's language instead of being hardcoded Spanish (LBDS-289).
- The Playwright i18n audit now makes hard assertions (was audit-only), covers the side menu in addition to the main content, and the SPANISH_HINTS list includes all the F3 strings. The spot-check test covers `/sync/dlq`, `/recurring`, and `/accounts` in addition to the original routes (LBDS-289).
- `SyncSettingsPage` shows a warning toast on blur if the URL is not parseable, so the user is no longer left wondering why the save was skipped (LBDS-289).
- The `isUser` type guard now validates string length caps and a basic email shape, so a corrupted localStorage entry cannot render `undefined` or unbounded strings in the menu (LBDS-289).

## [v0.77.0] - 2026-09-18

### Added
- Sync page: single "Solucionar problemas de sincronización" action that runs update → full sync → conditional repair, reporting each step on the row.
- Sync page: without an active session the page renders a "Sesión requerida" empty state with a login CTA, and skips `refreshStatus()` and the sync UI instead of showing default (wrong) counters.
- DLQ view: per-item error detail is collapsed behind a chevron toggle, and long server errors are clamped to two lines.
- Playwright coverage for the offline → online queue drain (`offline-online-sync.spec.ts`: offline entry drains on reconnect, 3-entry batch, retry after a 500, stale-flag recovery without force/repair) and unit coverage for the merge ack handling (`syncAck.test.ts`) (LBDS-244).

### Changed
- Sync page advanced actions (`Forzar sincronización completa`, `Reparar sincronización`, `Actualizar estado` and the failed-items entry) moved into a collapsed `ion-accordion` grouped with the one-step troubleshooting action inside a single `ion-card`; `dlqCount` is surfaced as a badge on the collapsed header (LBDS-263).
- Sync and DLQ pages reworked to Ionic-First layout: responsive `ion-grid`/`ion-row`/`ion-col` container and `ion-list`/`ion-list-header`/`ion-item` instead of custom `div` grids, with unified `ion-card shadow1` blocks.
- DLQ rows now use human-readable entity and operation labels and relative timestamps; the icon-only row actions carry distinct `aria-label`s naming the entity.
- Confirmation alerts for force-sync, repair and the troubleshooting sequence are fire-and-forget, so the dialog dismisses immediately and progress stays visible on the row.
- `SyncQueueService.refreshOnlineStatus()` re-reads `navigator.onLine` and reconciles the cached flag (also on `visibilitychange`), and the controller guards reconcile before refusing work while offline, so a missed `online` event no longer leaves the queue blocked on "Fuera de línea" (LBDS-244).
- The merge client consumes the server's new `skipped` bucket and acknowledges those ids, so deduplicated or dropped rows drain instead of being retried forever (LBDS-244).

### Fixed
- `Forzar sincronización completa` always reported success: `syncController.fullSyncAndSave()` records failures in `syncError` instead of throwing, so the handler now reads `getSyncError()` and reports the real error.
- `Actualizar estado` gave no visible feedback: the row is now disabled and shows "Actualizando..." while it works, and reports success or failure.
- Sync error banner rendered red text on the red `ion-item color="danger"` background because the inner label carried its own `color` prop, overriding Ionic's automatic contrast color.
- DLQ expand/collapse is keyed on the row identity (`id ?? entityId`), so two rows for the same entity no longer expand together.
- The one-step troubleshooting sequence left stale counters when a step failed; it now refreshes the status before clearing the progress flag.
- Zombie queue items (3 retries, or stale beyond 24h after retrying) auto-quarantine to DLQ instead of leaving a permanent "1 pendiente" counter, so they surface in `/sync/dlq` for per-item retry or discard (LBDS-244).
- Pending-attachments upload no longer strands when the merge fails. `SyncQueueService.processPendingAttachments` was a side-effect of a successful merge (called at the end of the merge loop, inside the try); a 500 from `/api/sync/merge`, a lock collision or any per-chunk error that surfaced as a throw skipped the drain and left the file in `pendingAttachments` forever. The drain now lives in the `finally` block and re-arms from a self-contained scheduler on `online` / `visibilitychange` / end-of-merge, with `useAttachments.saveAttachments` requesting an immediate drain after a new-entry save (LBDS-287).
- An in-flight guard (`pendingDrainInFlight`) serialises concurrent drain calls. Before this, the merge-finally drain and the scheduler's timer could both read the same pending row and both call the upload endpoint while the previous request was still in flight, producing two server rows per file. The guard makes the second call a no-op; the scheduler re-arms on its own if any rows remain (LBDS-287).
- The drain now honours `syncBlockedByAuth`: a 401 from the merge, from the inline upload in `useAttachments.saveAttachments`, or from the pull pauses the attachment drain until the next successful response clears the flag. Auth recovery (`resumeRetriesAfterAuthRecovery`) re-arms the attachment scheduler alongside the merge-queue backoff retry, so a re-login drains pending uploads without waiting for a visibility / online event (LBDS-287).
- The attachment scheduler uses exponential backoff (5s base, doubled up to a 60s cap) and resets to the base interval the moment the `pendingAttachments` table empties, so a one-off transient 5xx does not lock the drain into a slow cadence (LBDS-287).

## [v0.76.4] - 2026-09-12

### Changed
- Downloads page (`/downloads`) reorganized into Mobile / Web / Desktop groups with per-OS desktop entries (Linux, Windows, macOS — no more Electron branding); new upcoming entries: Uptodown (Android), Winget and Uptodown (Windows), DEB, Flathub, AUR and OBS (Linux) (LBDS-245).

## [v0.76.2] - 2026-09-10

### Changed
- `@dowardev/sso-client` bumped to `^0.2.2`: the PKCE verifier now lives in `localStorage`, so a WebView recreated while the external browser is open keeps the login return working.

### Fixed
- Native sign-in could not reach local HTTP backends from debug builds (`net::ERR_CLEARTEXT_NOT_PERMITTED`): a debug-only manifest overlay allows cleartext, while release builds keep the platform default.
- Deep links are honoured only while an SSO flow started by the app is still pending (persisted with a 10-minute TTL). A stale or foreign custom-scheme URL no longer clears local data as a "logout return", and an app resume no longer reprocesses the sticky launch URL — which re-exchanged a spent authorization code and bounced a signed-in user to the sign-in screen.
- Native logout: the confirmation alert closes immediately instead of waiting for the whole logout, and signing out keeps the user on Budget instead of the sign-in screen (which used to auto-open a second browser over the SSO logout page that was still completing).
- Web SSO callback surfaces error returns (`?error=`) again instead of landing silently on Budget.
- e2e mocks use the real token key (`@dowardev/sso-client:token`).
- Category picker no longer receives the dead `entry-type` prop (LBDS-228).
- Section-map comment and category-section docs now state the enforced 1:1 rule (first section wins) (LBDS-228).
- Default Income Statement section map is persisted on first read, so upgraded installs stop relying on the in-memory fallback (LBDS-228).
- Historial "Today" badge uses the device-local date instead of UTC (LBDS-228).

## [v0.76.1-rc.4] - 2026-09-04

### Added
- Explicit entry categories (global id+name, device-local): picked at entry creation via a searchable, accent-insensitive picker modal; synced to backend via the new nullable `category` field on budget entries.
- Performance config page (`/statistics/performance/config`) with per-section category mapping (single assign modal, 1 category to 1 section).
- Historial search by name and calendar date filter.
- Performance empty-section "Agregar" buttons now navigate to the entry form.
- Performance help button (per empty section) that explains the concept via the financial glossary.

### Changed
- Income Statement classification now uses the explicit category-to-section mapping, keeping the keyword heuristic as a byte-identical fallback for unmapped entries.
- App boot no longer blocks on SSO network calls (mount-first); Budget page entry gate is non-blocking.
- Budget account balances computed in a single pass.
- Performance page refreshes on every view entry, so records created in Budget show without a manual reload.
- Recurring list pause/resume button is now icon-only (with an aria-label); status badge and delete button kept.
- Recurring auto-insert moved to an app-level background processor that runs independently of the active screen.

### Fixed
- Recurring charge save button now enables correctly.
- Recurring auto-insert no longer requires a page reload.
- Recurring pause/resume works in both directions (DataCloneError from reactive proxies fixed by deep-cloning in the sync queue).
- A recurring record resumed after its due time no longer backfills the paused day.
- Pause/resume from the edit-page header popover works for synced records (record id now resolves to `sync_id`).
- Recurring time picker now saves the selected value.
- Performance "Agregar" buttons that did nothing now navigate to the entry form.
- Entry category is persisted on create and edit, and editing an entry shows its current category.
- Custom section assignments and category names now apply live in Performance (section map is read reactively; previous-period comparison uses the same registry).
- Reassigning a seed category to another section no longer double-counts it in both sections.
- Excel export folds custom-category amounts into "other" buckets so it matches on-screen totals.
- Creating a duplicate category keeps the alert open instead of closing silently.
- Editing an entry's date together with other fields no longer drops the non-date changes.
