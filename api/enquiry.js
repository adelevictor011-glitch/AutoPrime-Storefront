// api/enquiry.js — Vercel serverless function (CommonJS, no dependencies, Node 18+)
//
// Every enquiry on the storefront (Check Availability, sourcing, trade-in, financing)
// posts here. In under a minute it:
//   1. checks the enquiry with simple rules (spam, phone, budget vs listed price)
//   2. asks Groq to score it hot / warm / cold and draft a reply (facts from the live sheet only)
//   3. logs it to the Leads tab of the Google Sheet (optional, see docs/LEADS.md)
//   4. emails YOU an alert with the lead, the score and the ready-to-send draft (Brevo)
//   5. (later, once a domain is verified) emails the buyer the reply automatically
//
// Environment variables — paste these into Vercel → Project → Settings → Environment Variables.
// Never put them in this file.
//   GROQ_API_KEY        Groq key (free). Without it, leads are still logged and alerted, just not scored by AI.
//   BREVO_API_KEY       Brevo API key (send-only).
//   ALERT_FROM_EMAIL    A sender already verified in your Brevo account, e.g. hello@imagendai.com
//   ALERT_TO_EMAIL      Where alerts go. Default: carsbyyouni@gmail.com
//   LEADS_WEBHOOK_URL   Optional. Google Apps Script web-app URL that appends rows to the Leads tab.
//   AUTO_REPLY          Leave unset until the domain is ready. Set to "on" to email buyers automatically.
//   BUYER_FROM_EMAIL    Branded sender for buyer replies (needs the domain), e.g. cars@madebyyouni.com

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT0qeDSTiJkeT9UkU0XvKaoSRpjT6wxCDNeRaiXonPBvpUUo176DlEIxk_qYBDF_2v5Qu4XLim5w3ia/pub?gid=0&single=true&output=csv";
const SITE = "https://autoprimecars.vercel.app";
const BRAND = "Cars by Youni";
const REPLY_TO = "carsbyyouni@gmail.com";
const TYPES = ["availability", "sourcing", "trade-in", "financing"];
const MAX_FIELD = 400;

// --- tiny in-memory rate limit (per warm instance; good enough against casual spam) ---
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

const clean = (v) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, MAX_FIELD);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const naira = (n) => "₦" + Math.round(n).toLocaleString("en-NG");

async function withTimeout(promise, ms) {
  let t;
  return Promise.race([promise, new Promise((_, rej) => { t = setTimeout(() => rej(new Error("timeout")), ms); })])
    .finally(() => clearTimeout(t));
}

// Nigerian mobile: 080…, +23480…, 23480… (10–11 digits after the prefix)
function normalisePhone(raw) {
  const d = String(raw || "").replace(/[^\d+]/g, "");
  if (/^\+?234[789][01]\d{8}$/.test(d)) return "+" + d.replace(/^\+/, "");
  if (/^0[789][01]\d{8}$/.test(d)) return "+234" + d.slice(1);
  return null;
}

// "12m", "12 million", "₦12,000,000", "12000000" → 12000000
function parseNaira(raw) {
  const s = String(raw || "").toLowerCase().replace(/[,₦\s]|ngn|naira/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)(k|m|million|mil|b)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const mult = { k: 1e3, m: 1e6, million: 1e6, mil: 1e6, b: 1e9 }[m[2]] || 1;
  return n * mult;
}

// Live price + status of the car from the same sheet the site uses (never trust the browser for price)
async function lookupCar(name) {
  if (!name) return null;
  try {
    const res = await withTimeout(fetch(SHEET_CSV_URL + "&t=" + Date.now()), 3500);
    const text = await res.text();
    const rows = text.split(/\r?\n/).filter(r => r.trim());
    const parsed = rows.slice(1).map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, "").trim()));
    const rateRow = parsed.find(c => String(c[0]).toUpperCase() === "RATE");
    const rate = rateRow ? (parseFloat(String(rateRow[2]).replace(/[^0-9.]/g, "")) || 1550) : 1550;
    const row = parsed.find(c => (c[1] || "").toLowerCase() === name.toLowerCase());
    if (!row) return null;
    const base = parseFloat(String(row[2] || "0").replace(/[^0-9.]/g, "")) || 0;
    return { name: row[1], priceNgn: base > 0 ? base * rate : null, status: row[5] || "Available", category: row[3] || "", description: (row[7] || "").slice(0, 300) };
  } catch (e) {
    return null;
  }
}

function ruleCheck(lead, car) {
  const flags = [];
  let score = 0;
  if (lead.phoneOk) score += 2; else flags.push("Phone number doesn't look like a Nigerian mobile");
  if (lead.email) score += 1;
  if (car && car.status && /sold/i.test(car.status)) flags.push("Listing is marked Sold");
  const budget = parseNaira(lead.budget || lead.down);
  if (car && car.priceNgn && budget) {
    const ratio = budget / car.priceNgn;
    if (ratio >= 0.85) score += 2; else flags.push(`Budget ${naira(budget)} is ${Math.round((1 - ratio) * 100)}% under the listed ${naira(car.priceNgn)}`);
  } else if (budget && budget >= 5e6) score += 1;
  if (lead.type === "financing") score += 1;
  const temp = score >= 4 ? "hot" : score >= 2 ? "warm" : "cold";
  return { temp, flags };
}

async function aiAssess(lead, car, rules) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const facts = car
    ? `Listing (the ONLY facts you may state): ${car.name}; price ${car.priceNgn ? naira(car.priceNgn) : "price on request"}; status ${car.status}; condition ${car.category}; notes: ${car.description || "none"}.`
    : "No specific listing. Do not state any price, stock or availability.";
  const system = `You are the sales desk of ${BRAND}, a vetted car marketplace in Lagos, Nigeria (a division of Made by Youni Ltd).
Score the enquiry and draft a short reply email to the customer.
Hard rules for the reply:
- Use only the listing facts given. Never invent a price, discount, mileage, delivery date, warranty or financing terms.
- Never promise the car is available; say the team is confirming it.
- Never mention WhatsApp numbers. Ask at most ONE useful question (e.g. inspection day, trade-in, payment plan).
- Warm, plain Nigerian-business English, under 110 words, signed "The ${BRAND} team".
Return JSON only: {"temperature":"hot|warm|cold","reason":"one short sentence","subject":"email subject","reply":"plain-text email body"}`;
  const user = `Enquiry type: ${lead.type}
Customer: ${lead.name || "(no name)"}; phone ok: ${lead.phoneOk}; email given: ${!!lead.email}
Details: ${JSON.stringify(lead.details)}
${facts}
Rule check suggested: ${rules.temp}${rules.flags.length ? " — flags: " + rules.flags.join("; ") : ""}`;
  try {
    const res = await withTimeout(fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }]
      })
    }), 9000);
    if (!res.ok) return null;
    const data = await res.json();
    const out = JSON.parse(data.choices[0].message.content);
    if (!["hot", "warm", "cold"].includes(out.temperature) || !out.reply) return null;
    return { temperature: out.temperature, reason: clean(out.reason), subject: clean(out.subject) || `Your ${BRAND} enquiry`, reply: String(out.reply).slice(0, 1500) };
  } catch (e) {
    return null;
  }
}

async function brevoSend({ from, fromName, to, subject, html, text, replyTo }) {
  const key = process.env.BREVO_API_KEY;
  if (!key || !from || !to) return false;
  try {
    const res = await withTimeout(fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": key, accept: "application/json" },
      body: JSON.stringify({
        sender: { email: from, name: fromName || BRAND },
        to: [{ email: to }],
        replyTo: replyTo ? { email: replyTo } : undefined,
        subject, htmlContent: html, textContent: text
      })
    }), 6000);
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function logToSheet(row) {
  const url = process.env.LEADS_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await withTimeout(fetch(url, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(row) }), 4000);
    return res.ok;
  } catch (e) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", SITE);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  // Honeypot: real people never fill the hidden "website" field. Pretend success to bots.
  if (body.website) return res.status(200).json({ ok: true });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return res.status(429).json({ error: "Too many requests. Please try again in a few minutes." });

  const type = TYPES.includes(body.type) ? body.type : null;
  if (!type) return res.status(400).json({ error: "Unknown enquiry type" });

  const details = {};
  for (const [k, v] of Object.entries(body.details || {})) {
    if (Object.keys(details).length >= 12) break;
    details[clean(k).slice(0, 40)] = clean(v);
  }
  const lead = {
    type,
    name: clean(body.name),
    phone: clean(body.phone),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(body.email)) ? clean(body.email).toLowerCase() : "",
    budget: details.budget || "",
    down: details.down || "",
    details
  };
  lead.phoneE164 = normalisePhone(lead.phone);
  lead.phoneOk = !!lead.phoneE164;
  if (!lead.name || (!lead.phone && !lead.email)) {
    return res.status(400).json({ error: "Please add your name and a phone number or email." });
  }

  const carName = clean(details.vehicle || details.car_of_interest || "");
  const car = type === "availability" || type === "financing" ? await lookupCar(carName) : null;
  const rules = ruleCheck(lead, car);
  const ai = await aiAssess(lead, car, rules);
  const temp = ai ? ai.temperature : rules.temp;
  const receivedAt = new Date().toISOString();

  const fallbackReply = `Hi ${lead.name || "there"},\n\nThanks for reaching out to ${BRAND}. We've received your ${type.replace("-", " ")} request${carName ? " for the " + carName : ""} and a member of the team is checking the details now. We'll get back to you shortly.\n\nThe ${BRAND} team`;
  const subject = ai ? ai.subject : `Your ${BRAND} enquiry`;
  const reply = ai ? ai.reply : fallbackReply;

  // 1) Log
  const logged = await logToSheet({
    receivedAt, type, temperature: temp, name: lead.name, phone: lead.phoneE164 || lead.phone, email: lead.email,
    vehicle: carName, listedPrice: car && car.priceNgn ? Math.round(car.priceNgn) : "", details: JSON.stringify(details),
    flags: rules.flags.join("; "), aiReason: ai ? ai.reason : "", status: "new"
  });

  // 2) Alert you
  const badge = { hot: "🔥 HOT", warm: "🟠 WARM", cold: "🔵 COLD" }[temp];
  const mailto = lead.email ? `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reply)}` : "";
  const call = lead.phoneE164 ? `tel:${lead.phoneE164}` : "";
  const wa = lead.phoneE164 ? `https://wa.me/${lead.phoneE164.replace("+", "")}?text=${encodeURIComponent(reply)}` : "";
  const rows = [
    ["Type", type], ["Name", lead.name], ["Phone", lead.phoneE164 || lead.phone || "—"], ["Email", lead.email || "—"],
    ...Object.entries(details).map(([k, v]) => [k, v]),
    ...(car ? [["Listed price", car.priceNgn ? naira(car.priceNgn) : "On request"], ["Listing status", car.status]] : []),
    ["Why this score", ai ? ai.reason : "Rules only (no AI key yet)"],
    ...(rules.flags.length ? [["Flags", rules.flags.join("; ")]] : [])
  ];
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#0d0d0f">
  <p style="font-size:12px;letter-spacing:.1em;color:#888;margin:0">NEW ENQUIRY · ${esc(receivedAt.slice(0, 16).replace("T", " "))} UTC</p>
  <h2 style="margin:6px 0 14px">${badge} — ${esc(lead.name)}${carName ? " · " + esc(carName) : ""}</h2>
  <table style="border-collapse:collapse;width:100%;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:6px 8px;color:#666;border-bottom:1px solid #eee;width:34%">${esc(k)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee">${esc(v)}</td></tr>`).join("")}</table>
  <h3 style="margin:20px 0 6px">Draft reply (check before sending)</h3>
  <pre style="white-space:pre-wrap;background:#f6f5f2;padding:12px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px">${esc(reply)}</pre>
  <p>${[call && `<a href="${call}" style="background:#0d0d0f;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;margin-right:6px">Call</a>`,
       mailto && `<a href="${mailto}" style="background:#f5a623;color:#0d0d0f;padding:10px 14px;border-radius:8px;text-decoration:none;margin-right:6px">Email this reply</a>`,
       wa && `<a href="${wa}" style="background:#eee;color:#0d0d0f;padding:10px 14px;border-radius:8px;text-decoration:none">WhatsApp this reply</a>`].filter(Boolean).join("")}</p>
  <p style="font-size:12px;color:#888">${logged ? "Saved to the Leads tab." : "Not saved to a sheet (LEADS_WEBHOOK_URL not set)."} Buyer auto-reply: ${process.env.AUTO_REPLY === "on" ? "on" : "off until the domain is ready"}.</p>
</div>`;
  const alerted = await brevoSend({
    from: process.env.ALERT_FROM_EMAIL, fromName: `${BRAND} leads`,
    to: process.env.ALERT_TO_EMAIL || REPLY_TO,
    subject: `${badge} ${type} — ${lead.name}${carName ? " · " + carName : ""}`,
    html, text: rows.map(r => r.join(": ")).join("\n") + "\n\nDraft reply:\n" + reply,
    replyTo: lead.email || undefined
  });

  // 3) Auto-reply to the buyer — only when switched on and a branded sender exists
  let autoReplied = false;
  if (process.env.AUTO_REPLY === "on" && process.env.BUYER_FROM_EMAIL && lead.email) {
    autoReplied = await brevoSend({
      from: process.env.BUYER_FROM_EMAIL, fromName: BRAND, to: lead.email, subject,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#0d0d0f;white-space:pre-wrap">${esc(reply)}</div>`,
      text: reply, replyTo: REPLY_TO
    });
  }

  if (!logged && !alerted) {
    // Nothing reached you — tell the browser so it falls back to the email link.
    return res.status(503).json({ error: "We couldn't send that just now.", fallback: true });
  }
  return res.status(200).json({ ok: true, autoReplied });
};
