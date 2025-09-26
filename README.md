# Medical Reminder Backend (Express + TypeScript)

API backend implementing the provided Supabase schema (context) for a medical prescription and reminder system.

## Setup

1. Copy environment file:
```bash
cp .env.example .env
```
2. Set `DATABASE_URL` to your Postgres (Supabase) connection string.

3. Install deps:
```bash
npm install
```

4. Dev server:
```bash
npm run dev
```

5. Build and run:
```bash
npm run build && npm start
```

6. Reminder worker (optional):
```bash
tsx src/worker/reminder-worker.ts
```

## API Overview

- `GET /health`
- `GET /api/drugs` CRUD
- `GET /api/allergies` CRUD
- `GET /api/specializations` CRUD
- `GET /api/profiles` CRUD
- `GET /api/patients` CRUD, plus `/api/patients/:id/allergies`
- `GET /api/doctors` CRUD
- `GET /api/medical-history` CRUD
- `GET /api/prescriptions` with nested drug items; `POST /api/prescriptions` creates records, items, and schedules
- `GET /api/reminders/schedule`; `POST /api/reminders/schedule/:id/confirm`; `POST /api/reminders/attempts`

Notes:
- This project doesn't manage auth sessions. It assumes IDs exist in `public.profiles` and referenced tables.
- The schema provided is not applied here; ensure your database matches it.
