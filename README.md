<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

# OneSpend

Multi-platform personal expense management app.

| Platform | Technology |
|----------|-----------|
| Web | Ionic 8 + Vue 3 + Vite 5 |
| Desktop | Electron 33 (Linux, Windows, Mac, RPM) |
| Mobile | Capacitor 8 + Android |
| Backend | Laravel 12 + PHP 8.2+ |

## Stack

### Frontend (`front/`)

- **Framework:** Ionic 8 + Vue 3 (Composition API)
- **State:** Pinia
- **Charts:** Chart.js + vue-chartjs
- **Offline-first:** Sync engine with conflict resolution
- **Build:** Vite 5
- **Tests:** Vitest (unit), Cypress (e2e)

### Backend (`back/`)

- **Framework:** Laravel 12 + PHP 8.2+
- **Database:** MariaDB
- **Auth:** External SSO via `dowardev/sso-server`
  (`sso.auth`, `sso.user` middleware)
- **SSO packages:** local `composer install` requires the sibling `sso` checkout at `../sso` (composer path repository; CI checks it out automatically)
- **Queues:** Database driver (sync in production)
- **Schedule:** Daily cleanup 3 AM, monitor every 10 min
- **Tests:** PHPUnit

## Project Structure

```text
onespend/
├── back/           # Laravel 12 API
│   ├── app/
│   │   ├── Models/         # Account, BudgetEntry, Income, etc.
│   │   └── Http/
│   │       └── Controllers/# Auth (SSO), Attachment, Sync
│   ├── routes/
│   │   ├── api.php         # Sync + Attachments
│   │   └── auth.php        # SSO auth routes
│   └── ...
├── front/          # Ionic 8 + Vue 3
│   ├── src/
│   │   ├── controllers/    # Business logic
│   │   ├── composables/    # Shared reactive state
│   │   ├── stores/         # Pinia stores
│   │   ├── services/       # API services
│   │   └── migrations/     # Client-side offline migrations
│   └── ...
└── docs/           # Additional documentation
```

## Commands

### Backend

```bash
cd back
composer dev      # serve + queue + pail + npm dev (concurrent)
composer test     # PHPUnit
```

### Frontend

```bash
cd front
pnpm run dev              # Web (Vite)
pnpm run build            # Production build (web)
pnpm run build:native     # Production build (Android app; needs SSO_CLIENT_ID_NATIVE)
pnpm run test:unit        # Vitest
pnpm run test:e2e         # Playwright (starts its own dev server)
pnpm run lint             # oxlint + eslint
pnpm run format           # Prettier
pnpm run electron:dev     # Desktop (Electron)
pnpm run electron:build   # Electron production build
```

### Android

See [front/ANDROID.md](front/ANDROID.md) for device installs and production
builds (APK/AAB) from the terminal — no Android Studio required.

## Deployment

See [deploy.md](deploy.md) for shared hosting deployment instructions.

## License

OneSpend is free software: you can redistribute it and/or modify it under the
terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version. See the [LICENSE](LICENSE) file for the full text.

The `@dowardev/sso-client` package (consumed from the npm registry; source in the `sso` repo) is distributed
under the MIT license (permissive).
