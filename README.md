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

## Environment

Create a `.env.local` file with the required environment values, including:

- `DATABASE_URL`
- `APP_URL`
- `SESSION_SECRET`
- `JWT_SECRET`

See `src/lib/env.ts` for the exact environment contract used by the app.

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
