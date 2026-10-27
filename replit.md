# Cedar Registry

A MERN student management system for maintaining student records and viewing enrollment health.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/student-management run dev` — run the student management web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required secret: `MONGODB_URI` — MongoDB Atlas connection string used by the API

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Data: MongoDB + Mongoose
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/student-management/src` — React/Vite student management app
- `artifacts/api-server/src/routes/students.ts` — student CRUD and dashboard API
- `artifacts/api-server/src/models/student.ts` — MongoDB student and ID counter models
- `lib/api-spec/openapi.yaml` — API contract and generated client source

## Architecture decisions

- MongoDB is the source of truth for student records, matching the requested MERN stack.
- Student IDs are generated server-side; email addresses are unique.
- Student record endpoints return a clear 503 when MongoDB is unreachable.

## Product

Staff can review student counts and program distribution, search and filter the student directory, and create, edit, view, or delete student records.

## User preferences

The user requested a MERN-based student management system.

## Gotchas

MongoDB Atlas must be active and allow connections from the Replit runtime; otherwise student endpoints return 503.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
