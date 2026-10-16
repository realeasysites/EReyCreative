# Erik Reynolds Creative — web service

Node/Express + SQLite site with an inquiry dashboard. Pages: `/` (portfolio) and `/architecture` (architecture services + a dedicated inquiry form). Inquiries from both forms are saved to the database and shown at `/admin`.

## Deploy on Render (Web Service)
- Runtime: Node. Build command: `npm install`. Start command: `npm start`.
- Node is pinned to 20.x (`.node-version` + `engines`) because `better-sqlite3` has no prebuilt binary for the newest Node.
- Repo layout: `package.json`, `server.js`, `public/`, `routes/`, `lib/`, `db/`, `views/` must be at the **top level** of the repo (not inside an extra folder).
- Add a **persistent disk** (1 GB) mounted at `/var/data`, and set `DB_PATH=/var/data/erik.db`. Without it, inquiries are lost on every deploy.

## Environment variables
| Name | Required | What it does |
|---|---|---|
| `ADMIN_PASSWORD` | yes | Dashboard password (8+ characters). Dashboard stays locked until set. |
| `SESSION_SECRET` | yes | Random string (16+ characters) used to sign the login cookie. |
| `DB_PATH` | yes on Render | `/var/data/erik.db` |
| `ADMIN_USER` | no | Dashboard username (default `erik`). |
| `NOTIFY_EMAIL` | for alerts | Where new-inquiry emails go (Erik's inbox). |
| `SMTP_USER` / `SMTP_PASS` | for alerts | Sender account and app password (Gmail: use an app password). |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | no | Default `smtp.gmail.com` / `465` / `true`. |
| `SITE_URL` | no | e.g. `https://erikreynoldscreative.com`, adds a dashboard link to alert emails. |

Email alerts are optional: without SMTP settings every inquiry is still saved and visible in `/admin`. Replying to an alert email replies to the visitor.

## Dashboard
`/admin` → filter by All / New / Architecture / Photography / General, set status (new, contacted, in progress, won, closed), add private notes, export CSV.

## Edit the architecture services list
- Services and process copy: `public/architecture.html`.
- Home page "Say hello" topic menu: the `<select id="topic">` in `public/index.html`.
- Inquiry form fields on the architecture page: the `#arch-form` form in `public/architecture.html` (the server accepts name, email, phone, project_type, location, timeline, budget, message).

## Before launch (copy to confirm with Erik)
The architecture service names, the four-step "what to expect" copy, the budget ranges, and gallery captions were drafted from his existing site and need his okay.

## Local run
`npm install` then `ADMIN_PASSWORD=yourpass123 SESSION_SECRET=any-long-random-string npm start` → http://localhost:3000
