# work.rodion.pro

Monorepo foundation for the internal operational cockpit described in `work_rodion.md`.

## Stack

- `apps/web`: React + TypeScript + Vite
- `apps/api`: Express + TypeScript
- `packages/shared`: shared types and runtime config helpers

## Getting started

1. Enable `pnpm` via Corepack:

   ```powershell
   corepack enable
   corepack prepare pnpm@10.9.0 --activate
   ```

2. Install dependencies:

   ```powershell
   pnpm install
   ```

3. Copy environment variables:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Generate an admin password hash:

   ```powershell
   pnpm auth:hash-password -- your-password-here
   ```

   Put the resulting value into `ADMIN_PASSWORD_HASH` inside `.env`.

5. Run the first migration and seed the local admin:

   ```powershell
   pnpm db:migrate
   pnpm db:seed-admin
   ```

6. Start local development:

   ```powershell
   pnpm dev
   ```

## Available scripts

- `pnpm dev`: run web and api in parallel
- `pnpm build`: build all packages
- `pnpm check`: run TypeScript checks
- `pnpm db:migrate`: apply SQL migrations
- `pnpm db:seed-admin`: create or update the local admin
- `pnpm auth:hash-password -- <password>`: create a password hash for `.env`

## Next steps

- implement projects, tasks and notes modules from the SDD
- expand the dashboard beyond the protected stub
- add session cleanup and richer operational logging
