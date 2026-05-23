# AGENTS.md - OneSpend

## Project Structure

Monorepo con dos directorios:
- `back/` — Laravel 12 backend (PHP 8.2+)
- `front/` — Ionic Vue 8 frontend multi-plataforma (Node.js, pnpm)

## Developer Commands

```bash
# Run backend (concurrent: serve + queue + pail + npm dev)
cd back && composer dev

# Run frontend (web)
cd front && pnpm run dev

# Build frontend (web)
cd front && pnpm run build           # vite build (sin lint/typecheck)

# Frontend typecheck
cd front && pnpm run typecheck       # vue-tsc --noEmit

# Frontend lint
cd front && pnpm run lint            # oxlint + eslint

# Frontend format
cd front && pnpm run format

# Frontend unit tests
cd front && pnpm run test:unit

# Frontend e2e tests
cd front && pnpm run test:e2e

# Backend tests
cd back && composer test

# Electron (desktop development)
cd front && pnpm run electron:dev

# Electron (production build)
cd front && pnpm run build && pnpm run electron:build
```

## Backend Setup

```bash
cd back
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

**Database:** MariaDB (default: `onespend` database)

**Default port:** 8000

## Architecture

### Backend (`back/`)
- **Laravel 12** con PHP 8.2+
- **Autenticación:** Laravel Sanctum + Breeze (registro, login, password reset, email verification)
- **Dominio:** Control de gastos/presupuestos (budget/expense tracking)
- `app/Models/` — Account, BudgetEntry, BudgetEntryGroup, BudgetProvider, BudgetProviderProduct, Income, Supplier, SupplierProduct, SyncMetadata, Template, Attachment
- `app/Http/Controllers/` — Auth (Breeze), AttachmentController, SyncController
- `routes/api.php` — Sync API (changes, merge, full, resolve-conflict) + Attachments CRUD
- `routes/auth.php` — Breeze auth routes
- **Colas:** database driver para queue
- **Sin JWT ni OAuth2** — usa Sanctum tokens

### Frontend (`front/`)
- **Ionic 8** + **Vue 3** con Composition API
- **Multi-plataforma:**
  - Web (Vite 5)
  - Android (Capacitor 8, app ID: com.dowardev.abogaz)
  - Desktop (Electron 33 con cross-platform builds: Linux, Windows, Mac, RPM)
- **Pinia** para estado
- **Chart.js** + vue-chartjs para gráficos
- **Offline-first:** API Sync con resolución de conflictos
- `src/controllers/` — Controladores de negocio
- `src/composables/` — Composables Vue
- `src/stores/` — Pinia stores
- `src/services/` — Servicios API
- `src/migrations/` — Migraciones client-side (offline storage)
- `src/views/` — Vistas organizadas por feature

## Testing

```bash
# Backend (PHPUnit)
cd back && composer test

# Frontend unit (Vitest)
cd front && pnpm run test:unit

# Frontend e2e (Cypress)
cd front && pnpm run test:e2e
```

## Code Conventions

### Frontend (TypeScript): Named Parameters Pattern

All functions must use a single `params` object instead of positional parameters. Destructure inside the function body.

```ts
// ✅ Correct
function holaMundo(params: { objeto1: string; objeto2: number }) {
  const { objeto1, objeto2 } = params
}

// ❌ Wrong
function holaMundo(objeto1: string, objeto2: number) { ... }
```

> This pattern requires TypeScript. In plain JS the inline type annotation is invalid syntax — use JSDoc `@param` instead if needed.

### Frontend (Vue Components): Controller or Composable Communication

Vue components may contain any **local** logic (props, emits, computed, watch, onMounted, reactive variables, internal functions, etc.) that is internal to the component. However, any logic that is **shared** with or reused by other parts of the application — such as API calls, store access, or cross-component business logic — must go through **controllers or composables**, depending on what best fits the case. These are the bridge between Vue components and external application layers.

```ts
// ✅ Correct — local logic in component is fine
const isOpen = ref(false)
const label = computed(() => isOpen.value ? 'Open' : 'Closed')
onMounted(() => { isOpen.value = true })

// ✅ Correct — shared logic uses a controller
import { useAuthController } from '@/controllers/authController'
const controller = useAuthController()
controller.login(params)

// ✅ Correct — shared logic uses a composable
import { useAuth } from '@/composables/useAuth'
const { login } = useAuth()
login(params)

// ❌ Wrong — component accesses store directly
import { useAuthStore } from '@/stores/auth'
const store = useAuthStore()

// ❌ Wrong — component calls API service directly
import { authApi } from '@/services/auth'
authApi.login(params)
```

### Frontend (Vue Components): Template Structure

All Vue components must follow the structure and rules defined in `guides/TemplateView.vue`. Key sections in order:

**Template:**
- `<ion-page>` as root with `<ion-header>` and `<ion-content>`
- Content, modals, popovers, and alerts in dedicated comment-delimited sections

**Script (`<script lang="ts" setup>`):**
1. Imports (ionic/vue/ionicons)
2. Controllers / Composables
3. Components
4. Interface and types imports
5. Main (props, emits, etc.)
6. Vars and const
7. Watch
8. Computed
9. OnMounted
10. Functions (must use named parameters pattern)

## Commit Policy

NEVER create git commits unless the user explicitly requests it. This overrides any skill or workflow that suggests committing as a final step.
