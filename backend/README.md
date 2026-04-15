# AutoPrime Backend

Express + SQLite API server for the AutoPrime admin panel.

## Requirements
- Node.js 18+

## Setup

```bash
cd backend
cp .env.example .env   # edit JWT_SECRET and credentials
npm install
npm start              # runs on http://localhost:3001
```

## Default admin credentials
- **Username:** `admin`
- **Password:** `changeme123`

Change these in `.env` before first run, or update via the Settings page after login.

## Accessing the admin panel

Open `admin/index.html` directly in your browser (or serve it with any static file server).
The panel connects to `http://localhost:3001` by default.

To point it at a different backend, set `window.AUTOPRIME_API` before the scripts load:
```html
<script>window.AUTOPRIME_API = 'https://your-backend.com';</script>
```

## API reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | ✓ | Current admin info |
| POST | `/api/auth/change-password` | ✓ | Change password |
| GET | `/api/vehicles` | — | List all vehicles |
| POST | `/api/vehicles` | ✓ | Add vehicle |
| PUT | `/api/vehicles/:id` | ✓ | Update vehicle |
| DELETE | `/api/vehicles/:id` | ✓ | Delete vehicle |
| POST | `/api/vehicles/import-sheet` | ✓ | Import from Google Sheet |
| GET | `/api/vehicles/stats/summary` | ✓ | Dashboard stats |
| GET | `/api/settings` | — | Get all settings |
| PUT | `/api/settings` | ✓ | Update settings |
| POST | `/api/enquiries` | — | Submit enquiry (storefront) |
| GET | `/api/enquiries` | ✓ | List enquiries |
| PUT | `/api/enquiries/:id` | ✓ | Update enquiry status |
| DELETE | `/api/enquiries/:id` | ✓ | Delete enquiry |

## Free deployment options (no credit card needed)
- **[Render.com](https://render.com)** — free tier, auto-deploys from GitHub
- **[Railway.app](https://railway.app)** — free starter plan
- **[Fly.io](https://fly.io)** — free hobby tier

After deploying, set `window.AUTOPRIME_API` in `admin/index.html` to your deployed URL.
