<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

# Deployment Guide

This guide covers deploying OneSpend on shared Apache hosting with SSH support.

> **Note:** Deployment can be done **manually** (SSH, documented here)
> or **automatically** via GitLab CI/CD with tags (see section 9).

---

## 1. Prerequisites

- PHP 8.2+
- Composer
- Node.js 20+
- pnpm
- MariaDB/MySQL (provided by hosting)
- Apache with mod_rewrite
- SSH access
- Cron

---

## 2. SSO Authentication

OneSpend uses an external SSO server for authentication
([source code](https://gitlab.com/dowardev/sso)).
You must set up the SSO server first, then configure the apps.

### Configure the SSO Server

1. Log into the SSO admin panel
2. Register OneSpend as a new application:
   - **Client ID:** pick a name (e.g. `onespend-app`)
   - **Redirect URIs:** `https://app.yourdomain.com/callback`
   - **Client Secret:** auto-generated

### Auth Flow

1. Frontend redirects the user to the SSO login page
2. SSO returns a signed JWT after successful login
3. Backend verifies the JWT via `sso.auth` middleware
4. Protected routes use `sso.auth` and `sso.user`
   from the `tu-org/sso-server` package

---

## 3. Backend Deployment

### 1. Install Dependencies

```bash
cd back
composer install --no-dev --optimize-autoloader
```

> `--no-dev` skips dev packages (tests, linters).
> `--optimize-autoloader` generates an optimized class map
> for better performance.

### 2. Configure Environment

Create `back/.env` from the example:

```bash
cp .env.example .env
php artisan key:generate
```

Edit the following variables in `.env`:

<!-- markdownlint-disable MD013 -->
| Variable           | Description            | Example                          |
| ------------------ | ---------------------- | -------------------------------- |
| `APP_ENV`          | Environment            | `production`                     |
| `APP_DEBUG`        | Debug mode             | `false`                          |
| `APP_URL`          | Backend URL            | `https://api.yourdomain.com`     |
| `DB_HOST`          | MySQL host             | `[provider_host]`                |
| `DB_PORT`          | MySQL port             | `3306`                           |
| `DB_DATABASE`      | Database name          | `[db_name]`                      |
| `DB_USERNAME`      | Database user          | `[db_user]`                      |
| `DB_PASSWORD`      | Database password      | `[db_password]`                  |
| `SESSION_DRIVER`   | Session driver         | `database`                       |
| `MAIL_MAILER`      | Mail driver            | `smtp`                           |
| `MAIL_HOST`        | SMTP server            | `smtp.yourdomain.com`            |
| `MAIL_PORT`        | SMTP port              | `587`                            |
| `MAIL_USERNAME`    | SMTP user              | `[email]`                        |
| `MAIL_PASSWORD`    | SMTP password          | `[password]`                     |
| `MAIL_FROM_ADDRESS`| Sender email           | `noreply@yourdomain.com`         |
| `SSO_URL`          | SSO Server API URL     | `https://sso.yourdomain.com/api` |
| `SSO_JWT_ISSUER`   | JWT issuer             | `https://sso.yourdomain.com`     |
| `SSO_CLIENT_ID`    | Your SSO client ID     | `[your_client_id]`               |
| `SSO_CLIENT_SECRET`| Your SSO client secret | `[your_client_secret]`           |
| `FRONTEND_URL`     | Frontend URL (CORS)    | `https://app.yourdomain.com`     |
| `QUEUE_CONNECTION` | Queue driver           | `sync`                           |
<!-- markdownlint-enable MD013 -->

> See [section 2](#2-sso-authentication) to obtain SSO credentials.
>
> **Queue:** OneSpend uses a queue for background sync tasks.
> In production, set `QUEUE_CONNECTION=sync` in your `.env`.
> This runs jobs immediately (no worker process needed).
> No extra setup required beyond this variable.

### 3. Upload Files

Upload the `back/` folder to your hosting. Typical path:

- `/home/[user]/onespend/back/`

### 4. Run Migrations & Cache

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan storage:link
```

> `--force` disables the interactive prompt.
> Required for automated / CI deployments.

---

## 4. Frontend Deployment

### 1. Configure Environment

Create `front/.env.production` from the example:

```bash
cp .env.production.example .env.production
```

<!-- markdownlint-disable MD013 -->
| Variable                | Description            | Example                          |
| ----------------------- | ---------------------- | -------------------------------- |
| `VITE_API_URL`          | Laravel backend URL    | `https://api.yourdomain.com`     |
| `VITE_SSO_URL`          | SSO Server API URL     | `https://sso.yourdomain.com/api` |
| `VITE_SSO_FRONTEND_URL` | SSO frontend URL       | `https://sso.yourdomain.com`     |
| `VITE_SSO_CLIENT_ID`    | Your SSO client ID     | `[your_client_id]`               |
<!-- markdownlint-enable MD013 -->

> See [section 2](#2-sso-authentication) to obtain SSO credentials.

### 2. Build for Production

```bash
cd front
pnpm install --frozen-lockfile
pnpm run build
```

### 3. Upload Frontend Files

Upload `front/dist/` to the hosting public directory:

- `/home/[user]/public_html/`

---

## 5. Apache Configuration

### .htaccess (SPA fallback)

Make sure `.htaccess` in `public_html/` contains:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

**Note:** In shared hosting, configure subdomains (`app.yourdomain.com`, `api.yourdomain.com`) through your hosting panel. The provider sets up the corresponding VirtualHost automatically.

---

## 6. SSL

Enable HTTPS through your hosting control panel
(most providers offer free Let's Encrypt certificates)
or configure your SSL certificate manually.

After enabling SSL, update `.env` files to use `https://`.

---

## 7. Cron

OneSpend uses Laravel's scheduler for scheduled tasks:

- Data cleanup: daily 3:00 AM
- Sync monitor: every 10 minutes

Add this line in your hosting cron panel:

<!-- markdownlint-disable MD013 -->
```bash
* * * * * cd /home/user/onespend/back && php artisan schedule:run >> /dev/null 2>&1
```
<!-- markdownlint-enable MD013 -->

> Without cron the app still works. You only lose
> auto-cleanup and sync monitoring. Async merges
> execute synchronously via `QUEUE_CONNECTION=sync`.

---

## 8. Deployment Checklist

- [ ] Backend files uploaded to hosting
- [ ] Frontend built and uploaded to public directory
- [ ] Database created and migrations executed
- [ ] Environment variables configured for production
- [ ] SSO server set up and credentials obtained
- [ ] SSO URLs updated to production
- [ ] SSL/HTTPS enabled
- [ ] Cron configured for `schedule:run`
- [ ] `QUEUE_CONNECTION=sync` configured
- [ ] Rewrite rules working (SPA + API)
- [ ] Authentication flow tested
- [ ] Application logs verified

---

## 9. GitLab CI/CD

See `.gitlab-ci.yml` in the project root.
Pipeline triggers automatically on tags matching
`vX.Y.Z`, `vX.Y.Z-alpha.N`, `vX.Y.Z-beta.N`, `vX.Y.Z-rc.N`, or `vX.Y.Z-dryrun.N`.

### Required CI/CD Variables

<!-- markdownlint-disable MD013 -->
| Variable              | Description              | Example                        |
| --------------------- | ------------------------ | ------------------------------ |
| `SSH_PRIVATE_KEY`     | Server SSH private key   | `[ssh_private_key]`            |
| `SSH_HOST`            | Server host              | `yourdomain.com`               |
| `SSH_PORT`            | SSH port                 | `[ssh_port]`                   |
| `SSH_USER`            | SSH user                 | `your-user`                    |
| `DEPLOY_PATH_BACKEND` | Backend path on server   | `/home/user/onespend/back`     |
| `DEPLOY_PATH_FRONTEND`| Frontend path on server  | `/home/user/public_html`       |
| `VITE_API_URL`        | API URL (frontend build) | `https://api.yourdomain.com`   |
<!-- markdownlint-enable MD013 -->

### Trigger

```bash
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

### Validation deploys (dryrun)

Use `dryrun` tags to validate CI/CD changes end to end (lint, test, build, deploy)
without publishing a release.

```bash
git tag -a v0.0.0-dryrun.1 -m "dryrun: validate CI changes against server"
git push origin v0.0.0-dryrun.1
```

Watch the pipeline in GitLab (CI/CD > Pipelines). When it finishes successfully,
remove the tag:

```bash
git tag -d v0.0.0-dryrun.1
git push origin :refs/tags/v0.0.0-dryrun.1
```

All other tags are ignored by the pipeline.

---

## 10. Domain Summary

| Service                 | Development (default)     | Production                  |
| ----------------------- | ------------------------- | --------------------------- |
| Frontend                | `http://localhost:8102`   | `https://app.yourdomain.com` |
| Backend API             | `http://localhost:8000`   | `https://api.yourdomain.com` |
| SSO Server (API)        | `http://localhost:8001`   | `https://sso.yourdomain.com` |
| SSO Frontend (UI login) | `http://localhost:8101`   | `https://sso.yourdomain.com` |

> In development the SSO runs as two separate processes: a Laravel API on
> `8001` and a Vue/Vite frontend on `8101`. In production a reverse proxy
> typically serves both under the same domain, so `VITE_SSO_URL` ends with
> `/api` (the API) while `VITE_SSO_FRONTEND_URL` points to the bare domain
> (the login UI). Confusing the two produces a `404` on `/auth/login`.

---

## 11. Setup Script (`setup.sh`)

The repo ships `setup.sh`, a deploy/bootstrap helper that walks through
backend + frontend configuration step by step. It is optional — every step it
performs can also be done manually as described in sections 3 and 4 — but it
removes a lot of friction on a fresh machine or after a DB reset.

### Usage

```bash
./setup.sh [OPTIONS]
```

<!-- markdownlint-disable MD013 -->
| Option               | Effect                                                                |
| -------------------- | --------------------------------------------------------------------- |
| `--dev`              | Use `.env.development.example` (default: `.env.production.example`)   |
| `--non-interactive`  | Do not prompt; read `ONESPEND_*` env vars instead                      |
| `--no-backup`        | Skip `.env` backups                                                   |
| `--skip-front-build` | Skip the frontend `pnpm run build` step                               |
| `--advanced`         | Re-prompt all frontend vars (see "Frontend vars: default vs advanced")|
| `--help`             | Show help and exit                                                    |
<!-- markdownlint-enable MD013 -->

### What the script does

1. Verify prerequisites (PHP, Composer, Node, pnpm, MariaDB client)
2. `composer install` in `back/`
3. Configure `back/.env` (DB, mail, SSO, `APP_URL`, `FRONTEND_URL`)
4. Generate `APP_KEY` (injects the line if missing)
5. Configure SSO credentials (`SSO_URL`, `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET`)
6. Run migrations (with optional DB reset + re-seed via `migrate:fresh --seed`)
7. Configure `front/.env.development` or `front/.env.production`
8. Build the frontend (`pnpm run build`), unless `--skip-front-build` or shared hosting
9. Healthcheck (DB connection, writable storage, APP_KEY set, routes cached, etc.)

### Frontend vars: default vs `--advanced`

Three frontend vars hold **the same value** as a backend var, just with the
`VITE_` prefix that Vite requires to expose them to the browser:

<!-- markdownlint-disable MD013 -->
| Frontend var           | Copied from backend     | Same value as                |
| --------------------- | ----------------------- | ---------------------------- |
| `VITE_API_URL`        | `back/.env:APP_URL`     | `http://localhost:8002`      |
| `VITE_SSO_URL`        | `back/.env:SSO_URL`     | `http://localhost:8001/api` |
| `VITE_SSO_CLIENT_ID`  | `back/.env:SSO_CLIENT_ID` | `onespend-app`             |
<!-- markdownlint-enable MD013 -->

By default the script copies these three silently from `back/.env` and only
prompts for `VITE_SSO_FRONTEND_URL`, which is **frontend-only** (the backend
never calls the SSO login UI, so there is no `SSO_FRONTEND_URL` counterpart
to copy from).

```text
[..]  Copying shared vars from back/.env:
[..]    VITE_API_URL       = http://localhost:8002
[..]    VITE_SSO_URL       = http://localhost:8001/api
[..]    VITE_SSO_CLIENT_ID = onespend-app
VITE_SSO_FRONTEND_URL (SSO UI login, e.g. http://localhost:8101) [http://localhost:8101]:
```

Use `--advanced` if backend and frontend legitimately need different values
(e.g. the backend runs on `https://api.prod.com` but the Vite client should
point to a CDN or a different proxy):

```bash
./setup.sh --dev --advanced
```

In `--advanced` mode the script re-prompts all four frontend vars, each with
the value from `back/.env` as the default.

### `VITE_SSO_FRONTEND_URL` scheme validation

The script rejects an empty `VITE_SSO_FRONTEND_URL` and auto-prepends
`http://` if the entered value lacks a scheme. This guards against the
`Uncaught (in promise) TypeError: URL constructor: /auth/login is not a valid
URL` runtime crash, which happens when `new URL(path, base)` in the SSO client
gets a base without `http://`/`https://` and produces a path-only URL.

### Non-interactive mode

`--non-interactive` skips all prompts and requires these env vars instead:

<!-- markdownlint-disable MD013 -->
| Variable                       | Maps to                     |
| ------------------------------ | --------------------------- |
| `ONESPEND_DB_HOST`             | `DB_HOST`                   |
| `ONESPEND_DB_PORT`             | `DB_PORT`                   |
| `ONESPEND_DB_DATABASE`         | `DB_DATABASE`               |
| `ONESPEND_DB_USERNAME`         | `DB_USERNAME`               |
| `ONESPEND_DB_PASSWORD`          | `DB_PASSWORD`               |
| `ONESPEND_APP_URL`             | `APP_URL`                   |
| `ONESPEND_FRONTEND_URL`        | `FRONTEND_URL`              |
| `ONESPEND_SSO_URL`             | `SSO_URL`                   |
| `ONESPEND_SSO_CLIENT_ID`       | `SSO_CLIENT_ID`             |
| `ONESPEND_SSO_CLIENT_SECRET`   | `SSO_CLIENT_SECRET`         |
| `ONESPEND_VITE_SSO_FRONTEND_URL` | `VITE_SSO_FRONTEND_URL`   |
<!-- markdownlint-enable MD013 -->

Example:

```bash
ONESPEND_DB_HOST=127.0.0.1 \
ONESPEND_DB_PORT=3306 \
ONESPEND_DB_DATABASE=onespend \
ONESPEND_DB_USERNAME=root \
ONESPEND_DB_PASSWORD=toor \
ONESPEND_APP_URL=http://localhost:8002 \
ONESPEND_FRONTEND_URL=http://localhost:8102 \
ONESPEND_SSO_URL=http://localhost:8001/api \
ONESPEND_SSO_CLIENT_ID=onespend-app \
ONESPEND_SSO_CLIENT_SECRET=KzpL2Hg0UGd3bj8XSW9dBvetspMpjT8tqz34qsfS \
ONESPEND_VITE_SSO_FRONTEND_URL=http://localhost:8101 \
./setup.sh --dev --non-interactive --skip-front-build
```

