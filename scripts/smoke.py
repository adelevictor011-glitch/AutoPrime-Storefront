#!/usr/bin/env python3
"""Smoke test for the live site. Run by .github/workflows/smoke.yml after every production
deploy and once a day. Prints one line per check and exits 1 if any check fails; the
workflow then opens (or updates) a GitHub issue labelled smoke-alert, which emails you."""
import json, re, sys, urllib.request, urllib.error

UA = {"User-Agent": "smoke-test (+github actions)"}
results = []

def get(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:  # DNS, TLS, timeout
        return 0, str(e)

def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))

def finish():
    bad = [r for r in results if not r[1]]
    for name, ok, detail in results:
        print(("PASS " if ok else "FAIL ") + name + (f" ({detail})" if detail else ""))
    with open("smoke-report.md", "w") as f:
        f.write("| Check | Result | Detail |\n|---|---|---|\n")
        for name, ok, detail in results:
            f.write(f"| {name} | {'✅' if ok else '❌'} | {detail.replace('|', '/')} |\n")
    sys.exit(1 if bad else 0)

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://autoprimecars.vercel.app").rstrip("/")

s, html = get(BASE + "/")
check("Homepage loads", s == 200, f"HTTP {s}")
cars = sorted(set(re.findall(r'/showroom/([a-z0-9-]+)', html)))
# The build bakes the Google Sheet inventory into the page. Zero cars means the sheet
# fetch failed or the sheet is empty, and visitors see an empty showroom.
check("Inventory baked into the page", len(cars) > 0, f"{len(cars)} cars")
for slug in cars[:3]:
    s2, page = get(f"{BASE}/showroom/{slug}")
    check(f"Car page /showroom/{slug}", s2 == 200 and "schema.org" in page, f"HTTP {s2}")
s3, sm = get(BASE + "/sitemap.xml")
check("Sitemap lists the cars", s3 == 200 and sm.count("/showroom/") >= len(cars) > 0, f"HTTP {s3}")
m = re.search(r'<meta property="og:image" content="([^"]+)"', html)
check("WhatsApp preview image set", bool(m))
if m:
    s4, _ = get(m.group(1)); check("WhatsApp preview image loads", s4 == 200, f"HTTP {s4}")
check("Library versions pinned (no floating react@18 / babel)",
      "react@18/" not in html and "@babel/standalone/babel" not in html)
for pat in ("sk_live_", "service_role", "ghp_", "AIza"):
    check(f"No secret in page ({pat})", pat not in html)
finish()
