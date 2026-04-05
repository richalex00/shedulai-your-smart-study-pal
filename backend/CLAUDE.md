# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start with hot reload (tsx watch)
npm run build            # Compile TypeScript → dist/
npm run start            # prisma db push + run dist/server.js (used by Railway)
npm run prisma:push      # Sync schema to DB without creating migration files
npm run prisma:migrate   # Create and apply a named migration (dev only)
npm run prisma:seed      # Run prisma/seed.ts
npm run prisma:studio    # Open Prisma Studio at localhost:5555
```

## Architecture

### Request lifecycle
1. `server.ts` — registers routes, CORS, global error handler
2. Routes (`src/routes/`) — validate input, resolve user, call services
3. Services (`src/services/`) — business logic, external API calls, AI clients
4. Repositories (`src/repositories/plannerRepository.ts`) — Prisma queries
5. `src/lib/prisma.ts` — singleton Prisma client

### User identity
All authenticated routes expect an `x-user-id` header (UUID). Resolved by `src/lib/resolveUserId.ts`:
- Checks `x-user-id` header → `?userId` query param → `DEV_USER_ID` env var (local dev fallback)
- No JWT/session auth yet — this is the entire auth layer

### Prisma conventions
- Schema: `backend/prisma/schema.prisma` — PostgreSQL, all models use `@default(uuid())` IDs
- All DB columns use `snake_case` via `@map()`; Prisma model fields use `camelCase`
- Canvas-sourced entities have `source: EntitySource` and `externalId` for upsert deduplication
- Upsert pattern for Canvas data: `upsert({ where: { courseId_externalId } })`
- Run `npm run prisma:push` after schema changes in development; Railway runs this on deploy via `npm run start`

### Canvas sync flow
- `canvasSyncService.ts` — calls Canvas REST API, upserts courses + assignments
- `canvasMaterialsService.ts` — fetches files (extracts text from PDF/DOCX), pages, module items, and announcements into `CourseMaterial` records
- Credentials (`canvasBaseUrl`, `canvasToken`) are stored in the `Preferences` row and retrieved at sync time
- Canvas API base URL pattern: `${canvasBaseUrl}/api/v1/...`

### AI clients
- `claudePlannerClient.ts` — general planning assistant, receives full planner JSON context
- `claudeSubjectClient.ts` — course-specific tutor, reads `CourseMaterial` rows from DB, 100k char budget
- Both gracefully return `null`/fallback string when `ANTHROPIC_API_KEY` is missing
- Default model: `claude-sonnet-4-6` — override with `ANTHROPIC_MODEL` env var

### Environment variables
```
DATABASE_URL=            # PostgreSQL connection string (required)
PORT=3000
ANTHROPIC_API_KEY=       # Required for AI endpoints
ANTHROPIC_MODEL=         # Optional, defaults to claude-sonnet-4-6
CORS_ORIGIN=             # Comma-separated allowed origins
DEV_USER_ID=             # Fixed UUID for local dev (skips x-user-id header requirement)
```

### Deployment
- Platform: Railway
- Build: `npm run build` (tsc)
- Start: `npm run start` (runs `prisma db push` then `node dist/server.js`)
- Config: `nixpacks.toml` controls the Railway build pipeline
- `DATABASE_URL` must be set on the Railway backend service (not interpolated from another service)
