# ⚔️ Samuell Server — Setup Guide

A self-hosted WhatsApp bot management platform.
- **Dashboard** → Vercel (free)
- **Backend + Bot Runner** → Railway (free tier)
- **Database + Auth** → Supabase (free tier)

---

## 📁 Project Structure

```
knightbot-server/
├── backend/          ← Deploy to Railway
│   ├── server.js
│   ├── manager/
│   ├── routes/
│   ├── middleware/
│   └── bot/          ← PUT YOUR BOT FILES HERE
├── dashboard/        ← Deploy to Vercel
├── supabase/
│   └── schema.sql    ← Run this in Supabase
└── railway.json
```

---

## STEP 1 — Set Up Supabase

1. Go to **https://supabase.com** → Create New Project
2. Go to **SQL Editor** → paste the entire contents of `supabase/schema.sql` → Run
3. Go to **Authentication → Settings → Email** → Enable email confirmations (or disable for easier testing)
4. Note down these values from **Settings → API**:
   - `Project URL` (SUPABASE_URL)
   - `anon public` key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - `service_role` key (SUPABASE_SERVICE_KEY) ← keep this secret!
   - `JWT Secret` from Settings → API → JWT Settings (JWT_SECRET)

---

## STEP 2 — Add Your Bot Files

Copy your KnightBot files into `backend/bot/`:

```
backend/bot/
├── index.js       ← your bot's index.js (with 2 small changes below)
├── package.json   ← your bot's package.json
├── main.js
├── settings.js
├── /commands/
├── /lib/
└── /data/
```

### ⚠️ Required changes to bot/index.js (2 lines only)

Find these two lines and update them:

```js
// BEFORE:
let phoneNumber = "911234567890"
// AFTER:
let phoneNumber = process.env.FORCE_PHONE || process.env.PHONE_NUMBER || "911234567890"
```

```js
// BEFORE:
const { state, saveCreds } = await useMultiFileAuthState(`./session`)
// AFTER:
const { state, saveCreds } = await useMultiFileAuthState(process.env.FORCE_SESSION_PATH || `./session`)
```

That's it. These two changes let the server give each user their own session.

---

## STEP 3 — Deploy Backend to Railway

1. Go to **https://railway.app** → New Project → Deploy from GitHub repo
   (push this project to a GitHub repo first)
2. Set the root directory to `/` (the railway.json handles the rest)
3. Go to **Variables** → add these environment variables:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your service role key
JWT_SECRET=your-supabase-jwt-secret
FRONTEND_URL=https://your-dashboard.vercel.app
PORT=3001
BOT_DIR=./bot
SESSIONS_DIR=./sessions
```

4. Deploy. Railway will run `npm install` and start the server.
5. Copy your Railway **public URL** (e.g. `https://samuell-backend.railway.app`)

---

## STEP 4 — Deploy Dashboard to Vercel

1. Go to **https://vercel.com** → New Project → Import your GitHub repo
2. Set **Root Directory** to `dashboard`
3. Add these Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your anon key
NEXT_PUBLIC_BACKEND_URL=https://samuell-backend.railway.app
```

4. Deploy. Copy your Vercel URL.
5. Go back to Railway → update `FRONTEND_URL` to your Vercel URL.

---

## STEP 5 — Create Your Admin Account

1. Open your dashboard → Register with your email
2. Go to Supabase → Table Editor → `profiles` table
3. Find your row → change `role` from `user` to `admin`
4. Now you have full admin access in the dashboard

---

## How Users Use It

1. User visits dashboard → Registers → Logs in
2. Goes to **My Bot** → enters their WhatsApp number (international format, no +)
3. Clicks **Start Bot** → waits a few seconds
4. A **pairing code** appears on screen (e.g. `ABCD-1234`)
5. User opens WhatsApp → Settings → Linked Devices → Link a Device → Link with Phone Number → enter code
6. Bot is now connected and running!
7. User can monitor status, see live logs, restart or stop from the dashboard

---

## Admin Controls

- View all users, their bot status, message counts, uptime
- Force stop or restart any user's bot
- Stop ALL bots at once
- Promote/demote users to admin
- Delete users
- View analytics charts (daily snapshots)

---

## Resource Estimates (Railway free tier)

Each bot uses ~100-200MB RAM. Railway's free tier gives 512MB.
So you can run ~2-3 bots simultaneously on the free tier.

For more users, upgrade to Railway's $5/mo Hobby plan (8GB RAM = ~40 bots).

---

## Troubleshooting

**Bot won't start:** Check Railway logs. Make sure bot files are in `backend/bot/` and `npm install` ran successfully inside that folder.

**Pairing code doesn't appear:** Check the logs page in the dashboard. The code should appear within 10-15 seconds of starting.

**Socket not connecting:** Make sure `FRONTEND_URL` in Railway matches exactly your Vercel URL (including https://).

**Can't register:** Check Supabase → Authentication settings → make sure email signups are enabled.
