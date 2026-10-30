# Stealz

Find the real steal. Stealz compares new bags, shoes, clothing and accessories across stores in the US, UK, UAE and India. For each store it shows what you'd actually pay (price + shipping + tax for your location) and when the item would arrive.

Built with Next.js (App Router), React and Tailwind CSS, deployed on Vercel.

## Features

- Search any item and compare stores side by side
- Totals for your location: US sales tax by ZIP code (with clothing exemptions); UK VAT, UAE VAT and India GST already included
- Delivery dates worked out for your ZIP code, postcode, PIN code or emirate
- Location detected automatically, with manual ZIP code, postcode or PIN entry
- Deal score (buy now or wait), inflated "was" price warnings, seller trust signals, coupons
- Price history and price-drop email alerts (no account needed)
- Watchlist saved in the browser, shareable comparison links
- Sample data mode, so the site works before any API key is added

## Setup

### 1. Live prices (SerpApi)

1. Create a free account at [serpapi.com](https://serpapi.com) (250 searches a month on the free plan).
2. In Vercel, go to **Project → Settings → Environment Variables** and add `SERPAPI_API_KEY`.
3. Redeploy.

A search uses one SerpApi credit. Opening a product's store comparison uses one more. Results are cached for 6 hours, and the site stops making live calls once it reaches the daily (`DAILY_LIVE_SEARCHES`, default 40) or monthly (`MONTHLY_LIVE_SEARCHES`, default 240) limit, so the free plan can't be overrun. When you need more, raise those limits and upgrade the SerpApi plan.

### 2. Price history and alerts (optional)

Alerts need a database and an email service:

1. **Database:** in Vercel, go to **Storage → Create → Neon (Postgres)** and connect it to this project. This adds `DATABASE_URL`. Tables are created automatically on first use.
2. **Email:** create a [Resend](https://resend.com) account, verify your domain, and add `RESEND_API_KEY` and `EMAIL_FROM` (for example `Stealz <alerts@gostealz.com>`).
3. **Daily price check:** add `CRON_SECRET` (any long random string). Vercel calls `/api/cron/check-prices` once a day (see `vercel.json`).
4. Set `APP_URL` to your site address (for example `https://gostealz.com`) so links in emails point to the right place.

### 3. Custom domain

In Vercel, go to **Project → Settings → Domains**, add the domain, and buy it there or point your DNS at Vercel.

## Environment variables

| Variable | Needed for | Notes |
| --- | --- | --- |
| `SERPAPI_API_KEY` | Live prices | Without it the site shows sample data |
| `DATABASE_URL` | History and alerts | Neon via Vercel Storage works |
| `RESEND_API_KEY`, `EMAIL_FROM` | Alert emails | |
| `CRON_SECRET` | Daily price checks | |
| `APP_URL` | Email links | Falls back to the Vercel production URL |
| `OWNER_EMAIL` | Usage warnings | You get an email at 80% and 100% of the monthly search limit, when the daily limit is hit, and when the SerpApi plan runs low |
| `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` | Optional | Adds new eBay listings in the US |

See `.env.example` for every option, including the search budget limits.

## Local development

```bash
npm install
npm run dev
npm test
```

Prices and delivery dates come from stores and Google Shopping and can change, so the site always tells shoppers to confirm with the store before buying.
