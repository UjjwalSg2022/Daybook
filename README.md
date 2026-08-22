# Daybook

Internal work-tracking portal for MAC International. Replaces verbal task
assignment with a written, timestamped, per-employee record that both the
employee and their manager can see and act on.

Target URL: `macintl.in/daybook`

This folder contains two independent projects, matching the two-repo decision
in the PRD:

- `server/` — Express + MongoDB (Mongoose) + JWT API
- `client/` — React (Vite) + Tailwind CSS frontend

## Local setup

### 1. Server

```bash
cd server
npm install
cp .env.example .env
# edit .env: paste your MongoDB Atlas connection string into MONGO_URI,
# and set JWT_SECRET to a long random string
npm run dev
```

The API runs on `http://localhost:5000` by default. Visit
`http://localhost:5000/api/health` to confirm it's up.

### 2. Create the Super Admin (one-time)

Run this once, against the same database the server's `.env` points to:

```bash
cd server
node scripts/createSuperAdmin.js "Your Name" you@macintl.in aStrongPassword123
```

There is no UI for this — it's the only way a Super Admin account gets
created, and `isSuperAdmin` is never settable through the API.

### 3. Create managers and employees

```bash
# Create a manager first
node scripts/createUser.js "Sam Manager" sam@macintl.in manager

# Then employees, linked to that manager by email
node scripts/createUser.js "Jane Doe" jane@macintl.in employee sam@macintl.in
```

Each command prints a one-time temporary password. Share it directly with
that person — it isn't stored anywhere in plaintext and can't be retrieved
later. Everyone is required to change their password on first login. There is
no self-service "forgot password" flow by design (see PRD §6.1) — if someone
forgets, re-run the account-creation logic manually to issue a new one.

### 4. Client

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173` and proxies `/api` requests to the server
at `localhost:5000` (see `vite.config.js`).

## Production deployment (macintl.in/daybook)

- Build the client: `cd client && npm run build` → outputs to `client/dist/`
- Serve `client/dist/` at the `/daybook` path on the company server (Nginx
  `location /daybook/` block, or equivalent)
- Run the server with a process manager (PM2 recommended) and reverse-proxy
  `/api` to it
- Set real values for `MONGO_URI` and `JWT_SECRET` in the server's `.env` —
  never commit `.env` to either repo

## What's deliberately not here (v1 non-goals)

- No self-service signup or password reset
- No time tracking / timesheets
- No multi-level manager hierarchy
- No mobile app (the client is responsive down to tablet width)

See the PRD for the full list of open questions and Phase 2/3 plans,
including the open point on whether task title/description editing should
be locked back down to managers only once the team is using this daily.
