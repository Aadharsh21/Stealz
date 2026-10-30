// Runs inside the shopper's tab, only when they click the Stealz button. Reads the product from
// the page's structured data (schema.org Product, which most stores publish for Google) and its
// Open Graph tags, and returns plain data. Nothing else on the page is read or changed.

/* exported extractProduct */
function extractProduct() {
  const decode = (s) => {
    if (typeof s !== 'string') return '';
    const box = document.createElement('textarea');
    box.innerHTML = s;
    return box.value.replace(/\s+/g, ' ').trim();
  };
  const text = (v) => {
    if (Array.isArray(v)) return text(v[0]);
    if (typeof v === 'string') return decode(v);
    if (v && typeof v === 'object') return decode(v.name || v['@value'] || '');
    return '';
  };
  const num = (v) => {
    const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const products = [];
  const visit = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > 6) return;
    if (Array.isArray(node)) {
      node.forEach((n) => visit(n, depth + 1));
      return;
    }
    const types = [].concat(node['@type'] || []).map(String);
    if (types.some((t) => /^(Product|ProductGroup|IndividualProduct|ProductModel)$/i.test(t))) products.push(node);
    for (const key of ['@graph', 'mainEntity', 'itemListElement', 'item']) {
      if (node[key]) visit(node[key], depth + 1);
    }
  };
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      visit(JSON.parse(s.textContent || ''), 0);
    } catch (e) {
      // A store's broken JSON is not our problem; fall back to page tags.
    }
  }

  const out = { url: location.href, host: location.hostname, isProduct: false, title: '' };
  const p = products.find((x) => x.offers || x.hasVariant) || products[0];
  if (p) {
    out.isProduct = true;
    out.title = text(p.name);
    out.brand = text(p.brand);
    out.color = text(p.color);
    const img = Array.isArray(p.image) ? p.image[0] : p.image;
    out.image = typeof img === 'string' ? img : img && (img.url || img.contentUrl);
    let offers = p.offers;
    if (!offers && Array.isArray(p.hasVariant) && p.hasVariant.length) {
      offers = p.hasVariant[0].offers;
      if (!out.color) out.color = text(p.hasVariant[0].color);
    }
    for (const o of [].concat(offers || [])) {
      const price = num(o.price ?? o.lowPrice ?? (o.priceSpecification && o.priceSpecification.price));
      if (price) {
        out.price = price;
        out.currency = o.priceCurrency || (o.priceSpecification && o.priceSpecification.priceCurrency) || undefined;
        break;
      }
    }
  }

  const meta = (...names) => {
    for (const n of names) {
      const el = document.querySelector(`meta[property="${n}"], meta[name="${n}"], meta[itemprop="${n}"]`);
      const v = el && el.getAttribute('content');
      if (v && v.trim()) return decode(v);
    }
    return '';
  };
  if (!out.title) out.title = meta('og:title', 'twitter:title') || text((document.querySelector('h1') || {}).textContent) || decode(document.title);
  if (!out.price) {
    const price = num(meta('product:price:amount', 'og:price:amount', 'price'));
    const itemprop = document.querySelector('[itemprop="price"]');
    const fromMicrodata = itemprop && num(itemprop.getAttribute('content') || itemprop.textContent);
    if (price || fromMicrodata) {
      out.price = price || fromMicrodata;
      const cur = document.querySelector('[itemprop="priceCurrency"]');
      out.currency = meta('product:price:currency', 'og:price:currency', 'priceCurrency') || (cur && cur.getAttribute('content')) || undefined;
      out.isProduct = true;
    }
  }
  if (/product/i.test(meta('og:type'))) out.isProduct = true;
  if (!out.brand) out.brand = meta('product:brand', 'og:brand', 'brand');
  if (!out.color) out.color = meta('product:color', 'color');
  if (!out.image) out.image = meta('og:image', 'twitter:image');

  out.title = String(out.title || '').slice(0, 300);
  out.brand = String(out.brand || '').slice(0, 80) || undefined;
  out.color = String(out.color || '').slice(0, 60) || undefined;
  out.currency = out.currency ? String(out.currency).slice(0, 3).toUpperCase() : undefined;
  if (out.image && !/^https?:\/\//.test(out.image)) {
    try {
      out.image = new URL(out.image, location.href).href;
    } catch (e) {
      out.image = undefined;
    }
  }
  return out;
}
