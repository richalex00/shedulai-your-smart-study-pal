# Backend (MVP)

Minimal Node.js + TypeScript + Prisma backend for planner persistence.

## Quick start

1. Copy env template:

```sh
cp .env.example .env
```

2. Install dependencies:

```sh
npm install
```

3. Generate Prisma client:

```sh
npm run prisma:generate
```

4. Run migrations:

```sh
npm run prisma:migrate
```

5. Seed local dev data:

```sh
npm run prisma:seed
```

Or do both migrate + seed:

```sh
npm run db:setup
```

6. Start dev server:

```sh
npm run dev
```

The planner context endpoint is available at `GET /api/planner/context`.
The planner AI endpoint is available at `POST /api/ai/planner`.

## OpenAI configuration (planner AI)

Add these to `.env` to enable real planner AI responses:

```sh
OPENAI_API_KEY="your_key_here"
OPENAI_MODEL="gpt-4.1-mini"
```

If the key is missing or OpenAI fails, the planner endpoint gracefully falls back to deterministic server-side logic.

## Local testing

If `DEV_USER_ID` is set in `.env`, you can call the endpoint directly:

```sh
curl http://localhost:3000/api/planner/context
```

Or pass a user ID explicitly:

```sh
curl "http://localhost:3000/api/planner/context?userId=11111111-1111-1111-1111-111111111111"
```

Planner AI test (current frontend contract):

```sh
curl -X POST "http://localhost:3000/api/ai/planner" \
	-H "Content-Type: application/json" \
	-d "{\"mode\":\"planner\",\"message\":\"What should I focus on today?\"}"
```
