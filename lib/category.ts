// Sorts a listing into the kind of category tree big fashion stores use (Nordstrom, ASOS,
// Zalando, Myntra): Clothing > Dresses, Shoes > Sneakers, Bags, Accessories and so on, plus the
// department (women, men, kids). Google Shopping doesn't say what a product is, so this reads
// the title. It powers the category filters on search results and keeps the home page and
// sale tabs on topic. Pure logic, easy to test.

import { detectBrand, normalize } from './text';

export type CategoryGroup = 'clothing' | 'shoes' | 'bags' | 'accessories' | 'jewelry' | 'beauty' | 'other';
export type Department = 'women' | 'men' | 'kids' | 'unisex';

export interface Category {
  group: CategoryGroup;
  /** Shopper-facing name, e.g. "Dresses" or "Jackets & Coats". */
  type: string;
}

/** Groups that count as fashion. Anything else is left out of fashion searches. */
export const FASHION_GROUPS: readonly CategoryGroup[] = ['clothing', 'shoes', 'bags', 'accessories', 'jewelry'];

type Rule = [pattern: string, group: CategoryGroup, type: string];

// Word patterns, matched on normalized titles (lowercase, punctuation turned into spaces, so
// "T-Shirt" reads "t shirt"). The match that ends last wins, because the word that says what a
// thing is comes last: a "shirt dress" is a dress and a "dress shirt" is a shirt. On a tie the
// longer match wins, so "running shoes" are sneakers and "suit jacket" is tailoring.
const RULES: Rule[] = [
  // ---------- clothing ----------
  ['dress(es)?|gowns?|sundress(es)?|kaftans?|caftans?|frocks?', 'clothing', 'Dresses'],
  ['tops?|blouses?|camis?|camisoles?|tanks?|tank tops?|tunics?|body ?suits?|longsleeves?|long sleeve tops?|crop tops?|halter tops?|tube tops?|corsets?|bustiers?|kimonos?|shells?', 'clothing', 'Tops'],
  ['t ?shirts?|tees?|tshirts?|graphic tees?|long sleeve tees?', 'clothing', 'T-shirts'],
  ['shirts?|button (down|up)s?|polos?|polo shirts?|henleys?|flannels?|overshirts?|oxford shirts?', 'clothing', 'Shirts'],
  ['sweaters?|jumpers?|cardigans?|cardis?|pullovers?|turtlenecks?|rollnecks?|roll necks?|crews?|knits?|knitwear|sweater vests?|crewnecks?|crew necks?|mock necks?', 'clothing', 'Sweaters & Knitwear'],
  ['hoodies?|hoody|hooded sweatshirts?|sweatshirts?|fleeces?|quarter zips?|half zips?|1 4 zips?|1 2 zips?|zip ups?|zip hoodies?', 'clothing', 'Hoodies & Sweatshirts'],
  [
    'jackets?|coats?|raincoats?|overcoats?|topcoats?|parkas?|puffers?|anoraks?|windbreakers?|trenches|trench( coats?)?|peacoats?|pea coats?|bombers?|shackets?|gilets?|vests?|ponchos?|capes?|outerwear|snow ?suits?',
    'clothing',
    'Jackets & Coats',
  ],
  ['suits?|blazers?|sports? coats?|suit jackets?|tuxedos?|tuxes|waistcoats?|suit vests?|dinner jackets?|pant ?suits?|trouser suits?', 'clothing', 'Suits & Blazers'],
  ['jeans?|jeggings?', 'clothing', 'Jeans'],
  ['pants?|trousers?|chinos?|slacks|joggers?|sweat ?pants?|leggings?|cargos?|culottes?|palazzos?|track ?pants?', 'clothing', 'Pants & Trousers'],
  ['shorts|short(?= \\d)|bermudas?|bike shorts|biker shorts', 'clothing', 'Shorts'],
  ['skirts?|skorts?', 'clothing', 'Skirts'],
  ['jump ?suits?|rompers?|playsuits?|overalls|dungarees|onesies?|boiler ?suits?|unitards?', 'clothing', 'Jumpsuits & Rompers'],
  ['sports? bras?|track ?suits?|activewear|athleisure|running tights?|yoga pants?|base layers?|compression (shirts?|tights?)', 'clothing', 'Activewear'],
  [
    'swim ?suits?|swimwear|bikinis?|bikini (tops?|bottoms?|sets?)|tankinis?|monokinis?|swim (trunks?|shorts?|briefs?|tops?|bottoms?)|board ?shorts?|rash ?guards?|wet ?suits?|cover ups?|coverups?|bathing suits?|sarongs?',
    'clothing',
    'Swimwear',
  ],
  [
    'bras?|bralettes?|briefs?|boxers?|boxer briefs?|panties|panty|underwear|thongs?|lingerie|slips?(?! ons?(?= |$))|undershirts?|shapewear|trunks?|knickers|g strings?|chemises?|teddies|garters?',
    'clothing',
    'Lingerie & Underwear',
  ],
  [
    'pajamas?|pyjamas?|pjs?|pj sets?|nightgowns?|nighties?|nightdress(es)?|nightshirts?|robes?|bathrobes?|loungewear|lounge (sets?|pants?|shorts?)|sleepwear|sleep (shirts?|sets?|shorts?|pants?)|night suits?',
    'clothing',
    'Sleepwear & Loungewear',
  ],
  ['socks?|tights|hosiery|stockings?|leg warmers?|pantyhose', 'clothing', 'Socks & Hosiery'],
  ['co ords?|coords?|two piece sets?|2 piece sets?|3 piece sets?|matching sets?|outfit sets?', 'clothing', 'Matching sets'],
  [
    'kurtas?|kurtis?|kurta sets?|sarees?|saris?|lehengas?|lehenga cholis?|salwars?|salwar suits?|churidars?|sherwanis?|dupattas?|anarkalis?|dhotis?|abayas?|jalabiyas?|kanduras?|kandoras?|thobes?|thawbs?|dishdashas?',
    'clothing',
    'Traditional wear',
  ],
  ['clothing|clothes|apparel|outfits?|garments?|wear', 'clothing', 'Clothing'],

  // ---------- shoes ----------
  [
    'sneakers?|trainers?|running shoes?|basketball shoes?|tennis shoes?|skate shoes?|walking shoes?|athletic shoes?|training shoes?|gym shoes?|cross trainers?|high tops?|hi tops?|low tops?',
    'shoes',
    'Sneakers',
  ],
  ['boots?|booties?|bootie|chelsea boots?|ankle boots?|combat boots?|wellies|wellingtons?|rain boots?|snow boots?|hiking boots?', 'shoes', 'Boots'],
  ['sandals?|slides?|flip flops?|flipflops?|espadrilles?|pool slides?', 'shoes', 'Sandals & Slides'],
  ['heels?|pumps?|stilettos?|slingbacks?|wedges?|kitten heels?|block heels?', 'shoes', 'Heels'],
  ['flats|ballet flats?|ballerinas?|mary janes?|ballet pumps?', 'shoes', 'Flats'],
  ['mules?|clogs?', 'shoes', 'Mules & Clogs'],
  ['loafers?|moccasins?|oxfords?|derbys?|derbies|brogues?|monk straps?|dress shoes?|boat shoes?|driving shoes?', 'shoes', 'Loafers & Dress shoes'],
  ['slippers?|house shoes?', 'shoes', 'Slippers'],
  ['shoes?|footwear|slip ons?', 'shoes', 'Shoes'],

  // ---------- bags ----------
  [
    'bags?|handbags?|purses?|totes?|crossbodys?|crossbodies|cross body|satchels?|clutch(es)?|hobos?|duffels?|duffles?|weekenders?|messengers?|fanny packs?|bum bags?|pochettes?|wristlets?|minaudieres?|pouch(es)?|baguettes?|top handles?|wallet on (a )?chain|woc|briefcases?',
    'bags',
    'Bags',
  ],
  ['backpacks?|rucksacks?|daypacks?|book ?bags?', 'bags', 'Backpacks'],
  ['luggage|suitcases?|carry ons?|carryons?|garment bags?|travel bags?|duffel bags?', 'bags', 'Luggage'],

  // ---------- accessories ----------
  ['belts?|waist belts?|belt buckles?|buckles?', 'accessories', 'Belts'],
  ['hats?|caps?|beanies?|berets?|fedoras?|visors?|snapbacks?|balaclavas?|ski masks?|headwear|59fifty|9forty|9fifty', 'accessories', 'Hats & Caps'],
  ['scarf|scarves|shawls?|stoles?|pashminas?|bandanas?|bandannas?|snoods?|hijabs?|neck gaiters?|neckerchiefs?|twillys?', 'accessories', 'Scarves'],
  ['gloves?|mittens?|mitts?', 'accessories', 'Gloves'],
  ['sunglass(es)?|sun glasses|eyewear|eyeglasses|glasses|optical frames?|goggles?', 'accessories', 'Sunglasses & Eyewear'],
  [
    'wallets?|card holders?|cardholders?|card cases?|coin purses?|coin cases?|money clips?|passport (holders?|covers?|cases?)|key (holders?|pouch(es)?|cases?)|bifolds?|trifolds?|billfolds?',
    'accessories',
    'Wallets & Card holders',
  ],
  ['ties|neck ?ties?|bow ?ties?|tie|pocket squares?|cuff ?links?|tie (bars?|clips?)', 'accessories', 'Ties & Cufflinks'],
  ['headbands?|scrunchies?|scrunchy|hair (clips?|ties?|bands?|bows?|pins?|accessories|claws?|slides?)|claw clips?|barrettes?|bobby pins?|tiaras?', 'accessories', 'Hair accessories'],
  ['phone cases?|iphone cases?|airpods? cases?|phone (straps?|charms?|grips?)|laptop (sleeves?|cases?)|tech cases?', 'accessories', 'Tech accessories'],
  ['key ?chains?|key ?rings?|key fobs?|bag charms?|luggage tags?|bag straps?|shoulder straps?|replacement straps?', 'accessories', 'Keychains & Bag charms'],
  ['umbrellas?', 'accessories', 'Umbrellas'],
  ['accessories|accessory', 'accessories', 'Accessories'],

  // ---------- jewelry and watches ----------
  [
    'jewel(le)?ry|jewels?|necklaces?|bracelets?|earrings?|rings?|pendants?|bangles?|anklets?|chokers?|brooch(es)?|pins?|chains?|charms?|lockets?|hoops?|studs?|ear cuffs?|cuffs?|lariats?',
    'jewelry',
    'Jewelry',
  ],
  ['watch(es)?|smartwatch(es)?|watch (bands?|straps?)|timepieces?|chronographs?', 'jewelry', 'Watches'],

  // ---------- beauty ----------
  ['perfumes?|parfums?|fragrances?|colognes?|eau de (parfum|toilette|cologne)|edp|edt|body mists?|perfume oils?|attars?|bakhoor|oud (oils?|perfumes?)', 'beauty', 'Fragrance'],
  [
    'makeup|make up|lipsticks?|lip (gloss(es)?|balms?|liners?|oils?|kits?|sticks?)|mascaras?|eyeshadows?|eye ?liners?|concealers?|bronzers?|serums?|moisturi[sz]ers?|cleansers?|toners?|lotions?|body (washes?|lotions?|butters?|creams?|oils?)|face (creams?|masks?|wash(es)?)|sunscreens?|shampoos?|conditioners?|nail (polish(es)?|lacquers?)|skin ?care|cosmetics?|deodorants?|beauty',
    'beauty',
    'Beauty',
  ],

  // ---------- not fashion ----------
  [
    'books?|hardcovers?|paperbacks?|novels?|magazines?|posters?|art prints?|canvas prints?|wall art|stickers?|decals?|mugs?|tumblers?|water bottles?|pillows?|pillowcases?|cushions?|blankets?|towels?|bed sheets?|duvets?|comforters?|curtains?|rugs?|candles?|lamps?|vases?|ornaments?|picture frames?|toys?|dolls?|plush(ies)?|stuffed animals?|figurines?|lego|puzzles?|board games?|video games?|gift cards?|e ?gift cards?|gift certificates?|vouchers?|hangers?|mannequins?|dress forms?|sewing patterns?|fabrics?|by the yard|yarn|wallpapers?|headphones?|earbuds?|chargers?|cables?|speakers?|screen protectors?|keyboards?|laptops?|tablets?|phones?|storage (boxes?|bins?)|jewel(le)?ry (boxes?|organi[sz]ers?|stands?|trays?|holders?)|watch (boxes?|winders?|cases?|stands?)|shoe (horns?|trees?|racks?|polish(es)?|cleaners?|cleaning kits?|laces?|shine|stretchers?|deodori[sz]ers?|inserts?|organi[sz]ers?|storage|boxes?)|shoelaces?|insoles?|boot (shapers?|trees?|jacks?|trays?)|lint rollers?|(fabric|sweater) shavers?|garment steamers?|steamers?|detergents?|gift wrap|wrapping paper|gift boxes?|boxes?|organi[sz]ers?|display stands?|costumes?|cosplay|aprons?|wigs?',
    'other',
    'Other',
  ],
];

/** Names that say what an item is when the title has no category word ("Nike Air Force 1 '07"). */
const HINTS: Rule[] = [
  ['air force 1s?|af1|air max( \\d+)?|dunk (low|high|mid)|air jordan( \\d+)?|samba( og)?|gazelle|stan smith|superstar|chuck taylor|chuck 70|old skool|sk8 hi|gel \\d{3,4}|ultraboost|yeezy', 'shoes', 'Sneakers'],
  ['chelsea|1460|6 inch premium', 'shoes', 'Boots'],
  ['arizona|gizeh|mayari|oran', 'shoes', 'Sandals & Slides'],
  ['wayfarer|aviators?|clubmaster|holbrook|rb\\d{4}', 'accessories', 'Sunglasses & Eyewear'],
  ['g ?shock|eco drive|powermatic|automatic|seamaster|submariner|datejust|ga ?\\d{4}', 'jewelry', 'Watches'],
  ['neverfull|speedy|birkin|tabby|le pliage|marmont|kelly|loulou|jodie|cassette', 'bags', 'Bags'],
  ['\\d+(\\.\\d+)? ?(ml|fl oz)', 'beauty', 'Fragrance'],
];

/** Items that are never fashion, wherever the words appear (a sewing pattern for a dress). */
const NEVER_FASHION =
  /(^| )(sewing patterns?|dress forms?|mannequins?|costumes?|cosplay|for dolls?|doll (clothes|clothing|dress(es)?|outfits?|shoes)|(dog|dogs|pet|pets|puppy) (clothes|clothing|sweaters?|coats?|jackets?|hoodies?|harness(es)?|collars?|beds?|leash(es)?|raincoats?|costumes?|pajamas?)|for (dogs?|cats?|pets?|puppies)|gift cards?|e ?gift cards?|gift certificates?)( |$)/;

// Phrases rewritten first so they don't trip the rules above: a "swimming costume" is a
// swimsuit, "costume jewelry" is jewelry, and a "baby doll dress" is a women's dress.
const REWRITES: [RegExp, string][] = [
  [/(^| )(swim|swimming|bathing) costumes?( |$)/g, '$1swimsuit$3'],
  [/(^| )costume (jewel(le)?ry)( |$)/g, '$1fashion $2$4'],
  [/(^| )baby doll( |$)/g, '$1babydoll$2'],
  [/(^| )baby (pink|blue|yellow|green|lilac)( |$)/g, '$1$2$3'],
  [/(^| )kid (leather|suede|gloves?)( |$)/g, '$1$2$3'],
  [/(^| )(spider|iron|bat|super|pac|he|ant|aqua|snow) man( |$)/g, '$1$2man$3'],
];

/** Splits a pattern on its top-level "|" so the longest phrases can be tried first. */
function alternatives(pattern: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '\\') i += 1;
    else if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    else if (ch === '|' && depth === 0) {
      parts.push(pattern.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(pattern.slice(start));
  return parts;
}

// Regex alternation takes the first option that fits, not the longest, so phrases go first:
// "suit jacket" has to be tried before "suit".
const compiled = (rules: Rule[]) =>
  rules.map(([pattern, group, type]) => {
    const longestFirst = alternatives(pattern).sort((a, b) => b.length - a.length).join('|');
    return { re: new RegExp(`(^| )(?:${longestFirst})(?= |$)`, 'g'), group, type };
  });
const RULE_RES = compiled(RULES);
const HINT_RES = compiled(HINTS);

function prepare(title: string): string {
  let t = ` ${normalize(title)} `;
  const brand = detectBrand(title);
  if (brand) t = t.replace(` ${normalize(brand)} `, ' ');
  for (const [re, to] of REWRITES) t = t.replace(re, to);
  return t.replace(/\s+/g, ' ').trim();
}

/** The category whose match ends last (the longest one on a tie), or null. */
function lastMatch(text: string, rules: ReturnType<typeof compiled>): Category | null {
  let best: { end: number; length: number; category: Category } | null = null;
  for (const rule of rules) {
    rule.re.lastIndex = 0;
    for (let m = rule.re.exec(text); m; m = rule.re.exec(text)) {
      const end = m.index + m[0].length;
      const length = m[0].trim().length;
      if (!best || end > best.end || (end === best.end && length > best.length)) {
        best = { end, length, category: { group: rule.group, type: rule.type } };
      }
    }
  }
  return best?.category ?? null;
}

/** Catch-all types that a model name can make more specific. */
const GENERIC_TYPES = new Set(['Clothing', 'Shoes', 'Accessories']);

/**
 * What the item is, read from its title the way a store would file it. Words after "for",
 * "with" and "in" describe something else ("Leather Belt for Jeans", "Bag in Blush"), so the
 * part before them is read first. Null when the title doesn't say.
 */
export function categorize(title: string): Category | null {
  const text = prepare(title);
  if (!text) return null;
  if (NEVER_FASHION.test(text)) return { group: 'other', type: 'Other' };
  const cut = text.search(/ (for|with|w|in|to fit|compatible with|fits) /);
  const head = cut > 0 ? text.slice(0, cut) : text;
  const found = lastMatch(head, RULE_RES) ?? (cut > 0 ? lastMatch(text, RULE_RES) : null);
  const hint = !found || GENERIC_TYPES.has(found.type) ? lastMatch(text, HINT_RES) : null;
  // "Nike Dunk Low Men's Shoes" says shoes, and the model name says which kind.
  if (found && hint && hint.group !== found.group) return found;
  return hint ?? found;
}

const KIDS =
  /(^| )(kids?|boys|big boys?|little boys?|girls|big girls?|little girls?|toddlers?|baby|babies|infants?|newborns?|youth|child|children|childrens|tweens?|teens?|big kids?|little kids?|grade school|pre ?school|gs|ps|td|[2-7]t|\d{1,2} \d{1,2} (years?|yrs?)|\d{1,2} ?(mos?|months?)|age \d{1,2})( |$)/;
const WOMEN = /(^| )(women|womens|woman|ladies|lady|female|maternity|misses|petites?)( |$)/;
const MEN = /(^| )(men|mens|man|male|gents|gentlemen|big (and )?tall)( |$)/;
const UNISEX = /(^| )(unisex|gender neutral|all gender|genderless)( |$)/;

/** Who the item is for, when the title says. */
export function departmentOf(title: string): Department | undefined {
  const t = prepare(title);
  if (KIDS.test(t)) return 'kids';
  if (UNISEX.test(t)) return 'unisex';
  const women = WOMEN.test(t);
  const men = MEN.test(t);
  if (women && men) return 'unisex';
  if (women) return 'women';
  if (men) return 'men';
  return undefined;
}

/**
 * True when a listing is a different kind of thing from a fashion search: a book, a candle or
 * a perfume in results for "black midi dress". Bags and shoes in a clothing search stay, since
 * people often want to see them, and the category filter narrows them down.
 */
export function isOffTopic(itemGroup: CategoryGroup | undefined, queryGroup: CategoryGroup | undefined): boolean {
  if (!itemGroup || !queryGroup || itemGroup === queryGroup) return false;
  return !FASHION_GROUPS.includes(itemGroup);
}

/**
 * A set of products a page shows, the way a store's category page does: which categories
 * belong and who they're for (shelves.ts adds price ranges). Titles that don't say what the
 * item is are left out, as a store would never file them under "Dresses".
 */
export interface Shelf {
  groups: readonly CategoryGroup[];
  /** Only these types, when set (e.g. sneakers but not boots). */
  types?: readonly string[];
  /** Types left out even though their group is allowed. */
  excludeTypes?: readonly string[];
  /** Items for another department are left out; unlabeled and unisex items stay. */
  department?: Exclude<Department, 'unisex'>;
}

export function onShelf(title: string, shelf: Shelf): boolean {
  const c = categorize(title);
  if (!c || !shelf.groups.includes(c.group)) return false;
  if (shelf.types && !shelf.types.includes(c.type)) return false;
  if (shelf.excludeTypes?.includes(c.type)) return false;
  if (shelf.department) {
    const d = departmentOf(title);
    if (d && d !== 'unisex' && d !== shelf.department) return false;
  }
  return true;
}
