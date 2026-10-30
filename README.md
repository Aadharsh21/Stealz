# Stealz

Find the real steal. Stealz compares new bags, shoes, clothing and accessories across stores in the US, UAE and India, and shows what you'd actually pay (price + shipping + tax for your location) and when it would arrive.

Built with Next.js (App Router), React and Tailwind CSS. Deploys on Vercel.

## Status

Work in progress. The site runs on built-in sample data until a SerpApi key is added.

## Features

- Search any item and compare stores side by side
- Totals for your location: US sales tax by ZIP code (with clothing exemptions), UAE VAT and India GST included
- Delivery dates worked out for your ZIP, PIN code or emirate
- Location auto-detected, with manual ZIP/PIN entry
- Deal score (buy now or wait), inflated "was" price warnings, seller trust signals, coupons
- Price history and price-drop email alerts (no account needed)
- Watchlist saved in the browser, shareable comparison links

## Environment variables

Add these in Vercel → Project → Settings → Environment Variables. Never commit keys to the repo.

| Variable | Required | What it does |
| --- | --- | --- |
| `SERPAPI_API_KEY` | For live prices | Google Shopping results via SerpApi |
| `DATABASE_URL` | For history and alerts | Postgres connection string (Neon via Vercel Storage works) |
| `RESEND_API_KEY` | For alert emails | Sends price-drop emails |
| `EMAIL_FROM` | For alert emails | e.g. `Stealz <alerts@gostealz.com>` |
| `APP_URL` | Recommended | e.g. `https://gostealz.com` |
| `CRON_SECRET` | For alerts | Protects the daily price-check job |
| `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` | Optional | Adds new eBay listings in the US |

See `.env.example` for the full list, including the search budget limits that keep SerpApi usage inside the plan.

## Local development

```bash
npm install
npm run dev
npm test
```
