# Instant enquiry loop (Cars by Youni)

Every enquiry on the site now goes to `api/enquiry.js` instead of opening the buyer's email app.
Within a minute you get an email alert with the lead, a hot/warm/cold score and a ready-to-send
reply. If the function is ever down, the site falls back to the old email link, so no lead is lost.

## Switch it on: paste these in Vercel

Vercel → project **autoprimecars** → Settings → Environment Variables → add each one for
**Production** and **Preview**, then redeploy. Never paste keys into code or chat.

| Name | Value | Needed? |
| --- | --- | --- |
| `BREVO_API_KEY` | Brevo → SMTP & API → API Keys → Generate | Yes |
| `ALERT_FROM_EMAIL` | A sender already verified in Brevo (e.g. `hello@imagendai.com`) | Yes |
| `ALERT_TO_EMAIL` | Where alerts go. Defaults to `carsbyyouni@gmail.com` | Optional |
| `GROQ_API_KEY` | console.groq.com → API Keys | Recommended (AI score + draft) |
| `LEADS_WEBHOOK_URL` | The Apps Script URL from the step below | Optional |
| `AUTO_REPLY` | `on` — **only after the domain is verified** | Later |
| `BUYER_FROM_EMAIL` | e.g. `cars@madebyyouni.com` — **after the domain** | Later |

Until `AUTO_REPLY` is `on`, buyers are **not** emailed automatically. You send the AI draft
yourself with the "Email this reply" or "WhatsApp this reply" button in the alert.

## Optional: log every lead to the Google Sheet

1. Open the inventory Google Sheet → add a tab named **Leads**.
2. Extensions → Apps Script → replace everything with the code below → Save.
3. Deploy → New deployment → type **Web app** → Execute as **Me** → Who has access **Anyone** → Deploy.
4. Copy the web-app URL into `LEADS_WEBHOOK_URL` in Vercel.

```javascript
const COLUMNS = ["receivedAt","type","temperature","name","phone","email","vehicle","listedPrice","details","flags","aiReason","status"];
function doPost(e) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("Leads");
  if (sheet.getLastRow() === 0) sheet.appendRow(COLUMNS);
  const d = JSON.parse(e.postData.contents);
  sheet.appendRow(COLUMNS.map(c => d[c] == null ? "" : d[c]));
  return ContentService.createTextOutput("ok");
}
```

The Leads tab is separate from the inventory tab, so the public CSV the site reads is unchanged.
Keep the Leads tab **unpublished**: it holds customers' phone numbers.

## Guardrails built in

- Prices come from the live sheet on the server, never from the browser.
- The AI may only state facts from the listing. It never promises availability, discounts or
  delivery dates, and never includes WhatsApp numbers.
- A hidden honeypot field and a per-visitor limit (5 enquiries in 10 minutes) block spam bots.
