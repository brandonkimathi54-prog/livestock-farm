# Livestock Farm

Next.js application connected to Supabase for livestock business operations.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create local environment file:

```bash
cp .env.local.example .env.local
```

Then update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. In Supabase SQL Editor, run:

```sql
-- file: supabase/setup.sql
```

This creates/updates `public.livestock` (including `price_ksh` and `image_url`), enables RLS, and adds policies for public read/insert.

### RLS insert troubleshooting

If you see `new row violates row-level security policy for table "livestock"`, run this SQL:

```sql
alter table public.livestock enable row level security;

drop policy if exists "Public insert livestock" on public.livestock;
create policy "Public insert livestock"
  on public.livestock
  for insert
  to anon, authenticated
  with check (true);
```

4. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase integration

- Client initialization: `src/lib/supabase.ts`
- Homepage data query: `app/page.tsx`
- Database bootstrap script: `supabase/setup.sql`
