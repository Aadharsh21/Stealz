// Text helpers: normalizing titles, matching them to a search, product keys and brand detection.

export function normalize(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const FILLER = new Set([
  'the', 'a', 'an', 'and', 'for', 'with', 'in', 'of', 'by', 'to', 'on', 'at', 'from', 'or',
  'new', 'brand', 'authentic', 'genuine', 'original', 'official', 'free', 'shipping', 'delivery',
  'sale', 'buy', 'online', 'best', 'price', 'prices', 'cheap', 'cheapest', 'discount', 'deal', 'deals',
  'shop', 'store', 'item', 'items', 'product', 'products', 'nwt', 'bnwt', 'tags', 'tag', 'w',
]);

const SIZE_TOKEN = /^(xxs|xs|s|m|l|xl|xxl|xxxl|[2-5]xl|os|one|size|\d{2}x\d{2}|w\d{2}|l\d{2}|eu\d{2}|uk\d{1,2}|us\d{1,2})$/;

const GENDER: Record<string, 'women' | 'men'> = {
  women: 'women', womens: 'women', woman: 'women', ladies: 'women', lady: 'women', female: 'women',
  men: 'men', mens: 'men', man: 'men', male: 'men', gents: 'men',
};

/** Very small stemmer so "bags" matches "bag" and "watches" matches "watch". */
export function stem(token: string): string {
  if (token.length > 4 && /(ches|shes|sses|xes|zes)$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

export function tokens(input: string): string[] {
  return normalize(input)
    .split(' ')
    .filter(Boolean)
    .map((t) => GENDER[t] ?? t)
    .map(stem);
}

/** Tokens that identify a product (no filler words or clothing sizes). */
export function keyTokens(input: string): string[] {
  return tokens(input).filter((t) => !FILLER.has(t) && !SIZE_TOKEN.test(t));
}

/**
 * Category and color words count half as much as brand and model names, so "Swarovski Maira
 * pink necklace" isn't a close match for "Swarovski Millenia necklace pink".
 */
const GENERIC = new Set([
  'bag', 'tote', 'handbag', 'purse', 'crossbody', 'shoulder', 'clutch', 'backpack', 'wallet', 'satchel',
  'necklace', 'bracelet', 'ring', 'earring', 'pendant', 'jewelry', 'jewellery', 'watch', 'sunglass',
  'shoe', 'sneaker', 'trainer', 'boot', 'sandal', 'heel', 'loafer', 'jacket', 'coat', 'dress', 'shirt',
  'tshirt', 'tee', 'jean', 'pant', 'trouser', 'short', 'skirt', 'sweater', 'hoodie', 'top', 'belt', 'hat',
  'cap', 'scarf', 'leather', 'black', 'white', 'ivory', 'cream', 'grey', 'gray', 'beige', 'tan', 'brown',
  'red', 'pink', 'purple', 'lilac', 'blue', 'navy', 'green', 'yellow', 'orange', 'gold', 'silver', 'rose',
]);

/** Listings scoring at least this are treated as the item the shopper searched for. */
export const CLOSE_MATCH = 0.8;

/** How well a listing title matches the search, from 0 to 1. */
export function matchScore(query: string, title: string): number {
  const q = keyTokens(query);
  if (q.length === 0) return 1;
  const titleSet = new Set(tokens(title));
  const titleJoined = normalize(title).replace(/\s+/g, '');
  let hit = 0;
  let total = 0;
  for (const t of q) {
    if (t === 'women' || t === 'men') {
      const other = t === 'women' ? 'men' : 'women';
      total += 0.5;
      if (titleSet.has(t) || !titleSet.has(other)) hit += 0.5;
      continue;
    }
    const weight = GENERIC.has(t) ? 0.5 : 1;
    total += weight;
    // "air force 1" vs "airforce1", "ray ban" vs "rayban"
    if (titleSet.has(t) || (t.length >= 4 && titleJoined.includes(t))) hit += weight;
  }
  return total === 0 ? 1 : Math.round((hit / total) * 100) / 100;
}

export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

/** Short stable hash (FNV-1a, base 36). */
export function hash32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** Stable id for a product, used for grouping and price history. */
export function productKey(country: string, title: string, googleProductId?: string): string {
  if (googleProductId && /^\d{5,}$/.test(googleProductId)) return `${country}:g:${googleProductId}`;
  const sig = [...new Set(keyTokens(title))].sort().join(' ');
  return `${country}:t:${hash32(sig || normalize(title))}`;
}

// Brands people commonly search for in clothing, bags and accessories (US, UAE, India).
const BRANDS = [
  'Coach', 'Coach Outlet', 'Michael Kors', 'MICHAEL Michael Kors', 'Kate Spade', 'Kate Spade New York', 'Tory Burch',
  'Marc Jacobs', 'Longchamp', 'Furla', 'MCM', 'Guess', 'Fossil', 'Steve Madden', 'Aldo', 'Charles & Keith',
  'Pedro', 'Calvin Klein', 'Tommy Hilfiger', 'Ralph Lauren', 'Polo Ralph Lauren', 'Lauren Ralph Lauren',
  'Lacoste', 'Hugo Boss', 'BOSS', 'Armani Exchange', 'Emporio Armani', 'Giorgio Armani', 'Diesel', "Levi's",
  'Nike', 'Jordan', 'Adidas', 'Puma', 'New Balance', 'Converse', 'Vans', 'Under Armour', 'Lululemon',
  'The North Face', 'Patagonia', 'Columbia', "Arc'teryx", 'Carhartt', 'Champion', 'Reebok', 'Asics', 'Hoka',
  'Salomon', 'On Running', 'Skechers', 'Crocs', 'Birkenstock', 'Dr. Martens', 'UGG', 'Timberland', 'Clarks',
  'Ray-Ban', 'Oakley', 'Persol', 'Chanel', 'Hermès', 'Goyard', 'The Row', 'Prada', 'Miu Miu', 'Gucci', 'Louis Vuitton', 'Saint Laurent', 'YSL',
  'Balenciaga', 'Bottega Veneta', 'Burberry', 'Fendi', 'Dior', 'Christian Dior', 'Celine', 'Loewe',
  'Valentino', 'Givenchy', 'Versace', 'Dolce & Gabbana', 'Chloé', 'Jacquemus', 'Mulberry', 'Moncler',
  'Canada Goose', 'Stone Island', 'Off-White', 'Golden Goose', 'Alexander McQueen', 'Jimmy Choo',
  'Stuart Weitzman', 'Sam Edelman', 'Christian Louboutin', 'Zara', 'H&M', 'Uniqlo', 'Mango', 'Gap',
  'Banana Republic', 'J.Crew', 'Abercrombie & Fitch', 'Abercrombie', 'American Eagle', 'Hollister', 'Aritzia',
  'Free People', 'Anthropologie', 'Madewell', 'Everlane', 'Victoria\'s Secret', 'Swarovski', 'Pandora',
  'Tiffany & Co.', 'Cartier', 'Casio', 'G-Shock', 'Seiko', 'Citizen', 'Tissot', 'Daniel Wellington',
  'Titan', 'Fastrack', 'Sonata', 'Allen Solly', 'Van Heusen', 'Peter England', 'Louis Philippe', 'Raymond',
  'Manyavar', 'Fabindia', 'Biba', 'W for Woman', 'Global Desi', 'Hidesign', 'Baggit', 'Lavie', 'Caprese',
  'Da Milano', 'Wildcraft', 'Skybags', 'American Tourister', 'Samsonite', 'Tumi', 'Herschel', 'JanSport',
  'Fjallraven', 'Rimowa', 'Roadster', 'HRX', 'Mochi', 'Bata', 'Red Tape', 'Woodland', 'Campus',
  'Max', 'Splash', 'Styli', 'Namshi', 'Nautica', 'Gant', 'Fred Perry', 'Ted Baker', 'Hackett',
  'Massimo Dutti', 'Bershka', 'Pull&Bear', 'Stradivarius', 'Victoria Beckham', 'Coperni', 'Telfar',
];

const BRAND_INDEX = BRANDS.map((name) => ({ name, norm: normalize(name) }))
  .filter((b) => b.norm.length >= 2)
  .sort((a, b) => b.norm.length - a.norm.length);

/** Finds a known brand in a title ("Coach Tabby Shoulder Bag 26" -> "Coach"). */
export function detectBrand(title: string): string | undefined {
  const t = ` ${normalize(title)} `;
  for (const b of BRAND_INDEX) {
    if (b.norm.length < 4 && !t.startsWith(` ${b.norm} `)) continue; // short brands only at the start
    if (t.includes(` ${b.norm} `)) return b.name;
  }
  return undefined;
}

export function truncate(input: string, max: number): string {
  return input.length <= max ? input : `${input.slice(0, max - 1).trimEnd()}…`;
}

/** Collapses whitespace and strips HTML entities that sometimes leak into titles. */
export function cleanTitle(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
