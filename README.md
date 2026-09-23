# Premium Boilerplate Menu

A production-oriented Next.js 16 app for a digital café/restaurant menu with admin operations, role-based access, QR table access, reservation flow, and reporting.

## Overview

This project provides:

- Public menu browsing and QR-table ordering experience
- Admin panel with menu, categories, tables, reservations, users, reports, and settings
- MongoDB Native Driver data layer with schema-style docs in the server layer
- Route-level RBAC checks alongside proxy-based protection
- Real-time order and waiter-call updates through SSE endpoints
- Local media storage and seed tooling for a self-contained MVP

## Architecture

- App Router: Next.js 16
- Data layer: MongoDB Native Driver (`src/server/db.ts`)
- Services: `src/lib/*-service.ts`
- Public routes: `src/app/(public)`
- Admin routes: `src/app/admin`
- Shared domain contracts: `src/types/index.ts`
- Authentication: `src/lib/auth.ts`, `src/lib/auth-edge.ts`
- Proxy/RBAC enforcement: `src/proxy.ts`

## Data and Runtime Notes

- `prisma/schema.prisma` is treated as documentation-only for the current data contract.
- Runtime canonical document shapes live in `src/server/db.ts` and are normalized through `migrateLegacyFields()`.
- Order creation now uses a transactional flow when supported by the MongoDB deployment and falls back to a safe non-transactional path otherwise.
- `inStock` is the canonical menu availability field; legacy stock-related fields are normalized during startup.

## Important Commands

```bash
npm install
npm run db:seed
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Demo data for portfolio deployment

The seed script creates a realistic café catalog for a portfolio/demo instance:

- ۵ دسته‌بندی: قهوه گرم، نوشیدنی سرد، شیرینی و دسر، صبحانه، امضای کافه
- ۱۴ آیتم منو با توضیحات فارسی، ترکیبات، قیمت ریالی، زمان آماده‌سازی و برچسب‌ها
- تصاویر واقعی از Unsplash برای نمایش حرفه‌ای کارت‌ها و جزئیات محصول
- ۶ میز نمونه با QR token مستقل برای نمایش مسیر `/t/[token]`
- حساب مدیر اولیه و سفارش‌های نمونه برای نمایش پنل ادمین

Run it against the target database after setting `DATABASE_URL`:

```bash
npm run db:seed
```

The seed is safe to rerun. Existing demo menu items are updated by slug so their descriptions, prices and image URLs stay current.

## Environment

Create a `.env.local` file with the required environment values, including:

- `DATABASE_URL`
- `APP_URL`
- `SESSION_SECRET`
- `JWT_SECRET`

See `src/lib/env.ts` for the exact environment contract used by the app.

## Deploy to Liara

These steps follow Liara's current NextJS documentation:

- [NextJS quick start](https://docs.liara.ir/paas/nextjs/quick-start/)
- [Create a NextJS app](https://docs.liara.ir/paas/nextjs/how-tos/create-app/)
- [Deploy a NextJS app](https://docs.liara.ir/paas/nextjs/how-tos/deploy-app/)
- [Set environment variables](https://docs.liara.ir/paas/nextjs/how-tos/set-envs/)
- [Connect NextJS to MongoDB](https://docs.liara.ir/paas/nextjs/how-tos/connect-to-db/mongodb/)

### 1. Prepare the repository

From the project root:

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

Do not upload `node_modules`, `.next`, local `.env` files, or local uploads. Liara installs dependencies and runs the build during deployment. The repository must include `package.json`, and the `start` script must remain:

```json
"start": "next start"
```

### 2. Create the Liara application

1. Open [Liara Console](https://console.liara.ir/) and choose your personal account or team.
2. Open **Platform** and choose **Create application**.
3. Select **NextJS**, choose a unique application ID, and create the app.
4. Your default address will be `https://APP_ID.liara.run`.

### 3. Create MongoDB on Liara

Create a MongoDB database from Liara's database products, copy its connection string, and use it as `DATABASE_URL`. The runtime uses the official MongoDB driver and keeps a singleton connection pool in `src/server/db.ts`.

### 4. Configure production environment variables

Set these in the application's environment-variable settings before deploying:

```env
NODE_ENV=production
DATABASE_URL=mongodb://USER:PASSWORD@HOST:PORT/premium-boilerplate-menu?authSource=admin
APP_URL=https://APP_ID.liara.run
JWT_SECRET=replace-with-a-long-random-secret-at-least-16-characters
NEXT_PUBLIC_API_BASE_URL=/api
ADMIN_INITIAL_EMAIL=admin@example.com
ADMIN_INITIAL_PASSWORD=replace-with-a-strong-password
```

`APP_URL` must be the real Liara URL or your connected custom domain because it is used for metadata and QR URLs. Never commit these values to Git.

### 5. Deploy from Liara Console

1. Remove local build artifacts and create a zip of the repository contents.
2. In the Liara application, choose **New deployment** and upload the zip in the Drag & Drop tab.
3. Confirm the NextJS build settings and deploy.
4. Liara runs `npm install`, `npm run build`, and then `npm start` according to the project scripts.
5. Open the deployment logs and wait for the application to become ready.

### 6. Seed the remote database

Run the seed once with the remote MongoDB URI. The safest workflow is to run it locally from the repository while pointing `DATABASE_URL` at Liara's MongoDB:

```bash
# PowerShell example
$env:DATABASE_URL="mongodb://USER:PASSWORD@HOST:PORT/premium-boilerplate-menu?authSource=admin"
$env:ADMIN_INITIAL_EMAIL="admin@example.com"
$env:ADMIN_INITIAL_PASSWORD="use-a-strong-password"
npm run db:seed
```

Then visit:

- Public site: `https://APP_ID.liara.run`
- Admin login: `https://APP_ID.liara.run/admin/login`
- Menu: `https://APP_ID.liara.run/list`
- Reservation: `https://APP_ID.liara.run/reservation`
- QR table management: `https://APP_ID.liara.run/admin/tables`

### 7. Production smoke test

After deployment, verify `/api/health`, public menu images, admin login, one QR table URL, reservation submission, and the order/waiter-call streams. If environment variables are changed after deployment, restart/redeploy the app so the new values are loaded.

### 8. Optional custom domain

Use Liara's domain settings to add your custom domain and enable SSL. Then update `APP_URL` to the HTTPS custom domain and redeploy. Generate printable QR codes only after this change so they contain the final public origin.

## Rendering and Pagination Strategy

Use explicit rendering strategy per page:

- Server-rendered pages for public metadata-driven pages and menu detail views when data is required at request time.
- Client-side state only for interactive admin dashboards and forms that need immediate local UX updates.
- Server-side list endpoints for admin pages that should remain filtered, sortable, and accessible without ad-hoc client caching.
- SSE endpoints only for small, frequently updated operational datasets such as orders and waiter calls.

## Production Readiness Checklist

- RBAC enforced on admin routes and admin API endpoints
- Canonical data migration for legacy document drift
- Public order flow validated against table tokens and active menu availability
- Reservation slots configured via settings rather than hardcoded assumptions
- Real-time streams available for operational monitoring
- Typecheck, lint, and production build validated as part of release readiness

## Notes

The current MVP intentionally omits checkout/payment integration and card-based cart persistence. The application is structured so those features can be added on top of the existing service and data layers without rewriting the core contracts.
