# Data Analysis App backend + client

This project ships a NestJS-style Express API with a React client. The API uses Drizzle ORM to talk to a PostgreSQL database and exposes REST endpoints that the client calls, keeping the server as the secure middle layer between the UI and stored data.

## Database setup
1. Provision a Postgres database (Neon, Supabase, RDS, or local `postgres`).
2. Copy `.env.example` to `.env` and fill `DATABASE_URL` and a `SESSION_SECRET`.
3. Install dependencies from `packager_files/package.json` and run migrations:

```bash
cd packager_files
npm install
npm run db:migrate
```

The migration creates tables for users, warehouses, inventory items + history, custom tables/rows, captured images, and audit logs.

## Development workflow
- Start the API and client together in dev from `packager_files`: `npm run dev`. The client talks to the API via REST calls (see `server/routes.ts`).
- Deploy/build for production from `packager_files`: `npm run build` then `npm start`.
- Run type checks from `packager_files`: `npm run check`.

The API enforces authentication and role-based access before hitting the database, and the React client uses `fetch` with credentials to call the REST endpoints, keeping all data access behind the server boundary.
