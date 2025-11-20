# Agent Notes

## What This Repo Is

- **Workflow Automation MVP (WAM)** monorepo: Next.js 14 App Router frontend + NestJS backend + shared types (pnpm + Turborepo).
- Primary purpose: build and execute node-based workflows (React Flow editor), expose public API for workflow execution (used by BCG) with auth via Clerk/API key; store state in Postgres via Prisma.

## Frontend (apps/frontend)

- Stack: Next.js 14 App Router, Tailwind/ShadCN, Zustand, React Flow, Axios, Clerk.
- Key routes: `src/app/page.tsx` (landing); `/workflows` (list/editor), `/executions` (status), `/api-keys`, auth pages `sign-in`/`sign-up` (Clerk components).
- Auth middleware: `src/middleware.ts` uses Clerk `authMiddleware`; currently public routes include `/` + auth; everything else protected unless marked otherwise. Adjust here if public API docs or other pages need exposure.
- API client (typical): Axios hitting backend at `NEXT_PUBLIC_API_URL` (default http://localhost:3001/api/v1). WebSocket URL `NEXT_PUBLIC_WS_URL` for live updates.
- State: Zustand stores under `src/stores`; hooks under `src/hooks`; shared UI in `src/components`.
- Styling: global CSS `src/app/globals.css`; shadcn UI components in `src/components/ui`.

## Backend (apps/backend)

- Stack: NestJS, PostgreSQL, Prisma, class-validator, Swagger. Entry: `src/main.ts`.
- Modules (src/):
  - `public-api`: routes under `/api/v1/public` for agent execution/status/results/approval; guarded by `ClerkAuthGuard` (valid Clerk token **or** API key). Token-bucket rate limiter per API key; keys are SHA-256 hashed; webhook sender with HMAC signing + retries; approval payload transformer for frontend fit.
  - `executions`: execution tracking, websocket events, persistence; `WorkflowEngine` handles retries, manual-approval pause/resume, and emits events.
  - `workflows`: CRUD and workflow runner wiring.
  - `nodes`: executor factory for node types (trigger, HTTP, data transform, conditional, delay, email, Google Calendar, WhatsApp, manual approval, BFSI CSV upload/AI content/compliance checker/report).
  - `bfsi`: CSV upload + parsing/preview/delete, PII anonymization, AI content generation, compliance checking (includes RAG + XAI), audit trail, compliance stats/report endpoints.
  - `auth`: `ClerkAuthGuard` verifies Bearer token via Clerk; fallback to API key match (`PUBLIC_API_KEY`).
  - `api-keys`: management of API keys (for Authorized bearer) with usage counters, expiry, webhook config.
  - `integrations`: catalog + encrypted credentials storage (requires `ENCRYPTION_KEY`); default SendGrid/Google Calendar/Twilio integrations seeded.
  - `websocket`: Socket.IO gateway (execution/node updates, room-based execution subscriptions).
  - `compliance-rag`: Gemini/OpenAI content/risk services; needs `GEMINI_API_KEY` or `OPENAI_API_KEY`.
  - `health`: `/health` DB connectivity probe.
  - `users`: sync/find-or-create users when Clerk token/API key present.
- Prisma: schema in `apps/backend/prisma/schema.prisma`; requires Postgres reachable via `DATABASE_URL`.
  - Models include Users, Workflows, WorkflowExecutions (+manual approval fields), NodeExecutions, NodeDefinitions, Integrations, Credentials (encrypted), WorkflowTemplates, FileUploads, ComplianceChecks, ApiKeys (usage limit, webhook config).
- Docs: Swagger at `/api/docs` when running.

## Auth & API Expectations

- **Public execution endpoints** (used by BCG): `/api/v1/public/agents/:id/execute`, `/public/executions/:id/status|results|pending-approval|approve|reject`.
- Backend guard accepts:
  1. Bearer Clerk JWT (from `Authorization: Bearer <token>`), or
  2. API key matching `PUBLIC_API_KEY` (from `Authorization: Bearer <API_KEY>` or `x-api-key`).
- If `PUBLIC_API_KEY` is unset or mismatched, calls will be rejected with 401. Ensure WAM backend `.env` sets `PUBLIC_API_KEY` to the value clients send (e.g., BCG’s `NEXT_PUBLIC_API_KEY`).
- Frontend middleware protects app routes; adjust `publicRoutes/ignoredRoutes` in `apps/frontend/src/middleware.ts` if needed.

## Environment Variables (common)

- Backend (`apps/backend/.env`):
  - `DATABASE_URL` (Postgres), `PORT` (default 3001), `NODE_ENV`, `CORS_ORIGIN` (e.g., http://localhost:3000).
  - Auth: `CLERK_SECRET_KEY`, `PUBLIC_API_KEY` (for API-key auth to public endpoints).
  - AI: `GEMINI_API_KEY`, `OPENAI_API_KEY` (as applicable).
  - Security: `ENCRYPTION_KEY` (for integration credential encryption).
- Frontend (`apps/frontend/.env.local`):
  - `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`
  - `NEXT_PUBLIC_WS_URL=http://localhost:3001`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (if using Clerk UI auth)
  - `NEXT_PUBLIC_API_KEY` (used by clients like BCG; should match backend `PUBLIC_API_KEY`).

## Dev Scripts

- Root: `npm run dev` (turbo; runs frontend + backend), `npm run build`, `npm run lint`, `npm run test`.
- Backend (apps/backend): `pnpm dev` (Nest watch), `pnpm build`, `pnpm prisma:migrate`, `pnpm prisma:studio`.
- Frontend (apps/frontend): `pnpm dev` (Next), `pnpm build`, `pnpm start`.

## Recent Changes / Gotchas

- Public API calls now rely on API key or Clerk token; ensure `PUBLIC_API_KEY` is set to the client key to avoid 401/“invalid API key.”
- Frontend middleware currently protects API routes unless explicitly public/ignored; if external clients hit `/api/v1/public/**` via frontend, ensure middleware doesn’t block them.
- BFF in BCG is unused for these calls; callers hit WAM directly.
- Sandbox dev ports can conflict (EPERM on 3000/3002); run locally if needed.

## Quick Start Checklist

1. Set backend `.env` with `DATABASE_URL`, `PUBLIC_API_KEY`, `CLERK_SECRET_KEY` (if using Clerk), CORS origins, AI keys.
2. Set frontend `.env.local` with API/WS URLs and matching `NEXT_PUBLIC_API_KEY` + Clerk publishable key.
3. Run `npm run dev` from repo root (or start backend/ frontend separately). Verify backend at `http://localhost:3001/api/docs`, frontend at `http://localhost:3000`.
4. For external clients (e.g., BCG), send `Authorization: Bearer <API_KEY>` matching `PUBLIC_API_KEY` or a valid Clerk token.

## Key Files to Remember

- Frontend: `apps/frontend/src/app` (routes), `src/middleware.ts` (Clerk), `src/stores`, `src/components`, `src/lib` (API clients), `globals.css`.
- Backend: `apps/backend/src/auth/clerk-auth.guard.ts`, `apps/backend/src/public-api/*` (API key guard + rate limiter + webhooks + approval data mapper), `executions/workflow-engine.service.ts` (orchestration), modules under `workflows/`, `nodes/`, `websocket/`, `bfsi/`, `integrations/`.
- Shared types: `packages/shared-types/src/index.ts` used across frontend/backend (node enums/configs, execution/websocket message types).
