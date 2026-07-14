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
Pipeline triggers automatically on semantic tags
`vX.Y.Z`.

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

---

## 10. Domain Summary

| Service     | Development (default)     | Production                  |
| ----------- | ------------------------- | --------------------------- |
| Frontend    | `http://localhost:8102`   | `https://app.yourdomain.com` |
| Backend API | `http://localhost:8000`   | `https://api.yourdomain.com` |
| SSO Server  | `http://localhost:8001`   | `https://sso.yourdomain.com` |
