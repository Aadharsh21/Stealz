// Realistic sample data used when no SerpApi key is set (and for local development).
// It produces the same kind of raw text Google shows ("Free delivery by Mon",
// "Get it by Wed ($5.99)") so the real parsing pipeline is exercised end to end.

import type { CountryCode, HistoryPoint, ProductRef, ResolvedLocation } from '../types';
import { COUNTRIES } from '../countries';
import { formatMoney, round2 } from '../money';
import { formatDay, isoFromDay, todayIn, weekdayOf } from '../dates';
import { detectBrand, hash32, normalize } from '../text';
import type { ProviderItem, ProviderProductResult, ProviderSearchResult } from './types';

// ---------- deterministic randomness ----------

function seedOf(text: string): number {
  return parseInt(hash32(text), 36) >>> 0;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length) % list.length];
const between = (r: () => number, lo: number, hi: number) => lo + (hi - lo) * r();

// ---------- categories ----------

export type DemoCategory =
  | 'bag' | 'tote' | 'backpack' | 'wallet' | 'sneaker' | 'boot' | 'heel' | 'watch' | 'sunglasses'
  | 'jeans' | 'tee' | 'shirt' | 'dress' | 'jacket' | 'hoodie' | 'hat' | 'jewelry' | 'other';

const CATEGORY_WORDS: [DemoCategory, RegExp][] = [
  ['tote', /\btotes?\b/],
  ['backpack', /\bbackpacks?\b|\brucksack/],
  ['wallet', /\bwallets?\b|card ?(holder|case)|\bpurse wallet/],
  ['bag', /\bbags?\b|handbag|purse|crossbody|satchel|clutch|shoulder|hobo|tabby|birkin|neverfull|le pliage/],
  ['boot', /\bboots?\b|chelsea|1460|timberland/],
  ['heel', /\bheels?\b|pumps?\b|sandals?\b|stilettos?|loafers?|flats?\b/],
  ['sneaker', /sneakers?|trainers?|shoes?\b|air force|jordan|dunk|samba|550\b|chuck|old skool|yeezy|air max|running/],
  ['watch', /\bwatch(es)?\b|chronograph|g-?shock|seiko|rolex|tissot|casio/],
  ['sunglasses', /sunglass|aviator|wayfarer|eyewear|shades|ray-?ban|oakley/],
  ['jeans', /\bjeans?\b|denim|\b501\b|\b511\b|chinos?|trousers?|pants\b/],
  ['hoodie', /hoodie|sweatshirt|fleece|pullover|crewneck/],
  ['jacket', /jacket|coat|puffer|parka|blazer|nuptse|trench|windbreaker|gilet/],
  ['dress', /\bdress(es)?\b|gown|skirt|jumpsuit|saree|sari|lehenga|kurta|abaya/],
  ['shirt', /\bshirts?\b|oxford|polo|blouse|button[- ]?down/],
  ['tee', /t-?shirts?|\btees?\b|tank top|\btops?\b/],
  ['hat', /\bhats?\b|\bcaps?\b|beanie|bucket hat|59fifty/],
  ['jewelry', /jewel|necklace|bracelet|earrings?|\brings?\b|pendant|charm/],
];

export function categoryOf(text: string): DemoCategory {
  const t = normalize(text);
  for (const [cat, re] of CATEGORY_WORDS) if (re.test(t)) return cat;
  return 'other';
}

const NOUN: Record<DemoCategory, string> = {
  bag: 'Shoulder Bag', tote: 'Tote', backpack: 'Backpack', wallet: 'Wallet', sneaker: 'Sneakers', boot: 'Boots',
  heel: 'Heels', watch: 'Watch', sunglasses: 'Sunglasses', jeans: 'Jeans', tee: 'T-Shirt', shirt: 'Shirt',
  dress: 'Dress', jacket: 'Jacket', hoodie: 'Hoodie', hat: 'Cap', jewelry: 'Necklace', other: '',
};

/** Typical US price range for the category, in dollars. */
const BASE_USD: Record<DemoCategory, [number, number]> = {
  bag: [140, 420], tote: [110, 360], backpack: [60, 220], wallet: [45, 180], sneaker: [75, 170], boot: [130, 260],
  heel: [70, 190], watch: [110, 420], sunglasses: [130, 230], jeans: [50, 110], tee: [20, 55], shirt: [45, 120],
  dress: [70, 210], jacket: [110, 340], hoodie: [50, 110], hat: [22, 48], jewelry: [55, 220], other: [40, 180],
};

const LUXURY = /(gucci|prada|saint laurent|ysl|balenciaga|bottega|burberry|fendi|dior|celine|loewe|valentino|givenchy|versace|louis vuitton|chanel|hermes|moncler|jimmy choo|louboutin|golden goose|mcqueen|off white|miu miu|jacquemus)/;
const PREMIUM = /(coach|michael kors|kate spade|tory burch|marc jacobs|longchamp|ralph lauren|lacoste|hugo boss|ugg|ray ban|oakley|lululemon|north face|patagonia|arcteryx|canada goose|swarovski|pandora|tissot|tumi|rimowa|mulberry|stuart weitzman|sam edelman)/;

const SIMILAR: Record<DemoCategory, string[]> = {
  bag: ['Michael Kors|Parker Medium Leather Shoulder Bag', 'Kate Spade New York|Knott Medium Satchel', 'Tory Burch|Kira Chevron Small Shoulder Bag', 'Marc Jacobs|The Snapshot Camera Bag', 'Longchamp|Le Pliage Original Shoulder Bag', 'Charles & Keith|Koa Chain Shoulder Bag', 'Guess|Noelle Crossbody Bag'],
  tote: ['Longchamp|Le Pliage Large Tote', 'Coach|Field Tote 30', 'Michael Kors|Jet Set Large Tote', 'Tory Burch|Ella Tote', 'Marc Jacobs|The Medium Tote Bag'],
  backpack: ['Herschel|Little America Backpack', 'JanSport|SuperBreak Backpack', 'The North Face|Borealis Backpack', 'Fjallraven|Kanken Backpack', 'Tumi|Alpha Bravo Backpack'],
  wallet: ['Coach|Long Zip Around Wallet', 'Michael Kors|Jet Set Travel Wallet', 'Fossil|Derrick Bifold Wallet', 'Tommy Hilfiger|Leather Bifold Wallet', 'Kate Spade New York|Morgan Compact Wallet'],
  sneaker: ["Nike|Air Force 1 '07", 'Adidas|Samba OG', 'New Balance|550', 'Converse|Chuck Taylor All Star High Top', 'Vans|Old Skool', 'Puma|Suede Classic', 'Asics|Gel-1130'],
  boot: ['Dr. Martens|1460 Smooth Leather Boots', 'Timberland|Premium 6-Inch Waterproof Boots', 'UGG|Classic Mini II Boots', 'Blundstone|Original 500 Chelsea Boots', 'Steve Madden|Hutch Combat Boots'],
  heel: ['Sam Edelman|Hazel Pointed Toe Pumps', 'Steve Madden|Vala Heeled Sandals', 'Stuart Weitzman|Nudistsong Sandals', 'Aldo|Stessy Pumps', 'Jimmy Choo|Bing 65 Mules'],
  watch: ['Fossil|Grant Chronograph Watch', 'Michael Kors|Lexington Chronograph Watch', 'Casio|G-Shock GA2100', 'Seiko|5 Sports Automatic Watch', 'Tissot|PRX Powermatic 80', 'Citizen|Eco-Drive Chandler Watch'],
  sunglasses: ['Ray-Ban|Original Wayfarer RB2140', 'Ray-Ban|Aviator Classic RB3025', 'Oakley|Holbrook', 'Persol|PO0714 Folding Sunglasses', 'Prada|Symbole Sunglasses'],
  jeans: ["Levi's|501 Original Fit Jeans", "Levi's|511 Slim Fit Jeans", 'Calvin Klein|Slim Straight Jeans', 'Tommy Hilfiger|Denton Straight Jeans', 'Wrangler|Cowboy Cut Jeans', 'Diesel|D-Strukt Slim Jeans'],
  tee: ['Uniqlo|Supima Cotton Crew Neck T-Shirt', 'Ralph Lauren|Classic Fit Pocket T-Shirt', 'Lacoste|Crew Neck Cotton T-Shirt', 'Calvin Klein|Monogram Logo T-Shirt', 'Carhartt|Loose Fit Pocket T-Shirt'],
  shirt: ['Ralph Lauren|Custom Fit Oxford Shirt', 'Tommy Hilfiger|Regular Fit Poplin Shirt', 'Allen Solly|Slim Fit Formal Shirt', 'Van Heusen|Slim Fit Stretch Shirt', 'J.Crew|Broken-In Oxford Shirt'],
  dress: ['Free People|Adella Slip Dress', 'Zara|Satin Midi Dress', 'Mango|Wrap Midi Dress', 'Anthropologie|Somerset Maxi Dress', 'H&M|Linen-Blend Dress'],
  jacket: ['The North Face|1996 Retro Nuptse Jacket', 'Patagonia|Down Sweater Jacket', 'Carhartt|Detroit Jacket', "Levi's|Trucker Jacket", 'Columbia|Powder Lite Jacket', 'Zara|Faux Leather Biker Jacket'],
  hoodie: ['Champion|Reverse Weave Hoodie', 'Nike|Sportswear Club Fleece Hoodie', 'Carhartt|Midweight Hooded Sweatshirt', 'Adidas|Trefoil Essentials Hoodie', 'Lululemon|Scuba Oversized Hoodie'],
  hat: ['New Era|59FIFTY Fitted Cap', 'Carhartt|Acrylic Watch Hat', 'Nike|Heritage86 Cap', 'Kangol|Bermuda Casual Bucket Hat'],
  jewelry: ['Pandora|Moments Snake Chain Bracelet', 'Swarovski|Millenia Necklace', 'Kendra Scott|Elisa Pendant Necklace', 'Mejuri|Bold Hoop Earrings'],
  other: ['Coach|Willow Shoulder Bag', "Levi's|501 Original Fit Jeans", 'Ray-Ban|Original Wayfarer RB2140', "Nike|Air Force 1 '07", 'Fossil|Grant Chronograph Watch'],
};

const COLORS: Record<DemoCategory, string[]> = {
  bag: ['Black', 'Brass/Chalk', 'Tan', 'Bordeaux', 'Dark Stone'], tote: ['Black', 'Natural', 'Navy'],
  backpack: ['Black', 'Olive', 'Navy'], wallet: ['Black', 'Saddle', 'Chalk'], sneaker: ['White', 'Black/White', 'Cream'],
  boot: ['Black', 'Wheat', 'Chestnut'], heel: ['Black', 'Nude', 'Red'], watch: ['Silver', 'Gold', 'Black'],
  sunglasses: ['Black', 'Tortoise', 'Gold/Green'], jeans: ['Dark Wash', 'Light Wash', 'Black'], tee: ['White', 'Black', 'Heather Grey'],
  shirt: ['White', 'Light Blue', 'Pink'], dress: ['Black', 'Sage', 'Ivory'], jacket: ['Black', 'Olive', 'Tan'],
  hoodie: ['Grey', 'Black', 'Navy'], hat: ['Black', 'Navy', 'Khaki'], jewelry: ['Silver', 'Gold', 'Rose Gold'], other: ['Black', 'Tan', 'White'],
};

// ---------- stores ----------

interface DemoStore {
  name: string;
  domain: string;
  /** Price multiplier relative to the item's list price. */
  bias: number;
  freeOver?: number; // in local currency; omitted = always free
  fee?: number; // local currency
  days: [number, number];
  returns: string;
  rating: number;
  style: 'by' | 'get' | 'range' | 'dayfirst';
  saleChance: number;
  cats?: DemoCategory[];
}

const STORES: Record<CountryCode, DemoStore[]> = {
  US: [
    { name: 'Nordstrom', domain: 'nordstrom.com', bias: 1, days: [3, 5], returns: 'Free returns', rating: 4.6, style: 'by', saleChance: 0.2 },
    { name: "Macy's", domain: 'macys.com', bias: 0.97, freeOver: 49, fee: 10.95, days: [4, 7], returns: 'Free 30-day returns', rating: 4.3, style: 'range', saleChance: 0.55 },
    { name: "Bloomingdale's", domain: 'bloomingdales.com', bias: 1.02, days: [3, 6], returns: 'Free 30-day returns', rating: 4.5, style: 'by', saleChance: 0.25 },
    { name: 'Zappos', domain: 'zappos.com', bias: 1, days: [1, 2], returns: 'Free 365-day returns', rating: 4.7, style: 'get', saleChance: 0.1, cats: ['sneaker', 'boot', 'heel', 'bag', 'backpack', 'wallet', 'sunglasses', 'watch', 'jeans', 'jacket', 'hoodie', 'tee'] },
    { name: 'Amazon.com', domain: 'amazon.com', bias: 0.95, days: [1, 2], returns: 'Free 30-day returns', rating: 4.4, style: 'get', saleChance: 0.35 },
    { name: 'Nordstrom Rack', domain: 'nordstromrack.com', bias: 0.82, freeOver: 89, fee: 10, days: [5, 8], returns: '45-day returns', rating: 4.1, style: 'range', saleChance: 0.6 },
    { name: "Dillard's", domain: 'dillards.com', bias: 0.99, freeOver: 150, fee: 9.95, days: [5, 9], returns: '30-day returns', rating: 4.2, style: 'range', saleChance: 0.3 },
    { name: 'Shopbop', domain: 'shopbop.com', bias: 1.01, days: [2, 4], returns: 'Free returns', rating: 4.5, style: 'by', saleChance: 0.2 },
    { name: 'Walmart - Seller', domain: 'walmart.com', bias: 0.9, fee: 6.99, days: [4, 8], returns: '30-day returns', rating: 3.9, style: 'get', saleChance: 0.7 },
  ],
  GB: [
    { name: 'Selfridges', domain: 'selfridges.com', bias: 1.03, freeOver: 50, fee: 4.95, days: [2, 4], returns: 'Free 28-day returns', rating: 4.5, style: 'dayfirst', saleChance: 0.2 },
    { name: 'John Lewis', domain: 'johnlewis.com', bias: 1, freeOver: 50, fee: 4.5, days: [2, 5], returns: '35-day returns', rating: 4.6, style: 'by', saleChance: 0.3 },
    { name: 'ASOS', domain: 'asos.com', bias: 0.95, freeOver: 35, fee: 4.5, days: [2, 4], returns: 'Free 28-day returns', rating: 4.3, style: 'by', saleChance: 0.5 },
    { name: 'END.', domain: 'endclothing.com', bias: 1, freeOver: 150, fee: 5, days: [2, 4], returns: '14-day returns', rating: 4.4, style: 'dayfirst', saleChance: 0.3 },
    { name: 'Amazon.co.uk', domain: 'amazon.co.uk', bias: 0.94, days: [1, 2], returns: 'Free 30-day returns', rating: 4.4, style: 'get', saleChance: 0.4 },
    { name: 'Flannels', domain: 'flannels.com', bias: 0.98, freeOver: 100, fee: 4.99, days: [3, 5], returns: '28-day returns', rating: 4.1, style: 'range', saleChance: 0.35 },
    { name: 'Harrods', domain: 'harrods.com', bias: 1.06, fee: 6.95, days: [2, 4], returns: '28-day returns', rating: 4.5, style: 'dayfirst', saleChance: 0.15 },
    { name: 'Schuh', domain: 'schuh.co.uk', bias: 0.97, freeOver: 30, fee: 3.99, days: [2, 4], returns: '365-day returns', rating: 4.5, style: 'get', saleChance: 0.3, cats: ['sneaker', 'boot', 'heel'] },
  ],
  AE: [
    { name: 'Namshi', domain: 'namshi.com', bias: 0.98, freeOver: 100, fee: 10, days: [1, 3], returns: 'Free 14-day returns', rating: 4.4, style: 'dayfirst', saleChance: 0.4 },
    { name: 'Ounass', domain: 'ounass.ae', bias: 1.05, days: [1, 2], returns: 'Free returns', rating: 4.6, style: 'get', saleChance: 0.2 },
    { name: '6thStreet', domain: '6thstreet.com', bias: 0.97, freeOver: 99, fee: 10, days: [2, 4], returns: '14-day returns', rating: 4.2, style: 'dayfirst', saleChance: 0.45 },
    { name: 'Amazon.ae', domain: 'amazon.ae', bias: 0.95, days: [1, 2], returns: '15-day returns', rating: 4.3, style: 'get', saleChance: 0.35 },
    { name: 'noon', domain: 'noon.com', bias: 0.93, freeOver: 100, fee: 10, days: [1, 2], returns: '15-day returns', rating: 4.1, style: 'get', saleChance: 0.5 },
    { name: "Bloomingdale's UAE", domain: 'bloomingdales.ae', bias: 1.04, days: [2, 4], returns: '14-day returns', rating: 4.5, style: 'dayfirst', saleChance: 0.2 },
    { name: 'Level Shoes', domain: 'levelshoes.com', bias: 1.03, days: [1, 3], returns: 'Free returns', rating: 4.6, style: 'dayfirst', saleChance: 0.2, cats: ['sneaker', 'boot', 'heel'] },
    { name: 'Farfetch', domain: 'farfetch.com', bias: 1, fee: 40, days: [4, 8], returns: 'Free 14-day returns', rating: 4.3, style: 'range', saleChance: 0.3 },
  ],
  IN: [
    { name: 'Myntra', domain: 'myntra.com', bias: 0.95, freeOver: 799, fee: 99, days: [3, 6], returns: '14-day returns', rating: 4.3, style: 'dayfirst', saleChance: 0.6 },
    { name: 'AJIO', domain: 'ajio.com', bias: 0.93, freeOver: 999, fee: 99, days: [4, 7], returns: '15-day returns', rating: 4.1, style: 'dayfirst', saleChance: 0.6 },
    { name: 'Tata CLiQ Luxury', domain: 'luxury.tatacliq.com', bias: 1.02, days: [4, 7], returns: '15-day returns', rating: 4.2, style: 'dayfirst', saleChance: 0.25 },
    { name: 'Amazon.in', domain: 'amazon.in', bias: 0.94, days: [2, 4], returns: '10-day returns', rating: 4.3, style: 'get', saleChance: 0.45 },
    { name: 'Flipkart', domain: 'flipkart.com', bias: 0.9, freeOver: 499, fee: 40, days: [3, 5], returns: '10-day returns', rating: 4.0, style: 'get', saleChance: 0.6 },
    { name: 'Nykaa Fashion', domain: 'nykaafashion.com', bias: 0.98, freeOver: 1499, fee: 99, days: [4, 7], returns: '15-day returns', rating: 4.2, style: 'dayfirst', saleChance: 0.4 },
    { name: 'Shoppers Stop', domain: 'shoppersstop.com', bias: 1, days: [4, 8], returns: '15-day returns', rating: 4.0, style: 'dayfirst', saleChance: 0.3 },
  ],
};

// ---------- price helpers ----------

const FX: Record<CountryCode, number> = { US: 1, GB: 0.8, AE: 3.85, IN: 86 };

function nicePrice(value: number, country: CountryCode): number {
  if (country === 'US' || country === 'GB') {
    if (value < 200) return Math.max(9.99, Math.round(value) - 0.01);
    return Math.round(value / 5) * 5;
  }
  if (country === 'AE') return value < 100 ? Math.round(value) : Math.round(value / 5) * 5;
  if (value < 1000) return Math.max(99, Math.round(value / 10) * 10 - 1);
  return Math.round(value / 100) * 100 - 1;
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (/^\d/.test(w) || w.length <= 2 && /^[a-z]+$/.test(w) && ['of', 'in', 'by', 'to'].includes(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

// ---------- catalog ----------

interface DemoOffer {
  store: DemoStore;
  price: number;
  original?: number;
  shipping: number; // 0 = free
  minDays: number;
  maxDays: number;
  rating: number;
  reviews: number;
  inflated?: boolean;
}

export interface DemoProduct {
  pid: string;
  title: string;
  brand?: string;
  category: DemoCategory;
  color: string;
  listPrice: number;
  rating: number;
  reviews: number;
  offers: DemoOffer[];
  exact: boolean;
}

function brandStore(brand: string, country: CountryCode): DemoStore {
  const slug = normalize(brand).replace(/\s+/g, '');
  return {
    name: country === 'US' ? brand : `${brand} ${COUNTRIES[country].short}`,
    domain: `${slug}.com`,
    bias: 1,
    days: country === 'US' || country === 'GB' ? [2, 4] : [3, 5],
    returns: country === 'US' ? 'Free 30-day returns' : country === 'GB' ? '28-day returns' : '14-day returns',
    rating: 4.6,
    style: country === 'US' ? 'by' : 'dayfirst',
    saleChance: 0.3,
  };
}

/** Builds the full demo catalog for a search: the searched item, variants and similar items. */
export function demoCatalog(query: string, country: CountryCode): DemoProduct[] {
  const q = query.trim().replace(/\s+/g, ' ');
  const category = categoryOf(q);
  const brand = detectBrand(q);
  const r = rng(seedOf(`${country}|${normalize(q)}`));
  const [lo, hi] = BASE_USD[category];
  const brandText = normalize(brand ?? q);
  const multiplier = LUXURY.test(brandText) ? 6 : PREMIUM.test(brandText) ? 1.4 : 1;
  const basePrice = between(r, lo, hi) * multiplier;

  let mainTitle = titleCase(q);
  if (brand) {
    // Use the brand's proper spelling ("levis" -> "Levi's", "rayban" -> "Ray-Ban").
    const words = mainTitle.split(' ');
    for (let k = Math.min(4, words.length); k >= 1; k--) {
      if (normalize(words.slice(0, k).join(' ')).replace(/\s+/g, '') === normalize(brand).replace(/\s+/g, '')) {
        mainTitle = [brand, ...words.slice(k)].join(' ');
        break;
      }
    }
  }
  if (NOUN[category] && !new RegExp(NOUN[category].split(' ').pop() ?? '', 'i').test(mainTitle) && category !== 'other') {
    mainTitle = `${mainTitle} ${NOUN[category]}`;
  }

  const colors = [...COLORS[category]].sort(() => r() - 0.5);
  const specs: { title: string; brand?: string; factor: number; exact: boolean }[] = [
    { title: `${mainTitle} in ${colors[0]}`, brand, factor: 1, exact: true },
    { title: `${mainTitle} in ${colors[1]}`, brand, factor: between(r, 0.98, 1.06), exact: true },
  ];
  if (colors[2]) specs.push({ title: `${mainTitle} in ${colors[2]}`, brand, factor: between(r, 0.94, 1.04), exact: true });
  const similar = SIMILAR[category].filter((s) => !normalize(s).includes(brandText) || !brand).sort(() => r() - 0.5).slice(0, 5);
  for (const s of similar) {
    const [b, model] = s.split('|');
    const sMult = LUXURY.test(normalize(b)) ? 6 : PREMIUM.test(normalize(b)) ? 1.4 : 1;
    const sPrice = between(r, lo, hi) * sMult;
    specs.push({ title: `${b} ${model}`, brand: b, factor: sPrice / basePrice, exact: false });
  }

  const stores = STORES[country];
  return specs.map((spec, i) => {
    const pr = rng(seedOf(`${country}|${normalize(q)}|${i}`));
    const cat = categoryOf(spec.title);
    const listUsd = basePrice * spec.factor;
    const listPrice = nicePrice(listUsd * FX[country], country);
    const pool = stores.filter((s) => !s.cats || s.cats.includes(cat)).sort(() => pr() - 0.5);
    const count = 3 + Math.floor(pr() * Math.min(5, pool.length - 2));
    const chosen = pool.slice(0, count);
    if (spec.brand && pr() < 0.75) chosen.unshift(brandStore(spec.brand, country));

    const offers: DemoOffer[] = chosen.map((store, j) => {
      const sr = rng(seedOf(`${country}|${normalize(q)}|${i}|${store.name}`));
      let price = nicePrice(listPrice * store.bias * between(sr, 0.97, 1.03), country);
      let original: number | undefined;
      if (sr() < store.saleChance) {
        original = price;
        price = nicePrice(price * between(sr, 0.7, 0.88), country);
      }
      const shipping = store.freeOver == null && store.fee == null ? 0 : store.freeOver != null && price >= store.freeOver ? 0 : store.fee ?? 0;
      const minDays = store.days[0] + (sr() < 0.3 ? 1 : 0);
      const maxDays = Math.max(minDays, store.days[1] + (sr() < 0.3 ? 1 : 0));
      return {
        store,
        price,
        original,
        shipping,
        minDays,
        maxDays,
        rating: Math.round(between(sr, 3.9, 4.9) * 10) / 10,
        reviews: Math.round(between(sr, 15, 900)),
      };
    });
    // One marketplace seller advertises an inflated "was" price, to show the fake-discount check.
    const market = offers.find((o) => /seller/i.test(o.store.name));
    if (market) {
      const typical = offers.map((o) => o.price).sort((a, b) => a - b)[Math.floor(offers.length / 2)];
      market.price = nicePrice(typical * 0.99, country);
      market.original = nicePrice(typical * 1.75, country);
      market.inflated = true;
    }
    return {
      pid: String(1_000_000_000 + (seedOf(`${country}|${spec.title}`) % 8_999_999_999)),
      title: spec.title,
      brand: spec.brand,
      category: cat,
      color: spec.title.split(' in ').pop() ?? '',
      listPrice,
      rating: Math.round(between(pr, 4.1, 4.8) * 10) / 10,
      reviews: Math.round(between(pr, 40, 6500)),
      offers,
      exact: spec.exact,
    };
  });
}

// ---------- text Google would show ----------

function weekdayName(day: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekdayOf(day)];
}

function deliveryNote(offer: DemoOffer, today: number, country: CountryCode): string {
  const cfg = COUNTRIES[country];
  const fee = offer.shipping === 0 ? null : formatMoney(offer.shipping, cfg.currency);
  const min = today + offer.minDays;
  const max = today + offer.maxDays;
  switch (offer.store.style) {
    case 'get':
      return offer.maxDays <= 6
        ? `Get it by ${weekdayName(max)} (${fee ?? 'Free'})`
        : `Get it by ${formatDay(isoFromDay(max), 'en-US')} (${fee ?? 'Free'})`;
    case 'range': {
      const a = formatDay(isoFromDay(min), 'en-US', false);
      const b = formatDay(isoFromDay(max), 'en-US', false);
      const sameMonth = a.split(' ')[0] === b.split(' ')[0];
      const range = sameMonth ? `${a} - ${b.split(' ')[1]}` : `${a} - ${b}`;
      return fee ? `${fee} delivery between ${range}` : `Free delivery between ${range}`;
    }
    case 'dayfirst': {
      const d = formatDay(isoFromDay(max), 'en-GB');
      return fee ? `${fee} delivery by ${d}` : `Free delivery by ${d}`;
    }
    default:
      return offer.maxDays <= 6
        ? `${fee ? `${fee} delivery` : 'Free delivery'} by ${weekdayName(max)}`
        : `${fee ? `${fee} delivery` : 'Free delivery'} by ${formatDay(isoFromDay(max), 'en-US')}`;
  }
}

export function demoImage(category: DemoCategory, color: string, seed = 0): string {
  return `/api/demo-image?c=${category}&t=${encodeURIComponent(color.toLowerCase())}&s=${seed % 5}`;
}

function toItem(p: DemoProduct, o: DemoOffer, today: number, country: CountryCode, forProductPage: boolean): ProviderItem {
  const notes = forProductPage
    ? ['In stock online', deliveryNote(o, today, country), o.store.returns]
    : [deliveryNote(o, today, country)];
  return {
    source: 'demo',
    title: p.title,
    store: o.store.name,
    storeLogo: `https://www.google.com/s2/favicons?domain=${o.store.domain}&sz=64`,
    link: `https://www.${o.store.domain}/`,
    image: demoImage(p.category, p.color, Number(p.pid.slice(-1))),
    price: o.price,
    originalPrice: o.original,
    rating: forProductPage ? o.store.rating : p.rating,
    reviews: forProductPage ? o.reviews : p.reviews,
    notes,
    productId: p.pid,
    pageToken: `demo:${p.pid}`,
    multipleSources: p.offers.length > 1,
  };
}

export function demoSearch(query: string, loc: ResolvedLocation, now = new Date()): ProviderSearchResult {
  const today = todayIn(loc.timeZone, now);
  const catalog = demoCatalog(query, loc.country);
  const items: ProviderItem[] = [];
  catalog.forEach((p, i) => {
    // Google's results show a few stores per product, not all of them.
    const shown = p.offers.slice(0, i < 3 ? Math.min(3, p.offers.length) : 1);
    for (const o of shown) items.push(toItem(p, o, today, loc.country, false));
  });
  return { items, sources: ['Demo data'], notices: [] };
}

export function demoProduct(ref: ProductRef, loc: ResolvedLocation, now = new Date()): ProviderProductResult | null {
  const today = todayIn(loc.timeZone, now);
  const catalog = demoCatalog(ref.q, loc.country);
  const product = catalog.find((p) => p.pid === ref.pid) ?? catalog.find((p) => p.title === ref.title);
  if (!product) return null;
  return {
    details: {
      title: product.title,
      brand: product.brand,
      images: [0, 1, 2].map((s) => demoImage(product.category, product.color, s)),
      rating: product.rating,
      reviews: product.reviews,
      description: `Demo listing for "${product.title}". Prices, stores and delivery dates on this page are sample data so you can try ${'the comparison'} before live data is connected.`,
    },
    items: product.offers.map((o) => toItem(product, o, today, loc.country, true)),
    notices: [],
  };
}

/** 90 days of believable price history ending at today's lowest price. */
export function demoHistory(productKey: string, currentLow: number, country: CountryCode, now = new Date()): HistoryPoint[] {
  const r = rng(seedOf(`history|${productKey}`));
  const today = todayIn(COUNTRIES[country].defaultTimeZone, now);
  const days = 90;
  const points: HistoryPoint[] = [];
  const typical = currentLow * between(r, 1.02, 1.12);
  const saleStart = Math.floor(between(r, 20, 60));
  const saleLength = Math.floor(between(r, 4, 10));
  for (let i = days; i >= 1; i--) {
    const t = days - i;
    let value = typical * (1 + 0.035 * Math.sin(t / 8) + (r() - 0.5) * 0.02);
    if (t >= saleStart && t < saleStart + saleLength) value *= between(r, 0.8, 0.86);
    points.push({ date: isoFromDay(today - i), low: round2(nicePrice(value, country)) });
  }
  points.push({ date: isoFromDay(today), low: currentLow });
  return points;
}
