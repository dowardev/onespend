# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Explicit entry categories (global id+name, device-local): picked at entry creation via a searchable, accent-insensitive picker modal; synced to backend via the new nullable `category` field on budget entries.
- Performance config page (`/statistics/performance/config`) with per-section category mapping (single assign modal, 1 category to 1 section).
- Historial search by name and calendar date filter.
- Performance empty-section "Agregar" buttons now navigate to the entry form.
- Performance help button (per empty section) that explains the concept via the financial glossary.
- Sync page: single "Solucionar problemas de sincronización" action that runs update → full sync → conditional repair, reporting each step on the row.
- Sync page: without an active session the page renders a "Sesión requerida" empty state with a login CTA, and skips `refreshStatus()` and the sync UI instead of showing default (wrong) counters.
- DLQ view: per-item error detail is collapsed behind a chevron toggle, and long server errors are clamped to two lines.

### Changed
- Downloads page (`/downloads`) reorganized into Mobile / Web / Desktop groups with per-OS desktop entries (Linux, Windows, macOS — no more Electron branding); new upcoming entries: Uptodown (Android), Winget and Uptodown (Windows), DEB, Flathub, AUR and OBS (Linux) (LBDS-245).
- `@dowardev/sso-client` bumped to `^0.2.2`: the PKCE verifier now lives in `localStorage`, so a WebView recreated while the external browser is open keeps the login return working.
- Income Statement classification now uses the explicit category-to-section mapping, keeping the keyword heuristic as a byte-identical fallback for unmapped entries.
- App boot no longer blocks on SSO network calls (mount-first); Budget page entry gate is non-blocking.
- Budget account balances computed in a single pass.
- Performance page refreshes on every view entry, so records created in Budget show without a manual reload.
- Recurring list pause/resume button is now icon-only (with an aria-label); status badge and delete button kept.
- Recurring auto-insert moved to an app-level background processor that runs independently of the active screen.
- Sync page advanced actions (`Forzar sincronización completa`, `Reparar sincronización`, `Actualizar estado` and the failed-items entry) moved into a collapsed `ion-accordion` grouped with the one-step troubleshooting action inside a single `ion-card`; `dlqCount` is surfaced as a badge on the collapsed header (LBDS-263).
- Sync and DLQ pages reworked to Ionic-First layout: responsive `ion-grid`/`ion-row`/`ion-col` container and `ion-list`/`ion-list-header`/`ion-item` instead of custom `div` grids, with unified `ion-card shadow1` blocks.
- DLQ rows now use human-readable entity and operation labels and relative timestamps; the icon-only row actions carry distinct `aria-label`s naming the entity.
- Confirmation alerts for force-sync, repair and the troubleshooting sequence are fire-and-forget, so the dialog dismisses immediately and progress stays visible on the row.

### Fixed
- Native sign-in could not reach local HTTP backends from debug builds (`net::ERR_CLEARTEXT_NOT_PERMITTED`): a debug-only manifest overlay allows cleartext, while release builds keep the platform default.
- Deep links are honoured only while an SSO flow started by the app is still pending (persisted with a 10-minute TTL). A stale or foreign custom-scheme URL no longer clears local data as a "logout return", and an app resume no longer reprocesses the sticky launch URL — which re-exchanged a spent authorization code and bounced a signed-in user to the sign-in screen.
- Native logout: the confirmation alert closes immediately instead of waiting for the whole logout, and signing out keeps the user on Budget instead of the sign-in screen (which used to auto-open a second browser over the SSO logout page that was still completing).
- Web SSO callback surfaces error returns (`?error=`) again instead of landing silently on Budget.
- e2e mocks use the real token key (`@dowardev/sso-client:token`).
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
- Category picker no longer receives the dead `entry-type` prop (LBDS-228).
- Section-map comment and category-section docs now state the enforced 1:1 rule (first section wins) (LBDS-228).
- Default Income Statement section map is persisted on first read, so upgraded installs stop relying on the in-memory fallback (LBDS-228).
- Historial "Today" badge uses the device-local date instead of UTC (LBDS-228).
- `Forzar sincronización completa` always reported success: `syncController.fullSyncAndSave()` records failures in `syncError` instead of throwing, so the handler now reads `getSyncError()` and reports the real error.
- `Actualizar estado` gave no visible feedback: the row is now disabled and shows "Actualizando..." while it works, and reports success or failure.
- Sync error banner rendered red text on the red `ion-item color="danger"` background because the inner label carried its own `color` prop, overriding Ionic's automatic contrast color.
- DLQ expand/collapse is keyed on the row identity (`id ?? entityId`), so two rows for the same entity no longer expand together.
- The one-step troubleshooting sequence left stale counters when a step failed; it now refreshes the status before clearing the progress flag.