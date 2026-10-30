// Colors named in titles and searches, grouped into families so "lilac" matches "purple".
// Used to warn when a store's price is for a different color than the one you're after.

import { normalize } from './text';

const FAMILIES: Record<string, string[]> = {
  black: ['black', 'noir', 'jet black'],
  white: ['white', 'ivory', 'cream', 'chalk', 'off white', 'bone', 'optic white'],
  clear: ['clear', 'transparent'],
  grey: ['grey', 'gray', 'charcoal', 'graphite', 'slate', 'dark stone'],
  beige: ['beige', 'tan', 'camel', 'sand', 'nude', 'taupe', 'khaki', 'oatmeal', 'champagne', 'caramel', 'honey'],
  brown: ['brown', 'cognac', 'chocolate', 'chestnut', 'mocha', 'coffee', 'walnut', 'espresso', 'cocoa'],
  red: ['red', 'burgundy', 'wine', 'maroon', 'oxblood', 'bordeaux', 'scarlet', 'crimson'],
  pink: ['pink', 'rose', 'fuchsia', 'blush', 'magenta', 'raspberry', 'salmon'],
  purple: ['purple', 'lilac', 'lavender', 'violet', 'plum', 'aubergine', 'mauve'],
  blue: ['blue', 'navy', 'cobalt', 'denim', 'indigo', 'azure', 'turquoise', 'teal', 'aqua', 'aquamarine'],
  green: ['green', 'olive', 'mint', 'sage', 'lime', 'forest green'],
  yellow: ['yellow', 'mustard', 'lemon', 'canary', 'ochre'],
  orange: ['orange', 'coral', 'rust', 'tangerine', 'apricot', 'peach', 'amber'],
  multi: ['multicolor', 'multicolour', 'multi color', 'multi colour', 'rainbow'],
};

/** Hardware and plating colors: only count when nothing else is named. */
const METALLIC: Record<string, string[]> = {
  gold: ['rose gold', 'gold tone', 'gold', 'golden', 'brass'],
  silver: ['silver tone', 'silver', 'rhodium', 'platinum', 'gunmetal'],
};

interface ColorHit {
  family: string;
  word: string;
}

function scan(text: string, table: Record<string, string[]>): { hits: ColorHit[]; rest: string } {
  let rest = ` ${normalize(text)} `;
  const hits: ColorHit[] = [];
  // Longest words first, so "rose gold" isn't read as "rose" and "dark stone" isn't missed.
  const words = Object.entries(table)
    .flatMap(([family, list]) => list.map((word) => ({ family, word })))
    .sort((a, b) => b.word.length - a.word.length);
  for (const { family, word } of words) {
    const needle = ` ${word} `;
    if (rest.includes(needle)) {
      hits.push({ family, word });
      rest = rest.split(needle).join(' ');
    }
  }
  return { hits, rest };
}

function read(text: string): { hits: ColorHit[]; metalOnly: boolean } {
  const metal = scan(text, METALLIC);
  const main = scan(metal.rest, FAMILIES).hits;
  return main.length > 0 ? { hits: main, metalOnly: false } : { hits: metal.hits, metalOnly: metal.hits.length > 0 };
}

/** The main colors in a title or search: real colors first, metal finishes only as a fallback. */
export function colorsIn(text: string): ColorHit[] {
  return read(text).hits;
}

const label = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * When `wanted` names a color and `title` names only other colors, returns a short note like
 * "Green, not pink". Returns null when the colors match or either side doesn't say.
 */
export function colorMismatch(wanted: string, title: string): string | null {
  const wantRead = read(wanted);
  const haveRead = read(title);
  const want = wantRead.hits;
  const have = haveRead.hits;
  if (want.length === 0 || have.length === 0) return null;
  // "Gold-tone plated" says nothing about the stones, so it can't contradict "pink".
  if (haveRead.metalOnly !== wantRead.metalOnly) return null;
  if (have.some((h) => h.family === 'multi')) return null;
  const wantFamilies = new Set(want.map((c) => c.family));
  if (have.some((h) => wantFamilies.has(h.family))) return null;
  return `${label(have[0].word)}, not ${want[0].word}`;
}

/** The first text among `candidates` that names a color, used as the color the shopper wants. */
export function wantedColorText(...candidates: (string | undefined)[]): string | undefined {
  return candidates.find((c) => c && colorsIn(c).length > 0);
}
