// Email through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email).
// Without RESEND_API_KEY, emails are printed to the server log instead of sent.

import { BRAND } from './brand';
import { config } from './config';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string;
}

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { resendApiKey, emailFrom } = config();
  if (!resendApiKey || !emailFrom) {
    console.info(`[email] (not sent: RESEND_API_KEY/EMAIL_FROM not set) to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    return { ok: false, error: 'email-not-configured' };
  }
  const headers: Record<string, string> = {};
  if (msg.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${msg.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${resendApiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: emailFrom, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text, headers }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      console.error('[email] Resend error', res.status, data.message);
      return { ok: false, error: data.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    console.error('[email] send failed', err);
    return { ok: false, error: (err as Error).message };
  }
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function layout(title: string, body: string, footer: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f3f4f8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1d2340">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e1e3ec">
<tr><td style="padding:22px 28px;background:#1d2340;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.02em">${escape(BRAND.name)}<span style="color:#ffd829">.</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;letter-spacing:-0.01em">${title}</h1>
${body}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #eee;color:#777;font-size:12px;line-height:1.5">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${escape(href)}" style="display:inline-block;background:#1d2340;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;font-size:15px">${escape(label)}</a>`;
}

export function confirmEmail(p: {
  title: string;
  currentPrice: string;
  target: string | null;
  confirmUrl: string;
  productUrl: string;
}): Omit<EmailMessage, 'to'> {
  const what = p.target ? `drops to ${p.target} or less` : 'drops';
  const html = layout(
    'Confirm your price alert',
    `<p style="margin:0 0 10px;font-size:15px;line-height:1.55">You asked us to email you when <strong>${escape(p.title)}</strong> ${what}. It's ${escape(p.currentPrice)} right now.</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.55">Confirm to start watching it. We check prices every day.</p>
${button(p.confirmUrl, 'Confirm alert')}
<p style="margin:22px 0 0;font-size:13px"><a href="${escape(p.productUrl)}" style="color:#1d2340">See current prices</a></p>`,
    `If you didn't ask for this, ignore this email and nothing will happen.`,
  );
  const text = `Confirm your ${BRAND.name} price alert\n\nYou asked us to email you when "${p.title}" ${what}. It's ${p.currentPrice} right now.\n\nConfirm: ${p.confirmUrl}\nCurrent prices: ${p.productUrl}\n\nIf you didn't ask for this, ignore this email.`;
  return { subject: `Confirm your price alert: ${p.title}`.slice(0, 120), html, text };
}

export function dropEmail(p: {
  title: string;
  newPrice: string;
  oldPrice: string;
  store: string;
  storeUrl?: string;
  productUrl: string;
  /** Page with a "stop alerts" button, linked in the email body. */
  unsubscribePageUrl: string;
  /** One-click endpoint for the List-Unsubscribe header. */
  unsubscribeUrl: string;
  targetReached: boolean;
}): Omit<EmailMessage, 'to'> {
  const headline = p.targetReached ? 'Your target price was reached' : 'Price drop';
  const html = layout(
    headline,
    `<p style="margin:0 0 6px;font-size:15px;line-height:1.55"><strong>${escape(p.title)}</strong></p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.55">Now <strong style="font-size:20px">${escape(p.newPrice)}</strong> at ${escape(p.store)}, down from ${escape(p.oldPrice)}. Totals include shipping and estimated tax for your location.</p>
${button(p.productUrl, 'Compare all stores')}
${p.storeUrl ? `<p style="margin:18px 0 0;font-size:13px"><a href="${escape(p.storeUrl)}" style="color:#1d2340">Go straight to ${escape(p.store)}</a></p>` : ''}`,
    `Prices change quickly, so check the store before you buy. <a href="${escape(p.unsubscribePageUrl)}" style="color:#777">Stop alerts for this item</a>.`,
  );
  const text = `${headline}: ${p.title}\n\nNow ${p.newPrice} at ${p.store}, down from ${p.oldPrice}.\n\nCompare all stores: ${p.productUrl}\n${p.storeUrl ? `Store: ${p.storeUrl}\n` : ''}\nStop alerts for this item: ${p.unsubscribePageUrl}`;
  return { subject: `${p.targetReached ? 'Target reached' : 'Price drop'}: ${p.title} is now ${p.newPrice}`.slice(0, 120), html, text, unsubscribeUrl: p.unsubscribeUrl };
}
