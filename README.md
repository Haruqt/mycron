# mycron

A small cron-job scheduler for the web, inspired by cron-job.org. Add a URL and a schedule, and mycron calls it on time, records how it went, and shows you charts.

Built with Next.js, Supabase and Vercel. It is meant for one person and their friends, not for the public internet.

## What it does

- Call any public URL on a cron schedule (GET, POST and more, with custom headers)
- Sign in with Google or GitHub
- Per-job history of the last 50 runs, with status, response time and start delay
- Charts with hover details: runs per hour, response time and start delay
- A Statistics tab with totals for the whole app
- An Admin tab for the owner: see who is online and change roles
- Limits: 10 jobs per person, no limit for admins
- Light and dark theme

## How it works

1. **Supabase `pg_cron`** pings `/api/tick` every minute with a secret.
2. **`/api/tick`** finds the jobs that are due and runs them.
3. Each run is saved, older runs are trimmed to 50 per job, and hourly totals are kept for the charts.
4. Calls to private or internal addresses (localhost, `10.x`, `192.168.x`, and similar) are blocked.

## Run it yourself

You need a free [Supabase](https://supabase.com) project, a [Vercel](https://vercel.com) account and Node.js 20 or newer.

1. Clone this repo and run `npm install`.
2. In the Supabase SQL Editor, run these files in order:
   - `supabase/schema.sql`
   - `supabase/multiuser.sql`
   - `supabase/schedule.sql` (put your own secret where it says `YOUR_CRON_SECRET`)
3. In Supabase, turn on the Google and GitHub providers under Authentication, and turn the Email provider off.
4. Create a `.env.local` file with these values:

```
   SUPABASE_URL=
   SUPABASE_SERVICE_ROLE_KEY=
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   CRON_SECRET=
```

5. Run `npm run dev` and open http://localhost:3000.
6. Deploy with `npx vercel --prod` and add the same values as environment variables in Vercel.

The first person to sign in becomes the admin.

## Security notes

- Never commit `.env.local` or any key.
- The service key is only used on the server.
- Row level security is on for every table, and all data goes through the server.

## License

Personal project. Use it as a reference.