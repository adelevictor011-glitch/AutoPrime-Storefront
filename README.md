# Youni Cars — Vehicle Sourcing & Nationwide Delivery

**Youni Cars** — the automotive brand of **Made by Youni Ltd (RC 9411546)** — is a digital
showroom that sources, inspects and delivers quality vehicles across Nigeria.

## How it works

The site is one React page (`template.html`) that reads live inventory from a published
Google Sheet CSV every 120 seconds. At **deploy time**, a small build step (`build.js`)
fetches the same sheet and *bakes the current cars into the HTML* — visible cards, a
schema.org `ItemList`, and a data seed — so search engines and AI crawlers (which don't
run JavaScript) can read the inventory. Real visitors still get the live, auto-refreshing app.

- Live view (visitors): always current — refreshes every 120s from the sheet.
- Pre-rendered snapshot (crawlers): reflects the sheet **as of the last deploy**. Redeploy
  to refresh what Google/AI see (see "Keeping the snapshot fresh").

## Files

| File | Purpose |
| --- | --- |
| `template.html` | The site source. Tailwind is precompiled inline (no CDN); React + Babel load from CDN. Opens standalone too — without the build it just falls back to the runtime fetch. |
| `build.js` | Deploy-time pre-render. Fetches the sheet, injects cars + structured data, writes `dist/index.html`. Fails safe: if the fetch errors, it still emits a working runtime-only site. |
| `package.json` | Declares Node ≥18 and the `build` script. |
| `vercel.json` | Sets `buildCommand: node build.js`, `outputDirectory: dist`, and the `/admin` rewrite. |
| `robots.txt` | Allows Google + AI crawlers (GPTBot, ClaudeBot, PerplexityBot, …). Copied into `dist/` by the build. |
| `sitemap.xml` | Single-URL sitemap. Copied into `dist/` by the build. |

## Deploy (Vercel)

1. Push all the files above to a GitHub repo (root level).
2. Import the repo in Vercel. Thanks to `vercel.json`, **no dashboard config is needed** —
   it runs `node build.js` and serves `dist/`.
3. Deploy.

To go back to pure no-build: rename `template.html` to `index.html`, delete the
`buildCommand`/`outputDirectory` lines from `vercel.json`, and deploy. You lose crawlable
inventory but keep the live app.

## Keeping the snapshot fresh

The crawlable cards update on each deploy. To refresh automatically, create a Vercel
**Deploy Hook** (Project → Settings → Git → Deploy Hooks) and ping its URL on a schedule
(e.g. a free cron at cron-job.org nightly, or a Google Apps Script trigger on sheet edit).

## Set your domain

Replace `REPLACE_WITH_YOUR_DOMAIN` in `robots.txt`, `sitemap.xml`, and the canonical/OG tags
in `template.html` with your real domain. Optionally add `og-image.png` (1200×630) for link previews.

## Editing notes

- **Inventory:** edit the Google Sheet (columns: A=ID/RATE, B=Name, C=Price, D=Category,
  E=Power, F=Status, G=Image, H=Description, I=Video). Redeploy to refresh the crawlable snapshot.
- **Currency:** defaults to Naira (₦); USD toggle available.
- **Design/new Tailwind classes:** the CSS is precompiled inline, so any *new* class added to
  `template.html` needs the stylesheet regenerated before it will render.

## Local preview

```
node build.js                     # fetches the live sheet, writes dist/
YC_LOCAL_CSV=sample.csv node build.js   # test against a local CSV, no network
```
