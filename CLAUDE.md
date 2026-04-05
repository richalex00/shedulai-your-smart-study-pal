# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (root)
```bash
npm run dev          # Dev server on :8080, proxies /api → localhost:3000
npm run build        # Production build (output: dist/)
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest (watch mode)
```

### Backend (cd backend/)
```bash
npm run dev                  # tsx watch — hot reload
npm run build                # tsc → dist/
npm run start                # prisma db push + node dist/server.js
npm run prisma:migrate       # Run migrations (dev only)
npm run prisma:push          # Push schema without migration (used on Railway)
npm run prisma:seed          # Seed default data
npm run prisma:studio        # Prisma Studio GUI
```

### Running locally
1. Start backend: `cd backend && npm run dev` (needs `backend/.env` with `DATABASE_URL`)
2. Start frontend: `npm run dev` (vite proxy handles `/api` → `:3000`)
3. For local dev without auth, set `DEV_USER_ID` in `backend/.env` to a fixed UUID.

## Architecture

### Overview
- **Frontend**: React 18 + Vite + TypeScript, deployed to GitHub Pages (`main` branch → auto-deploy via `.github/workflows/deploy-pages.yml`)
- **Backend**: Express + TypeScript, deployed to Railway, compiled to `dist/` via `tsc`
- **Database**: PostgreSQL (Railway) accessed via Prisma ORM
- **AI**: Anthropic Claude (`claude-sonnet-4-6` by default, overrideable via `ANTHROPIC_MODEL` env var)

### Frontend data flow
All app state lives in `src/contexts/AppContext.tsx` (single context, no Redux/Zustand).

On load:
1. Reads `currentUserId` from localStorage
2. Fetches `GET /api/planner/context` (courses, assignments, timeBlocks, preferences)
3. Triggers background Canvas sync (`POST /api/canvas/sync`) using stored credentials
4. Falls back to localStorage-scoped copies if backend is unreachable

State is also mirrored to localStorage in parallel (keyed as `{key}:{userId}`). GroupProjects and ChatMessages are **localStorage-only** — not persisted to the DB.

### Backend route map
```
POST   /api/users/identify          → upsert user + create preferences row
PATCH  /api/users/onboarding        → set preferences.onboardingComplete
GET    /api/planner/context         → courses + assignments + timeBlocks + preferences
POST   /api/canvas/sync             → save credentials + run full Canvas sync
POST   /api/canvas/sync-materials/:courseId → sync files/pages/announcements for one course
PATCH  /api/canvas/favorites/:courseId → toggle isFavorite in DB + Canvas API
POST   /api/ai/planner              → Claude planner chat (uses full planner context)
POST   /api/ai/subject              → Claude subject chat (uses CourseMaterial records)
GET    /api/ai/diagnose             → Anthropic API key health check
PATCH  /api/assignments/:id         → update assignment (supports completed toggle)
```

User identity is carried via `x-user-id` header (set by frontend after identify). In local dev, `DEV_USER_ID` env var is used as fallback by `src/lib/resolveUserId.ts`.

### Canvas integration
- Credentials (`canvasBaseUrl`, `canvasToken`) stored in the `Preferences` DB row
- `canvasSyncService.ts` — syncs courses and assignments from Canvas API
- `canvasMaterialsService.ts` — syncs files (PDF/DOCX text-extracted), pages, and announcements into `CourseMaterial` records
- Canvas-sourced entities use `source: "canvas"` and store `externalId` for upsert deduplication
- The subject chat (`claudeSubjectClient.ts`) reads `CourseMaterial` records and passes them as context to Claude (100k char budget, prioritised: announcements → pages → files)

### AI services
- `claudePlannerClient.ts` — general planner AI, receives full planner JSON as context, max 512 tokens
- `claudeSubjectClient.ts` — course-specific AI, receives course materials + assignments, max 768 tokens
- Both return `null`/fallback string if `ANTHROPIC_API_KEY` is unset
- Model defaults to `claude-sonnet-4-6`, overridden by `ANTHROPIC_MODEL` env var

### Environment variables
**Backend (`backend/.env`):**
```
DATABASE_URL=            # PostgreSQL connection string (required)
PORT=3000
ANTHROPIC_API_KEY=       # Required for AI features
ANTHROPIC_MODEL=         # Optional, defaults to claude-sonnet-4-6
CORS_ORIGIN=             # Comma-separated allowed origins (e.g. https://yourapp.github.io)
DEV_USER_ID=             # Fixed UUID for local dev without auth
```

**Frontend (GitHub repo variable `VITE_AI_API_BASE_URL`):**
```
VITE_AI_API_BASE_URL=    # Full URL of Railway backend (e.g. https://your-app.railway.app)
```

### Known gaps (as of April 2026)
- No create/update/delete routes for courses or time blocks (only read + seed)
- `addAssignment` in AppContext is localStorage-only — no backend route called
- Subjects page emoji/color lookups use hardcoded IDs (`'1'`, `'2'`, etc.) but real IDs are UUIDs — mismatches
- GroupProjects are not in the DB schema — localStorage only
- Dashboard AI suggestion card is hardcoded HTML, not dynamic
- "Add Assignment" and "Add Activity" quick-action buttons have no-op handlers
