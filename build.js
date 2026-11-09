/**
 * Cars by Youni — deploy-time pre-render.
 * Fetches the live Google Sheet and bakes the inventory into the site:
 *   - index.html: visible cards + schema.org ItemList + a data seed (instant hydration)
 *   - showroom/<slug>.html: one crawlable, shareable page per car (own OG image + Car schema)
 * Degrades gracefully: if the fetch fails, it still emits a valid runtime-only site.
 *
 * Local test:  YC_LOCAL_CSV=sample.csv node build.js
 * Prod (Vercel): node build.js   (buildCommand in vercel.json)
 */
const fs = require('fs');
const path = require('path');

const SITE = "https://autoprimecars.vercel.app";
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT0qeDSTiJkeT9UkU0XvKaoSRpjT6wxCDNeRaiXonPBvpUUo176DlEIxk_qYBDF_2v5Qu4XLim5w3ia/pub?gid=0&single=true&output=csv";
const WHATSAPP = "2349122503132";
const OUT_DIR = path.join(__dirname, 'dist');
const STATIC_FILES = ['robots.txt', 'og-image.png', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest'];

// ---- helpers (mirror the client parser exactly) ----
const cleanImg = (url) => {
  if (!url) return '';
  let t = String(url).trim().replace(/^"|"$/g, '');
  if (t.includes('drive.google.com')) {
    const id = t.match(/[-\w]{25,}/);
    if (id) return `https://lh3.googleusercontent.com/u/0/d/${id[0]}`;
  }
  return t;
};

function parseSheet(text) {
  const rows = text.split(/\r?\n/).filter(r => r.trim() !== '');
  const data = rows.slice(1).map((row, idx) => {
    const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
    return {
      id: cols[0] || idx,
      name: cols[1] || 'Premium Unit',
      basePrice: parseFloat((cols[2] || "0").replace(/[^0-9.]/g, '')) || 0,
      category: cols[3] || 'Used',
      power: cols[4] || 'Fuel',
      status: cols[5] || 'Available',
      images: (cols[6] || '').split(',').map(cleanImg).filter(i => i !== ''),
      description: cols[7] || '',
      video: cols[8] || '',
      body: cols[9] || ''
    };
  });
  const rateRow = data.find(i => i.id.toString().toUpperCase() === 'RATE');
  const rate = (rateRow && rateRow.basePrice > 0) ? rateRow.basePrice : 1550;
  const cars = data.filter(i => i.id.toString().toUpperCase() !== 'RATE' && i.name.length > 2);
  return { cars, rate };
}

// ---- URL slugs (MUST match the client slugify in template.html) ----
const slugify = (s) => String(s).toLowerCase().normalize('NFKD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '')
  .trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'vehicle';

function assignSlugs(cars) {
  const seen = Object.create(null);
  return cars.map(c => {
    let base = slugify(c.name), s = base, n = 1;
    while (seen[s]) { n++; s = base + '-' + n; }
    seen[s] = 1; return s;
  });
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800';
// "Price on request" when there is no real price (fixes ₦0 listings)
const priceLabel = (base, rate) => (base > 0) ? ('₦' + Math.round(base * rate).toLocaleString('en-NG')) : 'Price on request';
const CONTACT_EMAIL = "carsbyyouni@gmail.com";
const emailLink = (c, rate) => `mailto:${CONTACT_EMAIL}?subject=` + encodeURIComponent('Enquiry: ' + c.name) + '&body=' + encodeURIComponent(
  `Hi Cars by Youni — I'm interested in the ${c.name} (${priceLabel(c.basePrice, rate)}). Please confirm availability and delivery timelines.`);

// ---- static (crawlable) cards on the home page; each links to its detail page ----
function renderCards(cars, rate, slugs) {
  if (!cars.length) return '';
  const items = cars.map((c, i) => {
    const img = c.images[0] || FALLBACK_IMG;
    const sold = String(c.status).toLowerCase() === 'sold';
    const href = `/showroom/${slugs[i]}`;
    return `      <article style="background:#fff;border:1px solid #f1f5f9;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.06)">
        <a href="${href}" style="text-decoration:none;color:inherit;display:block">
          <div style="height:220px;background:#fcfcfc;display:flex;align-items:center;justify-content:center;padding:20px">
            <img src="${esc(img)}" alt="${esc(c.name)}" loading="lazy" style="max-width:100%;max-height:100%;object-fit:contain">
          </div>
          <div style="padding:24px 24px 0">
            <div style="font:700 10px/1.4 'DM Sans',sans-serif;letter-spacing:.15em;text-transform:uppercase;color:#94a3b8">${esc(c.category)} &middot; ${esc(c.power)}${sold ? ' &middot; Sold' : ''}</div>
            <h3 style="font-family:'Fraunces',serif;font-style:italic;font-weight:900;font-size:22px;color:#0d0d0f;margin:8px 0 0">${esc(c.name)}</h3>
            <div style="font-family:'Fraunces',serif;font-style:italic;font-weight:900;font-size:24px;color:#0d0d0f;margin-top:10px">${esc(priceLabel(c.basePrice, rate))}</div>
          </div>
        </a>
        <div style="padding:16px 24px 24px">
          <a href="${href}" style="display:inline-block;background:#0d0d0f;color:#fff;padding:12px 22px;border-radius:16px;font:900 11px/1 'DM Sans',sans-serif;letter-spacing:.15em;text-transform:uppercase;text-decoration:none">${sold ? 'View (Sold)' : 'View details'}</a>
        </div>
      </article>`;
  }).join('\n');
  return `<section aria-label="Available vehicles" style="max-width:1120px;margin:0 auto;padding:48px 24px;font-family:'DM Sans',sans-serif">
    <h2 style="font-family:'Fraunces',serif;font-style:italic;font-weight:900;font-size:32px;color:#0d0d0f;text-align:center;margin:0 0 8px">Available Vehicles</h2>
    <p style="text-align:center;color:#64748b;margin:0 0 32px">${cars.length} vehicle${cars.length === 1 ? '' : 's'} in stock &middot; sourced, inspected and delivered nationwide across Nigeria.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:28px">
${items}
    </div>
  </section>`;
}

// ---- schema.org ItemList for the home page ----
function renderItemList(cars, rate, slugs) {
  if (!cars.length) return '';
  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Cars by Youni — Available Vehicles",
    "numberOfItems": cars.length,
    "itemListElement": cars.map((c, i) => {
      const offer = {
        "@type": "Offer",
        "availability": String(c.status).toLowerCase() === 'sold' ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
        "seller": { "@type": "AutoDealer", "name": "Cars by Youni" }
      };
      if (c.basePrice > 0) { offer.priceCurrency = "NGN"; offer.price = Math.round(c.basePrice * rate); }
      return {
        "@type": "ListItem",
        "position": i + 1,
        "url": `${SITE}/showroom/${slugs[i]}`,
        "item": {
          "@type": "Car",
          "name": c.name,
          "url": `${SITE}/showroom/${slugs[i]}`,
          "image": c.images[0] || undefined,
          "fuelType": c.power,
          "itemCondition": /new/i.test(c.category) ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
          "offers": offer
        }
      };
    })
  };
  return `<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>`;
}

function renderSeed(cars, rate) {
  return `<script>window.__INITIAL_CARS__=${JSON.stringify(cars)};window.__INITIAL_RATE__=${JSON.stringify(rate)};</script>`;
}

// ---- one standalone, crawlable, shareable page per car ----
const YMARK = `<svg viewBox="0 0 120 120" width="34" height="34" fill="none" aria-hidden="true"><rect x="4" y="4" width="112" height="112" rx="24" fill="#0d0d0f"/><path d="M40 20 L46 42 A14 14 0 0 0 74 42 L80 20" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M47 69 C47 62,54 62,60 69 C66 76,73 76,73 69 C73 62,66 62,60 69 C54 76,47 76,47 69 Z" stroke="#f5a623" stroke-width="7" stroke-linejoin="round"/><path d="M60 82 V99" stroke="#fff" stroke-width="10" stroke-linecap="round"/></svg>`;

function renderCarPage(c, slug, rate) {
  const imgs = c.images.length ? c.images : [FALLBACK_IMG];
  const main = imgs[0];
  const sold = String(c.status).toLowerCase() === 'sold';
  const price = priceLabel(c.basePrice, rate);
  const url = `${SITE}/showroom/${slug}`;
  const desc = c.description ? c.description.replace(/\s+/g, ' ').trim()
    : `${c.category} ${c.name} — sourced, inspected and delivered nationwide across Nigeria by Cars by Youni.`;
  const metaDesc = `${c.name} — ${price}. ${c.category} · ${c.power}. Nationwide delivery across Nigeria from Cars by Youni.`;

  const offer = { "@type": "Offer", "availability": sold ? "https://schema.org/SoldOut" : "https://schema.org/InStock", "url": url, "seller": { "@type": "AutoDealer", "name": "Cars by Youni" } };
  if (c.basePrice > 0) { offer.priceCurrency = "NGN"; offer.price = Math.round(c.basePrice * rate); }
  const ld = {
    "@context": "https://schema.org", "@type": "Car", "name": c.name, "url": url,
    "image": imgs, "description": desc, "fuelType": c.power,
    "itemCondition": /new/i.test(c.category) ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    "brand": { "@type": "Brand", "name": (c.name.split(' ').find(w => /^[A-Za-z]{3,}$/.test(w)) || "Cars by Youni") },
    "offers": offer
  };
  const crumbs = {
    "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Cars by Youni", "item": SITE + "/" },
      { "@type": "ListItem", "position": 2, "name": c.name, "item": url }
    ]
  };
  const thumbs = imgs.length > 1 ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">${imgs.map((im, i) =>
    `<img src="${esc(im)}" alt="${esc(c.name)} photo ${i + 1}" loading="lazy" onclick="document.getElementById('yc-main').src=this.src" style="width:84px;height:64px;object-fit:cover;border-radius:12px;cursor:pointer;border:1px solid #e2e8f0;background:#fff">`).join('')}</div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(c.name)} | Cars by Youni</title>
<meta name="description" content="${esc(metaDesc)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#0d0d0f">
<link rel="canonical" href="${url}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Cars by Youni">
<meta property="og:title" content="${esc(c.name)} — Cars by Youni">
<meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(main)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(c.name)} — Cars by Youni">
<meta name="twitter:description" content="${esc(metaDesc)}">
<meta name="twitter:image" content="${esc(main)}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(crumbs)}</script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,900&family=DM+Sans:wght@400;500;700&display=swap');
*{box-sizing:border-box}body{margin:0;background:#f6f5f2;color:#0d0d0f;font-family:'DM Sans',sans-serif;line-height:1.6}
a{color:inherit}.wrap{max-width:900px;margin:0 auto;padding:24px}
.nav{display:flex;align-items:center;gap:12px;padding:18px 24px;position:sticky;top:0;background:rgba(246,245,242,.9);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid #eceae5}
.brand{font-family:'Fraunces',serif;font-style:italic;font-weight:900;font-size:20px}
.amber{color:#f5a623}.kicker{font-weight:700;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#94a3b8}
h1{font-family:'Fraunces',serif;font-style:italic;font-weight:900;font-size:30px;line-height:1.1;margin:8px 0 10px}
.price{font-family:'Fraunces',serif;font-style:italic;font-weight:900;font-size:30px;margin:0 0 18px}
.stage{background:#fcfcfc;border:1px solid #eceae5;border-radius:24px;padding:20px;text-align:center}
.stage img.main{max-width:100%;max-height:420px;object-fit:contain}
.btn{display:inline-block;background:#0d0d0f;color:#fff;padding:15px 26px;border-radius:16px;font-weight:900;font-size:12px;letter-spacing:.15em;text-transform:uppercase;text-decoration:none}
.btn.ghost{background:transparent;color:#0d0d0f;border:1px solid #cbd5e1}
.sold{display:inline-block;background:#dc2626;color:#fff;padding:6px 14px;border-radius:999px;font-weight:900;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px}
.desc{white-space:pre-line;color:#334155;margin:18px 0 26px}
.foot{color:#94a3b8;font-size:12px;text-align:center;padding:40px 24px}
</style>
</head>
<body>
<header class="nav"><a href="/" style="display:flex;align-items:center;gap:10px;text-decoration:none">${YMARK}<span class="brand">Cars by <span class="amber">Youni</span></span></a></header>
<main class="wrap">
  <a href="/" style="text-decoration:none;color:#94a3b8;font-weight:700;font-size:12px;letter-spacing:.1em;text-transform:uppercase">&larr; All vehicles</a>
  <div class="stage" style="margin-top:14px"><img id="yc-main" class="main" src="${esc(main)}" alt="${esc(c.name)}"></div>
  ${thumbs}
  <div style="margin-top:26px">
    ${sold ? '<span class="sold">Sold</span><br>' : ''}
    <div class="kicker">${esc(c.category)} &middot; ${esc(c.power)}</div>
    <h1>${esc(c.name)}</h1>
    <div class="price">${esc(price)}</div>
    <p class="desc">${esc(desc)}</p>
    ${sold ? '' : `<a class="btn" href="${emailLink(c, rate)}" rel="nofollow">Check availability</a>`}
    <a class="btn ghost" href="/#request" style="margin-left:10px">Can't find it? We'll source it</a>
    <p style="color:#64748b;font-size:13px;margin-top:18px">Nationwide delivery across Nigeria &middot; financing available (ask for terms).</p>
  </div>
</main>
<div class="foot">Cars by Youni &middot; a division of Made by Youni Ltd &middot; RC 9411546</div>
</body>
</html>`;
}

function renderSitemap(slugs) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [`  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`]
    .concat(slugs.map(s => `  <url><loc>${SITE}/showroom/${s}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

async function getCsv() {
  if (process.env.YC_LOCAL_CSV) return fs.readFileSync(process.env.YC_LOCAL_CSV, 'utf8');
  const res = await fetch(`${SHEET_CSV_URL}&t=${Date.now()}`);
  if (!res.ok) throw new Error('sheet fetch ' + res.status);
  return await res.text();
}

async function main() {
  const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
  let cars = [], rate = 1550, ok = false;
  try {
    ({ cars, rate } = parseSheet(await getCsv()));
    ok = true;
    console.log(`[build] pre-rendered ${cars.length} vehicles (rate ₦${rate}).`);
  } catch (e) {
    console.warn('[build] sheet fetch failed — emitting runtime-only build:', e.message);
  }

  const slugs = ok ? assignSlugs(cars) : [];
  const html = template
    .replace('<!--YC:ITEMLIST-->', ok ? renderItemList(cars, rate, slugs) : '')
    .replace('<!--YC:INITIAL-->', ok ? renderSeed(cars, rate) : '')
    .replace('<!--YC:CARDS-->', ok ? renderCards(cars, rate, slugs) : '');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);

  // one page per car
  if (ok && cars.length) {
    const dir = path.join(OUT_DIR, 'showroom');
    fs.mkdirSync(dir, { recursive: true });
    cars.forEach((c, i) => fs.writeFileSync(path.join(dir, slugs[i] + '.html'), renderCarPage(c, slugs[i], rate)));
    console.log(`[build] wrote ${cars.length} car pages to dist/showroom/`);
  }

  // sitemap: homepage + every car page (fallback to the static file if the build has no data)
  if (ok && cars.length) {
    fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), renderSitemap(slugs));
    console.log(`[build] wrote sitemap with ${cars.length + 1} urls`);
  } else if (fs.existsSync(path.join(__dirname, 'sitemap.xml'))) {
    fs.copyFileSync(path.join(__dirname, 'sitemap.xml'), path.join(OUT_DIR, 'sitemap.xml'));
  }

  for (const f of STATIC_FILES) {
    if (fs.existsSync(path.join(__dirname, f))) fs.copyFileSync(path.join(__dirname, f), path.join(OUT_DIR, f));
  }
  console.log('[build] wrote dist/index.html' + (ok ? '' : ' (runtime fallback)'));
}

module.exports = { parseSheet, cleanImg, slugify, assignSlugs, renderCards, renderItemList, renderSeed, renderCarPage, renderSitemap };
if (require.main === module) main();
