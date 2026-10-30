// Search suggestions shown while typing. Local and free: no API credits are used.

import type { CountryCode } from './types';
import { normalize } from './text';

const COMMON = [
  'Coach Tabby Shoulder Bag 26', 'Coach Willow Tote', 'Coach Tabby Shoulder Bag 20', 'Michael Kors Jet Set Tote',
  'Michael Kors Parker Watch', 'Kate Spade Knott Satchel', 'Tory Burch Kira Shoulder Bag', 'Marc Jacobs The Tote Bag',
  'Marc Jacobs Snapshot Camera Bag', 'Longchamp Le Pliage Large Tote', 'Prada Re-Edition 2005', 'Gucci Marmont Shoulder Bag',
  'Saint Laurent Loulou Bag', 'Charles & Keith Koa Shoulder Bag', "Levi's 501 Original Fit Jeans", "Levi's 511 Slim Jeans",
  "Levi's Trucker Jacket", "Nike Air Force 1 '07", 'Nike Dunk Low', 'Nike Air Max 90', 'Adidas Samba OG', 'Adidas Gazelle',
  'New Balance 550', 'New Balance 9060', 'Converse Chuck 70 High', 'Vans Old Skool', 'Puma Speedcat', 'Asics Gel-Kayano 14',
  'On Cloud 6', 'Hoka Clifton 9', 'Dr. Martens 1460 Boots', 'UGG Tasman Slippers', 'UGG Classic Mini Boots', 'Birkenstock Boston Clogs',
  'Ray-Ban Wayfarer Sunglasses', 'Ray-Ban Aviator Classic', 'Oakley Holbrook', 'Prada Symbole Sunglasses', 'Fossil Grant Chronograph Watch',
  'Casio G-Shock GA2100', 'Seiko 5 Sports Watch', 'Tissot PRX Powermatic 80', 'Lululemon Align Leggings', 'Lululemon Scuba Hoodie',
  'The North Face Nuptse Jacket', 'Patagonia Down Sweater', 'Carhartt Detroit Jacket', 'Carhartt Watch Hat Beanie', 'Ralph Lauren Oxford Shirt',
  'Tommy Hilfiger Polo Shirt', 'Lacoste Polo Shirt', 'Calvin Klein Boxer Briefs', 'Zara Satin Midi Dress', 'Uniqlo Supima Cotton T-Shirt',
  'Pandora Moments Bracelet', 'Swarovski Millenia Necklace', 'Herschel Little America Backpack', 'Fjallraven Kanken Backpack',
];

const BY_COUNTRY: Record<CountryCode, string[]> = {
  US: ['Coach Tabby Shoulder Bag 26', "Levi's 501 Original Fit Jeans", 'Ray-Ban Wayfarer Sunglasses', 'New Balance 550', 'The North Face Nuptse Jacket', 'Lululemon Align Leggings'],
  GB: ['Mulberry Bayswater Bag', 'Barbour Beaufort Wax Jacket', 'Adidas Samba OG', 'Dr. Martens 1460 Boots', 'Longchamp Le Pliage Large Tote', 'The North Face Nuptse Jacket'],
  AE: ['Charles & Keith Koa Shoulder Bag', 'Michael Kors Parker Watch', 'Adidas Samba OG', 'Coach Willow Tote', 'Ray-Ban Aviator Classic', 'Swarovski Millenia Necklace'],
  IN: ["Levi's 511 Slim Jeans", 'Fossil Grant Chronograph Watch', 'Nike Dunk Low', 'Hidesign Leather Tote', 'Titan Raga Watch', 'Ray-Ban Aviator Classic'],
};

const EXTRA: Record<CountryCode, string[]> = {
  US: ['Steve Madden Platform Sneakers', 'Sam Edelman Hazel Pumps'],
  GB: ['Mulberry Lily Bag', 'Barbour Bedale Wax Jacket', 'Stone Island Crewneck Sweatshirt', 'Ted Baker Icon Tote', 'AllSaints Leather Biker Jacket', 'Clarks Wallabee Shoes', 'Kurt Geiger Kensington Bag'],
  AE: ['Level Shoes Sneakers', 'Michael Kors Jet Set Crossbody', 'Coach Tabby Shoulder Bag 20'],
  IN: ['Hidesign Leather Tote', 'Titan Raga Watch', 'Fastrack Sunglasses', 'Allen Solly Formal Shirt', 'Lavie Handbag', 'Caprese Satchel', 'Manyavar Kurta', 'Puma RS-X'],
};

export const CATEGORIES = ['Handbags', 'Sneakers', 'Watches', 'Sunglasses', 'Jeans', 'Jackets', 'Wallets', 'Jewelry'] as const;

export function popularSearches(country: CountryCode): string[] {
  return BY_COUNTRY[country];
}

/** Suggestions where every typed word matches the start of a word in the suggestion. */
export function suggest(input: string, country: CountryCode, limit = 6): string[] {
  const words = normalize(input).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  const pool = [...new Set([...BY_COUNTRY[country], ...EXTRA[country], ...COMMON])];
  const scored: { text: string; score: number }[] = [];
  for (const text of pool) {
    const parts = normalize(text).split(' ');
    let score = 0;
    let ok = true;
    for (const w of words) {
      const idx = parts.findIndex((p) => p.startsWith(w));
      if (idx === -1) {
        ok = false;
        break;
      }
      score += idx === 0 ? 3 : 1;
    }
    if (ok) scored.push({ text, score: score + (BY_COUNTRY[country].includes(text) ? 2 : 0) });
  }
  return scored.sort((a, b) => b.score - a.score || a.text.length - b.text.length).slice(0, limit).map((s) => s.text);
}
