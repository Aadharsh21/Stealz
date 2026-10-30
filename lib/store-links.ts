// More stores to check in each country. Prices come from Google Shopping, and not every store
// lists everything there, so these open the same search on each store's own site. Every search
// link was opened by hand to make sure it lands on results, not an error page. Shared with the
// browser.

import type { CountryCode } from './types';

export interface StoreSite {
  name: string;
  /** Home page, for the store directory. */
  home: string;
  /** What the store is, in a few words. */
  blurb: string;
  /** The store's own search for a query. */
  search: (q: string) => string;
  /** The store's search can't be linked to, so this is a Google search of its site instead. */
  viaGoogle?: boolean;
}

const enc = encodeURIComponent;

/** "Coach Tabby 26" -> "coach-tabby-26", for stores whose search lives in the path. */
function slug(q: string): string {
  const s = q
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'fashion';
}

const googleSite = (domain: string) => (q: string) => `https://www.google.com/search?q=${enc(`${q} site:${domain}`)}`;

/** Farfetch only searches within women's or men's, so pick by the words in the search. */
const farfetch = (prefix: string) => (q: string) =>
  `https://www.farfetch.com${prefix}/shopping/${/\bmen'?s?\b/i.test(q) && !/\bwomen/i.test(q) ? 'men' : 'women'}/search/items.aspx?q=${enc(q)}`;

export const STORE_SITES: Record<CountryCode, StoreSite[]> = {
  US: [
    { name: 'Nordstrom', home: 'https://www.nordstrom.com', blurb: 'Department store', search: (q) => `https://www.nordstrom.com/sr?keyword=${enc(q)}` },
    { name: 'Nordstrom Rack', home: 'https://www.nordstromrack.com', blurb: 'Designer brands for less', search: (q) => `https://www.nordstromrack.com/sr?keyword=${enc(q)}` },
    { name: 'Saks Fifth Avenue', home: 'https://www.saksfifthavenue.com', blurb: 'Luxury department store', search: (q) => `https://www.saksfifthavenue.com/search?q=${enc(q)}` },
    { name: 'Neiman Marcus', home: 'https://www.neimanmarcus.com', blurb: 'Luxury department store', search: (q) => `https://www.neimanmarcus.com/s/?q=${enc(q)}` },
    { name: 'Bloomingdale’s', home: 'https://www.bloomingdales.com', blurb: 'Department store', search: (q) => `https://www.bloomingdales.com/shop/search?keyword=${enc(q)}` },
    { name: 'Macy’s', home: 'https://www.macys.com', blurb: 'Department store', search: (q) => `https://www.macys.com/shop/search?keyword=${enc(q)}` },
    { name: 'Zappos', home: 'https://www.zappos.com', blurb: 'Shoes, bags and clothing', search: (q) => `https://www.zappos.com/search?term=${enc(q)}` },
    { name: 'Farfetch', home: 'https://www.farfetch.com', blurb: 'Luxury boutiques worldwide', search: farfetch('') },
    { name: 'Amazon', home: 'https://www.amazon.com', blurb: 'Marketplace', search: (q) => `https://www.amazon.com/s?k=${enc(q)}` },
    { name: 'eBay', home: 'https://www.ebay.com', blurb: 'Marketplace, new items only', search: (q) => `https://www.ebay.com/sch/i.html?_nkw=${enc(q)}&LH_ItemCondition=1000` },
  ],
  GB: [
    { name: 'Selfridges', home: 'https://www.selfridges.com/GB/en/', blurb: 'Luxury department store', search: (q) => `https://www.selfridges.com/GB/en/cat/?freeText=${enc(q)}` },
    { name: 'Harrods', home: 'https://www.harrods.com/en-gb', blurb: 'Luxury department store', search: (q) => `https://www.harrods.com/en-gb/search?q=${enc(q)}` },
    { name: 'John Lewis', home: 'https://www.johnlewis.com', blurb: 'Department store', search: (q) => `https://www.johnlewis.com/search?search-term=${enc(q)}` },
    { name: 'ASOS', home: 'https://www.asos.com', blurb: 'Fashion and big brands', search: (q) => `https://www.asos.com/search/?q=${enc(q)}` },
    { name: 'END.', home: 'https://www.endclothing.com/gb', blurb: 'Designer menswear and sneakers', search: (q) => `https://www.endclothing.com/gb/search?q=${enc(q)}` },
    { name: 'Flannels', home: 'https://www.flannels.com', blurb: 'Designer fashion', search: (q) => `https://www.flannels.com/search?q=${enc(q)}` },
    { name: 'Very', home: 'https://www.very.co.uk', blurb: 'Fashion and high-street brands', search: (q) => `https://www.very.co.uk/e/q/${slug(q)}.end` },
    { name: 'Farfetch', home: 'https://www.farfetch.com/uk/', blurb: 'Luxury boutiques worldwide', search: farfetch('/uk') },
    { name: 'Amazon.co.uk', home: 'https://www.amazon.co.uk', blurb: 'Marketplace', search: (q) => `https://www.amazon.co.uk/s?k=${enc(q)}` },
    { name: 'eBay', home: 'https://www.ebay.co.uk', blurb: 'Marketplace, new items only', search: (q) => `https://www.ebay.co.uk/sch/i.html?_nkw=${enc(q)}&LH_ItemCondition=1000` },
  ],
  AE: [
    { name: 'Trendyol', home: 'https://www.trendyol.com/en', blurb: 'Fashion marketplace', search: (q) => `https://www.trendyol.com/en/sr?q=${enc(q)}` },
    { name: 'Brands For Less', home: 'https://www.brandsforless.com/en-ae/', blurb: 'Big brands, off-price', search: (q) => `https://www.brandsforless.com/en-ae/search/?q=${enc(q)}` },
    { name: 'Namshi', home: 'https://www.namshi.com/uae-en/', blurb: 'Fashion and sneakers', search: (q) => `https://www.namshi.com/uae-en/search?q=${enc(q)}` },
    { name: 'noon', home: 'https://www.noon.com/uae-en/', blurb: 'Marketplace', search: (q) => `https://www.noon.com/uae-en/search/?q=${enc(q)}` },
    { name: 'AIVI', home: 'https://en-ae.aivi.com', blurb: 'Fashion, formerly 6thStreet', search: (q) => `https://en-ae.aivi.com/catalogsearch/result/?q=${enc(q)}` },
    { name: 'Ounass', home: 'https://www.ounass.ae', blurb: 'Luxury fashion', search: googleSite('ounass.ae'), viaGoogle: true },
    { name: 'Farfetch', home: 'https://www.farfetch.com/ae/', blurb: 'Luxury boutiques worldwide', search: farfetch('/ae') },
    { name: 'Amazon.ae', home: 'https://www.amazon.ae', blurb: 'Marketplace', search: (q) => `https://www.amazon.ae/s?k=${enc(q)}` },
  ],
  IN: [
    { name: 'Myntra', home: 'https://www.myntra.com', blurb: 'Fashion and sneakers', search: (q) => `https://www.myntra.com/${slug(q)}` },
    { name: 'AJIO', home: 'https://www.ajio.com', blurb: 'Fashion and luxury', search: (q) => `https://www.ajio.com/search/?text=${enc(q)}` },
    { name: 'Nykaa Fashion', home: 'https://www.nykaafashion.com', blurb: 'Fashion and designer labels', search: (q) => `https://www.nykaafashion.com/catalogsearch/result/?q=${enc(q)}` },
    { name: 'Tata CLiQ', home: 'https://www.tatacliq.com', blurb: 'Fashion and luxury', search: (q) => `https://www.tatacliq.com/search/?searchCategory=all&text=${enc(q)}` },
    { name: 'Farfetch', home: 'https://www.farfetch.com/in/', blurb: 'Luxury boutiques worldwide', search: farfetch('/in') },
    { name: 'Amazon.in', home: 'https://www.amazon.in', blurb: 'Marketplace', search: (q) => `https://www.amazon.in/s?k=${enc(q)}` },
    { name: 'Flipkart', home: 'https://www.flipkart.com', blurb: 'Marketplace', search: (q) => `https://www.flipkart.com/search?q=${enc(q)}` },
  ],
};

/** A product title cut down to what store search boxes handle well: no sizes or extras. */
export function storeQuery(title: string): string {
  const head = title.split(/\s[|–—-]\s|[,(]/)[0] ?? title;
  const words = head.replace(/\b(size|sz)\s*\S+/gi, '').split(/\s+/).filter(Boolean);
  return words.slice(0, 7).join(' ') || title.slice(0, 60);
}
