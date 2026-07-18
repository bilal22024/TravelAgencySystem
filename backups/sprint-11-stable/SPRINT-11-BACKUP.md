## Sprint 11 Stable Backup

- Backup date: July 19, 2026
- Project: Travel Agency ERP System
- Current branch at backup time: `main`
- Stable backup artifact: `backups/sprint-11-stable/Sprint11-Stable.backup`
- Additional local SQL dump: `backups/sprint-11-stable/travel-agency-sprint-11-stable-2026-07-19.sql`
- Source ZIP: intentionally skipped by user request; replaced with the simple `.backup` file format used for stable archive handling

## Stack

- Frontend: React, TypeScript, Vite, TailwindCSS, TanStack Query, Zustand
- Backend: Node.js, Express, TypeScript, Prisma, Vitest
- Database: PostgreSQL 17
- Prisma schema: `prisma/schema.prisma`

## Sprint 11 Scope Completed

- Parent and branch agency hierarchy
- Parent-only, branch-only, and consolidated parent reporting
- Payment ownership correction
- Advance balance ownership correction
- Agency Report navigation and hierarchy improvements
- Hierarchical agency selector
- Professional UI, responsive layout, and dropdown layering improvements
- Sidebar and application-wide visual cleanup

## Validation Summary

- Frontend `check`: passed
- Frontend `lint`: passed with warnings only
- Frontend `test`: passed
- Frontend `build`: passed
- Backend `check`: passed
- Backend `lint`: passed
- Backend `test`: passed
- Backend `build`: TypeScript build passed when run directly; workspace build script can fail on Windows if Prisma `generate` hits a file lock on `node_modules/.prisma/client/query_engine-windows.dll.node`
- Prisma `validate`: passed
- Prisma `migrate status`: database schema is up to date

## Database State Confirmed

- Demo/test data preserved
- Parent and branch relationships preserved
- Payments and allocations preserved
- No reset or destructive migration run during backup
- Sample parent agencies present: `Alansar Travel`, `Almuhajir Travel`, `System Holding Agency`

## Restore Notes

- Restore source from git tag or branch created for this Sprint 11 stable point
- Restore local environment variables manually from secure local copies
- Restore the database with:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" `
  --host=localhost `
  --port=5432 `
  --username=postgres `
  --dbname=travel_agency `
  --clean `
  --if-exists `
  "backups\sprint-11-stable\Sprint11-Stable.backup"
```

- Optional SQL restore path remains available through `travel-agency-sprint-11-stable-2026-07-19.sql`
- After restore:

```bash
npx prisma generate --schema=prisma/schema.prisma
npx prisma migrate deploy --schema=prisma/schema.prisma
npm run build --workspace=backend
npm run build --workspace=frontend
```

## Stability Note

- The system was stable enough to back up after Sprint 11 completion.
- No new sprint implementation was started during this backup task.
