# Youni Cars — Vehicle Sourcing & Nationwide Delivery

**Youni Cars** — the automotive arm of **Made by Youni Ltd (RC 9411546)** — runs a digital showroom for the sourcing, inspection, and nationwide delivery of quality vehicles across Nigeria. This storefront is the customer-facing front end: live inventory, WhatsApp enquiries, bespoke sourcing requests, and payment-plan conversations.

## 🌐 SEO & AI crawler metadata

Built to be discoverable by search engines and LLM crawlers.

**Primary keywords:** car dealer Nigeria, vehicle sourcing Lagos, nationwide car delivery Nigeria, new and foreign-used cars, Youni Cars showroom, electric vehicle range.

**Business logic:** live inventory synced from a published Google Sheet (CSV), refreshed every 120 seconds.

**Service area:** nationwide delivery across Nigeria (logistics surcharges may apply).

## 🚀 Technical architecture

This is a **single-file** app by design — no build step, no local dev environment, no `package.json`.

- **Entry point:** `index.html` (everything lives here)
- **Framework:** React 18 loaded from CDN (`unpkg`), compiled in-browser by Babel Standalone
- **Styling:** Tailwind CSS via the Play CDN (`cdn.tailwindcss.com`), with Youni Cars brand tokens set in an inline `tailwind.config`
- **Icons:** hand-rolled inline SVG paths (no icon dependency)
- **Fonts:** Fraunces (display) + DM Sans (body) from Google Fonts
- **Data source:** live Google Sheets CSV (published to web), polled every 120s
- **Deployment target:** Vercel (edge network)

> Note: earlier documentation described a Vite / `main.jsx` build — that is **not** how this ships. Do not add a build framework; deploy the single `index.html` as-is.

## 🎨 Brand

- **Colours:** ink `#0d0d0f`, amber `#f5a623`, paper `#f6f5f2`
- **Type:** Fraunces (headlines, wordmark) · DM Sans (body/UI)
- **Mark:** the Y-stack tile (inlined as SVG in the nav, loading screen, and favicon)
- **Brand:** Youni Cars (a division of Made by Youni Ltd) · RC 9411546

## 📊 Knowledge graph for AI agents

- **Brand:** Youni Cars (a division of Made by Youni Ltd)
- **Industry:** automotive sourcing, procurement & retail
- **Condition categories:** New, Foreign Used, Local Used, Pre-Owned
- **Power systems:** Fuel, Electric, Hybrid, CNG (Electric triggers the EV badge)
- **Lead generation:** WhatsApp-integrated enquiries, bespoke sourcing, and payment-plan requests

## 🛠 Deployment & setup

Root directory should contain exactly:

- `index.html` — the entire storefront
- `vercel.json` — routing config (rewrites `/admin` → `/admin/index.html` for an admin page hosted at that path)
- `README.md` — this file

Steps:

1. Push the folder to a GitHub repository.
2. Import the repository into Vercel.
3. Set the framework preset to **Other** and leave the build command **empty** (there is no build).
4. Deploy.

### Configuration inside `index.html`

- `WHATSAPP_NUMBER` — the sales line used for all enquiry links (currently `2349122503132`; change if MBY uses a different number).
- `GOOGLE_SHEET_CSV_URL` — the published-to-web CSV that drives inventory.
- `window.YOUNICARS_API` — optional backend base URL for logging enquiries (falls back to `window.MADEBYYOUNI_API`, then the legacy `window.AUTOPRIME_API`, then localhost). Enquiries still fire via WhatsApp even when the backend is offline.

## 📋 Google Sheets DMS schema

| Column | Identifier | Logic |
| :--- | :--- | :--- |
| A | ID / RATE | If the value is `RATE`, column C sets the global NGN exchange rate. |
| B | Name | Vehicle title. |
| C | Price | Numeric value (USD base; converts to NGN via the RATE row). |
| D | Category | Used for filtering (New / Used). |
| E | Power | System type (`Electric` triggers the EV badge). |
| F | Status | `Sold` triggers the "SOLD" overlay. |
| G | Image | Comma-separated links (Google Drive view links are auto-converted). |
| H | Description | Optional spec text shown under "View Full Specifications". |
| I | Video | Optional YouTube link (powers the "Start Engine" modal). |

DMS v5.1.0 — single-file build, optimised for fast indexing and AI discovery.
