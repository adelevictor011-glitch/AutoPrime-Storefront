/**
 * Youni Cars — deploy-time pre-render.
 * Fetches the live Google Sheet, bakes the current inventory into the HTML
 * (visible cards + schema.org ItemList + a data seed for instant hydration),
 * and writes the final site to ./dist. Degrades gracefully: if the fetch
 * fails, it still emits a valid site that falls back to the runtime fetch.
 *
 * Local test:  YC_LOCAL_CSV=sample.csv node build.js
 * Prod (Vercel): node build.js   (buildCommand in vercel.json)
 */
const fs = require('fs');
const path = require('path');

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT0qeDSTiJkeT9UkU0XvKaoSRpjT6wxCDNeRaiXonPBvpUUo176DlEIxk_qYBDF_2v5Qu4XLim5w3ia/pub?gid=0&single=true&output=csv";
const WHATSAPP = "2349122503132";
const OUT_DIR = path.join(__dirname, 'dist');
const STATIC_FILES = ['robots.txt', 'sitemap.xml', 'og-image.png', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest']; // copied into dist if present

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
      video: cols[8] || ''
    };
  });
  const rateRow = data.find(i => i.id.toString().toUpperCase() === 'RATE');
  const rate = (rateRow && rateRow.basePrice > 0) ? rateRow.basePrice : 1550;
  const cars = data.filter(i => i.id.toString().toUpperCase() !== 'RATE' && i.name.length > 2);
  return { cars, rate };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ngn = (base, rate) => '\u20a6' + Math.round(base * rate).toLocaleString('en-NG');

// ---- static (crawlable) cards, fully inline-styled so they need no utility CSS ----
function renderCards(cars, rate) {
  if (!cars.length) return '';
  const fallbackImg = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800';
  const items = cars.map(c => {
    const img = c.images[0] || fallbackImg;
    const sold = String(c.status).toLowerCase() === 'sold';
    const wa = `https://wa.me/${WHATSAPP}?text=` + encodeURIComponent(`Hi Youni Cars — I'm interested in the ${c.name} (${ngn(c.basePrice, rate)}). Please confirm availability and delivery timelines.`);
    return `      <article style="background:#fff;border:1px solid #f1f5f9;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.06)">
        <div style="height:220px;background:#fcfcfc;display:flex;align-items:center;justify-content:center;padding:20px">
          <img src="${esc(img)}" alt="${esc(c.name)}" loading="lazy" style="max-width:100%;max-height:100%;object-fit:contain">
        </div>
        <div style="padding:24px">
          <div style="font:700 10px/1.4 'DM Sans',sans-serif;letter-spacing:.15em;text-transform:uppercase;color:#94a3b8">${esc(c.category)} &middot; ${esc(c.power)}${sold ? ' &middot; Sold' : ''}</div>
          <h3 style="font-family:'Fraunces',serif;font-style:italic;font-weight:900;font-size:22px;color:#0d0d0f;margin:8px 0 0">${esc(c.name)}</h3>
          <div style="font-family:'Fraunces',serif;font-style:italic;font-weight:900;font-size:24px;color:#0d0d0f;margin-top:10px">${esc(ngn(c.basePrice, rate))}</div>
          <a href="${wa}" rel="nofollow" style="display:inline-block;margin-top:16px;background:#0d0d0f;color:#fff;padding:12px 22px;border-radius:16px;font:900 11px/1 'DM Sans',sans-serif;letter-spacing:.15em;text-transform:uppercase;text-decoration:none">${sold ? 'Sold' : 'Check availability'}</a>
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

// ---- schema.org ItemList (structured data for Google + AI engines) ----
function renderItemList(cars, rate) {
  if (!cars.length) return '';
  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Youni Cars — Available Vehicles",
    "numberOfItems": cars.length,
    "itemListElement": cars.map((c, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "Car",
        "name": c.name,
        "image": c.images[0] || undefined,
        "fuelType": c.power,
        "itemCondition": /new/i.test(c.category) ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
        "offers": {
          "@type": "Offer",
          "priceCurrency": "NGN",
          "price": Math.round(c.basePrice * rate),
          "availability": String(c.status).toLowerCase() === 'sold'
            ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
          "seller": { "@type": "AutoDealer", "name": "Youni Cars" }
        }
      }
    }))
  };
  return `<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>`;
}

function renderSeed(cars, rate) {
  // seed the live app so it paints instantly with correct NGN prices, then refreshes
  return `<script>window.__INITIAL_CARS__=${JSON.stringify(cars)};window.__INITIAL_RATE__=${JSON.stringify(rate)};</script>`;
}

async function getCsv() {
  if (process.env.YC_LOCAL_CSV) {                       // local test path (no network)
    return fs.readFileSync(process.env.YC_LOCAL_CSV, 'utf8');
  }
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
  const html = template
    .replace('<!--YC:ITEMLIST-->', ok ? renderItemList(cars, rate) : '')
    .replace('<!--YC:INITIAL-->', ok ? renderSeed(cars, rate) : '')
    .replace('<!--YC:CARDS-->', ok ? renderCards(cars, rate) : '');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);
  for (const f of STATIC_FILES) {
    if (fs.existsSync(path.join(__dirname, f))) fs.copyFileSync(path.join(__dirname, f), path.join(OUT_DIR, f));
  }
  console.log('[build] wrote dist/index.html' + (ok ? '' : ' (runtime fallback)'));
}

module.exports = { parseSheet, cleanImg, renderCards, renderItemList, renderSeed };
if (require.main === module) main();
