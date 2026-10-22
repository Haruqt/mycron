<div align="center">

# mycron

**Reliable scheduled HTTP requests, with run history and live statistics.**

A self-hosted alternative to cron-job.org, built on Next.js, Supabase and Vercel.

</div>

---

## Overview

mycron calls a URL on a schedule you define, records the outcome of every execution, and shows how your jobs behave over time. It is a small multi-user service: people sign in with Google or GitHub, manage their own jobs, and an administrator oversees usage.

## Features

| | |
|---|---|
| **Flexible scheduling** | Standard 5-field cron expressions with a per-job time zone, a live preview of the next run times, and plain-language descriptions of every schedule. |
| **Full request control** | Choose the HTTP method, add custom headers and a request body, and set a per-job timeout. |
| **Execution history** | The newest 50 runs of each job are kept, with status code, response time, response excerpt and error details. Older runs are removed automatically. |
| **Performance insight** | Hover charts for response time per run, plus runs per hour, average response time and start delay (jitter) across the last 24 hours. |
| **Statistics** | An overview of the whole service: users, jobs and executions in the last 24 hours. |
| **Accounts** | Sign in with Google or GitHub. Each person sees only their own jobs. |
| **Quotas** | Every user can create up to 10 jobs. Administrators have no limit. |
| **Administration** | See who is online, how many jobs each person runs, and promote or demote users. |
| **Interface** | Responsive layout with light and dark themes. |

## Architecture

```
Supabase pg_cron ──every minute──▶  POST /api/tick  ──▶  due jobs
                                                          │
                                         HTTP request to the target URL
                                                          │
                                  job_runs (last 50 per job) + stats_hourly
                                                          │
                                         Next.js dashboard (Vercel)
```

- **Scheduler.** `pg_cron` and `pg_net` inside Supabase call the `/api/tick` endpoint every minute, authenticated with a shared secret. No always-on server is needed.
- **Runner.** The endpoint selects the jobs whose next run is due, executes them, and stores the result together with the measured start delay.
- **Data.** PostgreSQL with row level security enabled on every table. The application reads and writes through the server only.
- **Statistics.** Hourly aggregates are stored separately from individual runs, so charts stay accurate after old runs are trimmed.
- **Authentication.** Supabase Auth with Google and GitHub OAuth. Sessions are handled with `@supabase/ssr`.

## Security

- All pages and API routes require a signed-in user. Only `/api/tick` is open, and it requires the `CRON_SECRET`.
- Users can only read and modify their own jobs and runs. Admin routes verify the caller's role on the server.
- Outbound requests are checked against a block list: localhost, private and link-local ranges, `.local` and `.internal` hosts. The check runs when a job is saved and again on every execution, including each redirect hop.
- The Supabase service key is used only on the server and is never sent to the browser.
- Email sign-up is disabled. Accounts are created through Google or GitHub only.

## Self-hosting

**Requirements:** Node.js 20 or newer, a Supabase project and a Vercel account.

### 1. Install

```bash
git clone https://github.com/Haruqt/mycron.git
cd mycron
npm install
```

### 2. Database

Run these files in the Supabase SQL Editor, in this order:

1. `supabase/schema.sql` creates the base tables.
2. `supabase/multiuser.sql` adds profiles, roles, quotas and statistics.
3. `supabase/schedule.sql` registers the one-minute timer. Replace `YOUR_CRON_SECRET` and the site URL first.

### 3. Authentication

In Supabase, open **Authentication → Sign In / Providers**:

- Enable **Google** and **GitHub** and enter the OAuth client ID and secret of each.
- Disable **Email**.
- Under **URL Configuration**, set the Site URL to your deployment and add `https://your-domain/**` to the redirect URLs.

Both providers use this callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`

### 4. Environment variables

Create `.env.local` for development, and add the same values in the Vercel project settings:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
CRON_SECRET=
```

### 5. Run and deploy

```bash
npm run dev          # http://localhost:3000
npx vercel --prod    # production
```

The first account to sign in becomes the administrator. Deployment Protection on Vercel must be disabled, otherwise the database timer cannot reach `/api/tick`.

## Project structure

```
app/            Pages and API routes (jobs, stats, admin, tick, auth)
components/     Dashboard, charts, job form, admin and statistics views
lib/            Scheduler, runner, network guard, auth and statistics helpers
supabase/       SQL for the schema, multi-user setup and the timer
proxy.ts        Session check for every request
```

## Tech stack

Next.js 16 (App Router) · React · TypeScript · Supabase (PostgreSQL, Auth, pg_cron) · Vercel

## License

Released for reference and personal use.