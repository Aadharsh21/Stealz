import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categorize, departmentOf, onShelf } from '../lib/category';

const type = (title: string) => {
  const c = categorize(title);
  return c ? `${c.group}/${c.type}` : null;
};

test('categories read the noun that says what the item is', () => {
  assert.equal(type("Women's Cotton T-Shirt Dress"), 'clothing/Dresses');
  assert.equal(type("Men's Slim Fit Dress Shirt"), 'clothing/Shirts');
  assert.equal(type('Hugo Boss Slim Fit Suit Jacket'), 'clothing/Suits & Blazers');
  assert.equal(type('Patagonia Better Sweater Fleece Jacket'), 'clothing/Jackets & Coats');
  assert.equal(type('Short Sleeve Linen Shirt'), 'clothing/Shirts');
  assert.equal(type('Lululemon Pace Breaker Lined Short 7"'), 'clothing/Shorts');
  assert.equal(type('Polo Ralph Lauren Cable-Knit Cotton Sweater'), 'clothing/Sweaters & Knitwear');
  assert.equal(type('Converse Chuck Taylor All Star High Top'), 'shoes/Sneakers');
  assert.equal(type("Nike Dunk Low Retro Men's Shoes"), 'shoes/Sneakers');
  assert.equal(type("Nike Air Force 1 '07"), 'shoes/Sneakers');
  assert.equal(type('Coach Tabby Shoulder Bag 26 in Signature Canvas'), 'bags/Bags');
  assert.equal(type('Leather Belt for Jeans'), 'accessories/Belts');
  assert.equal(type('Coach Bag Charm'), 'accessories/Keychains & Bag charms');
  assert.equal(type('Carhartt Acrylic Watch Hat'), 'accessories/Hats & Caps');
  assert.equal(type('Fossil Grant Chronograph Watch'), 'jewelry/Watches');
  assert.equal(type('Ladies Kurta Set'), 'clothing/Traditional wear');
  assert.equal(type("Women's Swimming Costume"), 'clothing/Swimwear');
  assert.equal(type('Costume Jewelry Earrings'), 'jewelry/Jewelry');
  assert.equal(type('Free People We The Free'), null);
});

test('things that are not clothing are recognized', () => {
  assert.equal(type('Gucci Bloom Eau de Parfum Spray 3.3 oz'), 'beauty/Fragrance');
  assert.equal(type('Marc Jacobs Daisy 100 ml'), 'beauty/Fragrance');
  for (const title of [
    'Jewelry Box Organizer for Women',
    "Simplicity Sewing Pattern 8823 Misses' Dress",
    'Halloween Witch Costume Dress for Women',
    'Dog Sweater for Small Dogs',
    'The Art of Fashion Design Book',
    'Velvet Hangers 50 Pack',
    'Shoe Horn Long Handle',
    'Nordstrom Gift Card',
  ]) {
    assert.equal(categorize(title)?.group, 'other', title);
  }
});

test('departments come from the title, without tripping on colors and styles', () => {
  assert.equal(departmentOf("Girls' Floral Dress (Little Big Kid)"), 'kids');
  assert.equal(departmentOf("Toddler Boys' Puffer Jacket 3T"), 'kids');
  assert.equal(departmentOf("Women's Ribbed Tank Top"), 'women');
  assert.equal(departmentOf("Levi's 501 Original Fit Men's Jeans"), 'men');
  assert.equal(departmentOf("Men's/Women's Classic Clog"), 'unisex');
  assert.equal(departmentOf('Baby Pink Satin Midi Dress'), undefined);
  assert.equal(departmentOf('Boy Shorts Underwear 3 Pack'), undefined);
  assert.equal(departmentOf('Spider-Man Graphic Tee'), undefined);
  assert.equal(departmentOf('Kid Leather Gloves'), undefined);
});

test('a shelf keeps only its own categories and department', () => {
  const women = { groups: ['clothing'], department: 'women' } as const;
  assert.ok(onShelf('Zara Satin Midi Dress', women));
  assert.ok(onShelf("Women's Ribbed Tank Top", women));
  assert.ok(!onShelf("Men's Slim Fit Dress Shirt", women));
  assert.ok(!onShelf("Girls' Floral Dress", women));
  assert.ok(!onShelf('Gucci Bloom Eau de Parfum', women));
  assert.ok(!onShelf('Coach Tabby Shoulder Bag 26', women));
  assert.ok(!onShelf('Gucci GG Marmont', women), 'titles that say nothing about the item stay off');

  const sneakers = { groups: ['shoes'], types: ['Sneakers', 'Shoes'] } as const;
  assert.ok(onShelf('Adidas Samba OG', sneakers));
  assert.ok(!onShelf('Dr. Martens 1460 Smooth Leather Boots', sneakers));
});

test('home and sale clothing tabs keep to clothing at everyday prices', async () => {
  const { shelfFilter, shelfPrice, shelfKey } = await import('../lib/shelves');
  const women = shelfFilter('women', 'US');
  assert.ok(women('Reformation Juliette Linen Midi Dress', 248));
  assert.ok(!women('Max Mara Madame Wool Coat', 3290), 'runway prices are out');
  assert.ok(!women('Gucci Bloom Eau de Parfum', 120), 'perfume is not clothing');
  assert.ok(!women("Men's Oxford Shirt", 98));
  assert.ok(!women('Basic Tee', 6), 'too cheap to be a real pick');
  assert.ok(shelfFilter('women', 'IN')('Libas Women Kurta Set', 1899));
  assert.ok(!shelfFilter('women', 'IN')('Libas Women Kurta Set', 18990));
  assert.ok(shelfFilter('bags', 'US')('Gucci Jackie 1961 Shoulder Bag', 3100), 'bags keep designer prices');
  assert.ok(!shelfFilter('bags', 'US')('Rimowa Essential Cabin Suitcase', 900));
  assert.deepEqual(shelfPrice('men', 'GB'), { min: 15, max: 250 });
  assert.equal(shelfPrice('sneakers', 'US'), undefined);
  assert.equal(shelfKey('designer handbags', 'bags', 'US'), 'designer handbags', 'tabs without a range keep their saved picks');
});

test('picks and sale items skip what is off the shelf', async () => {
  const { choosePicks } = await import('../lib/pick-select');
  const { chooseSaleItems } = await import('../lib/sale-select');
  const { shelfFilter } = await import('../lib/shelves');
  const listing = (price: number, extra: Record<string, unknown> = {}) =>
    ({ store: 'Nordstrom', price, total: price, isMarketplace: false, productKey: 'k', match: 1, ref: 'r', ...extra }) as never;
  const group = (key: string, title: string, price: number, extra: Record<string, unknown> = {}) =>
    ({ key, title, image: `https://img/${key}.jpg`, listings: [listing(price, extra)], storeCount: 1, ref: key }) as never;
  const groups = [
    group('dress', "Ganni Women's Printed Midi Dress", 245),
    group('coat', 'The Row Women\'s Cashmere Coat', 4200),
    group('perfume', 'Chanel Coco Mademoiselle Eau de Parfum', 165),
    group('bag', 'Coach Tabby Shoulder Bag 26', 450),
    group('jeans', "Madewell Women's Perfect Vintage Jean", 138),
  ];
  const fits = shelfFilter('women', 'US');
  assert.deepEqual(choosePicks(groups, 'USD', fits).map((p) => p.ref), ['dress', 'jeans']);
  const onSale = groups.map((g) => ({ ...(g as object), listings: (g as { listings: object[] }).listings.map((l) => ({ ...l, originalPrice: 500 })) })) as never[];
  assert.deepEqual(chooseSaleItems(onSale, 'USD', { fits }).map((i) => i.ref).sort(), ['dress', 'jeans']);
});

test('search filters: category, department and price ranges like a store', async () => {
  const { buildFacets, filterGroups, DEFAULT_FILTERS } = await import('../lib/filters');
  const listing = (title: string, total: number, extra: Record<string, unknown> = {}) => {
    const c = categorize(title);
    return {
      id: title, title, store: 'Nordstrom', price: total, total, shipping: { free: true }, delivery: { maxDays: 3 },
      match: 1, tags: [], category: c?.type, categoryGroup: c?.group, department: departmentOf(title), ...extra,
    } as never;
  };
  const group = (title: string, total: number) =>
    ({ key: title, title, listings: [listing(title, total)], bestTotal: total, maxTotal: total, storeCount: 1, match: 1, ref: title }) as never;
  const groups = [
    group("Women's Satin Midi Dress", 89),
    group("Women's Linen Wrap Dress", 140),
    group("Men's Oxford Shirt", 65),
    group("Unisex Fleece Hoodie", 45),
    group("Women's Wide-Leg Jeans", 98),
    group("Women's Wool Coat", 420),
  ];
  const facets = buildFacets(groups, 'USD');
  assert.deepEqual(facets.categories[0], { value: 'Dresses', count: 2 });
  assert.deepEqual(facets.departments.map((d) => d.value), ['women', 'men', 'unisex']);
  assert.ok(facets.prices.length >= 2);
  assert.match(facets.prices[0].label, /^Under \$\d+$/);
  assert.match(facets.prices[facets.prices.length - 1].label, /and up$/);

  const dresses = filterGroups(groups, { ...DEFAULT_FILTERS, categories: ['Dresses'] }, 'relevance');
  assert.equal(dresses.length, 2);
  const women = filterGroups(groups, { ...DEFAULT_FILTERS, departments: ['women'] }, 'relevance');
  assert.ok(women.some((g) => g.title.startsWith('Unisex')), 'unisex items count as women too');
  assert.ok(!women.some((g) => g.title.startsWith("Men's")));
});
