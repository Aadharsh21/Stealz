// Stealz popup: reads the product on the open tab (only when clicked), asks Stealz for every
// store's price for the shopper's location, and shows the cheapest, this store and other colors.

const API = 'https://www.gostealz.com';
const COUNTRY = {
  US: { postal: 'ZIP code', placeholder: 'e.g. 85281', pattern: /^\d{5}$/, numeric: true, locale: 'en-US' },
  GB: { postal: 'Postcode', placeholder: 'e.g. SW1A 1AA', pattern: /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/, numeric: false, locale: 'en-GB' },
  AE: { postal: null, locale: 'en-AE' },
  IN: { postal: 'PIN code', placeholder: 'e.g. 560001', pattern: /^\d{6}$/, numeric: true, locale: 'en-IN' },
};
const SWATCH = {
  black: '#151515', white: '#f4f1ea', clear: 'rgba(255,255,255,0.15)', grey: '#8a8a8a', beige: '#c8b28e', brown: '#7a4f33',
  red: '#b3262e', pink: '#e58fae', purple: '#8e6bbf', blue: '#3d6fb6', green: '#5f8f5a', yellow: '#e3c23b',
  orange: '#e0873a', gold: '#c9a86a', silver: '#c0c0c0',
};

const $ = (id) => document.getElementById(id);
const main = $('main');
let place = null; // the shopper's location, as Stealz resolved it
let product = null; // what we read from the page

// ---------- small helpers ----------

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c != null && c !== false) node.append(c);
  return node;
}

const safeUrl = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null);

/** Only the store's address ("https://www.nordstrom.com") leaves the browser, never the page path. */
function originOf(u) {
  try {
    return u ? new URL(u).origin : undefined;
  } catch (e) {
    return undefined;
  }
}

function money(n, currency) {
  const cents = Math.abs(n - Math.round(n)) >= 0.005;
  const digits = currency === 'INR' ? 0 : cents ? 2 : 0;
  try {
    return new Intl.NumberFormat((COUNTRY[{ USD: 'US', GBP: 'GB', AED: 'AE', INR: 'IN' }[currency]] || {}).locale || 'en-US', {
      style: 'currency',
      currency,
      currencyDisplay: currency === 'AED' ? 'code' : 'narrowSymbol',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(n);
  } catch (e) {
    return `${currency} ${n.toFixed(digits)}`;
  }
}

function timeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    return undefined;
  }
}

async function getJson(url, init) {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error((body && body.error) || "Stealz couldn't be reached. Try again in a moment.");
  return body;
}

function show(...nodes) {
  main.replaceChildren(...nodes);
}

// ---------- location ----------

async function loadPlace() {
  const saved = await chrome.storage.sync.get('place');
  if (saved.place && saved.place.country) return saved.place;
  try {
    const body = await getJson(`${API}/api/location?tz=${encodeURIComponent(timeZone() || '')}`);
    const loc = body.location;
    if (loc && body.supported !== false) {
      await chrome.storage.sync.set({ place: loc });
      return loc;
    }
    return loc || { country: 'US', label: 'United States', source: 'default' };
  } catch (e) {
    return { country: 'US', label: 'United States', source: 'default' };
  }
}

function showPlace() {
  $('where-label').textContent = place ? place.label : 'Set location';
  $('where').setAttribute('aria-label', place ? `Prices for ${place.label}. Change location` : 'Set your location');
}

function syncPlaceForm() {
  const c = $('country').value;
  const cfg = COUNTRY[c];
  $('postal-field').hidden = !cfg.postal;
  $('city-field').hidden = Boolean(cfg.postal);
  if (cfg.postal) {
    $('postal-label').textContent = cfg.postal;
    $('postal').placeholder = cfg.placeholder;
    $('postal').inputMode = cfg.numeric ? 'numeric' : 'text';
  }
  $('place-error').hidden = true;
}

function openPlaceForm(open) {
  $('place').hidden = !open;
  $('where').setAttribute('aria-expanded', String(open));
  if (open && place) {
    $('country').value = COUNTRY[place.country] ? place.country : 'US';
    $('postal').value = place.postalCode || '';
    if (place.country === 'AE' && place.city) $('city').value = place.city;
    syncPlaceForm();
    ($('postal-field').hidden ? $('city') : $('postal')).focus();
  }
}

async function savePlace(e) {
  e.preventDefault();
  const country = $('country').value;
  const cfg = COUNTRY[country];
  const p = new URLSearchParams({ country, source: 'manual' });
  if (cfg.postal) {
    const postal = $('postal').value.replace(/\s+/g, '').toUpperCase();
    if (!cfg.pattern.test(postal)) {
      $('place-error').textContent = `Enter a valid ${cfg.postal}.`;
      $('place-error').hidden = false;
      return;
    }
    p.set('postal', postal);
  } else {
    p.set('city', $('city').value);
  }
  const tz = timeZone();
  if (tz) p.set('tz', tz);
  $('place-save').disabled = true;
  try {
    const body = await getJson(`${API}/api/location?${p}`);
    if (!body.valid) throw new Error(body.error || "We couldn't use that location.");
    place = body.location;
    await chrome.storage.sync.set({ place });
    showPlace();
    openPlaceForm(false);
    if (product && product.title) lookup(product);
  } catch (err) {
    $('place-error').textContent = err.message;
    $('place-error').hidden = false;
  } finally {
    $('place-save').disabled = false;
  }
}

// ---------- states ----------

function productHeader(p) {
  const img = safeUrl(p.image);
  const here = p.price && p.currency ? `${money(p.price, p.currency)} on ${p.host.replace(/^www\./, '')}` : p.host ? `On ${p.host.replace(/^www\./, '')}` : '';
  return el('section', { class: 'product' },
    img ? el('img', { class: 'thumb', src: img, alt: '' }) : el('div', { class: 'thumb empty' }),
    el('div', null, el('h1', { text: p.title }), here ? el('p', { text: here }) : null),
  );
}

function showLoading(p) {
  show(
    p ? productHeader(p) : null,
    el('div', { class: 'skeleton', style: 'height: 96px; margin-top: 14px' }),
    el('div', { class: 'skeleton', style: 'height: 58px; margin-top: 16px' }),
    el('div', { class: 'skeleton', style: 'height: 58px; margin-top: 6px' }),
    el('div', { class: 'skeleton', style: 'height: 58px; margin-top: 6px' }),
    el('p', { class: 'loading-text', text: 'Checking every store for you…' }),
  );
}

function searchBox(value) {
  const input = el('input', { type: 'search', value: value || '', placeholder: 'Search a brand or item', 'aria-label': 'Item to compare' });
  const form = el('form', { class: 'search' }, input, el('button', { class: 'btn primary', type: 'submit', text: 'Compare' }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q.length < 3) return;
    product = { title: q, host: '', url: '' };
    lookup(product);
  });
  return form;
}

function showNotProduct(p) {
  show(
    el('div', { class: 'state' },
      el('h1', { text: 'Open a product page' }),
      el('p', { text: 'On any store, open the item you like and click Stealz again. Or type what you’re looking for:' }),
    ),
    searchBox(''),
  );
}

function showError(message) {
  show(
    product && product.host ? productHeader(product) : null,
    el('div', { class: 'state' },
      el('h1', { text: 'Prices couldn’t be checked' }),
      el('p', { text: message }),
      el('div', { style: 'margin-top: 14px' }, el('button', { class: 'btn ghost', type: 'button', text: 'Try again', onclick: () => lookup(product) })),
    ),
  );
}

function offerRow(o, currency, opts) {
  const link = safeUrl(o.link);
  const chips = [];
  if (opts.best) chips.push(el('span', { class: 'chip gold', text: 'Lowest total' }));
  if (o.thisStore) chips.push(el('span', { class: 'chip here', text: 'This store' }));
  const sale = (o.tags || []).find((t) => /% off$/.test(t));
  if (sale && !opts.best) chips.push(el('span', { class: 'chip sale', text: sale }));
  const meta = [o.color && opts.showColor ? o.color : null, o.shipping, o.delivery].filter(Boolean).join(' · ');
  const body = [
    el('div', { style: 'min-width: 0' },
      el('div', { class: 'store' }, opts.swatch || null, el('b', { text: o.store }), ...chips),
      el('div', { class: 'meta', text: meta, title: o.title }),
    ),
    el('div', { class: 'price' }, money(o.total, currency), el('small', { text: o.totalIsComplete ? 'total' : 'plus shipping' })),
  ];
  return el('li', null, link
    ? el('a', { class: `offer${opts.best ? ' best' : ''}`, href: link, target: '_blank', rel: 'noopener noreferrer' }, ...body)
    : el('div', { class: `offer${opts.best ? ' best' : ''}` }, ...body));
}

function showResults(data) {
  const cur = data.currency;
  const nodes = [productHeader(product)];

  if (!data.cheapest) {
    nodes.push(el('div', { class: 'state' },
      el('h1', { text: 'No other stores found' }),
      el('p', { text: 'We couldn’t find this exact item new at other stores right now. Try a shorter search:' }),
    ), searchBox(data.query));
  } else {
    const c = data.cheapest;
    let note = null;
    if (data.savings && data.savings.basis === 'total') {
      note = el('div', { class: 'note good', text: `${money(data.savings.amount, cur)} less than this store, with shipping and tax` });
    } else if (data.savings) {
      note = el('div', { class: 'note good', text: `${money(data.savings.amount, cur)} less than this page’s price, before shipping and tax` });
    } else if (c.thisStore) {
      note = el('div', { class: 'note plain', text: 'This store has the lowest total we found.' });
    }
    nodes.push(el('section', { class: 'verdict' },
      el('div', { class: 'label', text: 'Lowest total, delivered to you' }),
      el('div', { class: 'big' }, el('span', { class: 'amount', text: money(c.total, cur) }), el('span', { class: 'at', text: `at ${c.store}` })),
      note,
    ));

    const same = data.sameItem || [];
    nodes.push(el('section', { class: 'section' },
      el('h2', { text: same.length === 1 ? 'Same item at 1 store' : `Same item at ${same.length} stores` }),
      el('ul', { class: 'list' }, ...same.map((o) => offerRow(o, cur, { best: o.ref === c.ref && o.store === c.store }))),
    ));
  }

  const colors = data.otherColors || [];
  if (colors.length) {
    nodes.push(el('section', { class: 'section' },
      el('h2', { text: data.pageColor ? `Other colors (this one is ${data.pageColor.toLowerCase()})` : 'Colors at other stores' }),
      el('ul', { class: 'list' }, ...colors.map((col) => offerRow(
        { ...col.offers[0], store: `${col.color}`, delivery: `from ${col.offers[0].store}`, shipping: '' },
        cur,
        { swatch: el('span', { class: 'swatch', style: `background: ${SWATCH[col.family] || '#777'}` }) },
      ))),
    ));
  }

  const more = safeUrl(data.productUrl) || safeUrl(data.compareUrl);
  nodes.push(el('div', { class: 'footer' },
    more ? el('a', { class: 'btn primary wide', href: more, target: '_blank', rel: 'noopener', text: 'See the full comparison on Stealz' }) : null,
    el('p', { class: 'fine', text: data.demo
      ? 'Sample prices: live prices appear once Stealz is connected to stores.'
      : `Totals include shipping and tax for ${data.locationLabel}. Prices can change, so check the store before you buy.` }),
  ));
  show(...nodes);
}

// ---------- lookup ----------

let lookupId = 0;
async function lookup(p) {
  const id = ++lookupId;
  showLoading(p.host ? p : null);
  try {
    const body = {
      title: p.title,
      brand: p.brand,
      price: p.price,
      currency: p.currency,
      color: p.color,
      url: originOf(p.url),
      tz: timeZone(),
      location: place ? {
        country: place.country, postal: place.postalCode, city: place.city, region: place.region,
        regionCode: place.regionCode, source: place.source,
      } : undefined,
    };
    const data = await getJson(`${API}/api/lookup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (id === lookupId) showResults(data);
  } catch (err) {
    if (id === lookupId) showError(err.message);
  }
}

async function readPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https?:/i.test(tab.url || '')) return null;
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractProduct });
    return res && res.result;
  } catch (e) {
    return null; // some pages (the Web Store, browser pages) can't be read
  }
}

async function start() {
  $('where').addEventListener('click', () => openPlaceForm($('place').hidden));
  $('place-cancel').addEventListener('click', () => openPlaceForm(false));
  $('country').addEventListener('change', syncPlaceForm);
  $('place').addEventListener('submit', savePlace);

  showLoading(null);
  const [loc, page] = await Promise.all([loadPlace(), readPage()]);
  place = loc;
  showPlace();
  product = page;
  if (!page || !page.isProduct || !page.title) {
    showNotProduct(page);
    return;
  }
  lookup(page);
}

start();
