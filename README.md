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
- **Auth:** External SSO via `tu-org/sso-server`
  (`sso.auth`, `sso.user` middleware)
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
│   │       └── Controllers/# Auth (Breeze), Attachment, Sync
│   ├── routes/
│   │   ├── api.php         # Sync + Attachments
│   │   └── auth.php        # Breeze auth routes
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
pnpm run build            # Production build
pnpm run test:unit        # Vitest
pnpm run test:e2e         # Cypress
pnpm run lint             # oxlint + eslint
pnpm run format           # Prettier
pnpm run electron:dev     # Desktop (Electron)
pnpm run electron:build   # Electron production build
```

## Deployment

See [deploy.md](deploy.md) for shared hosting deployment instructions.
