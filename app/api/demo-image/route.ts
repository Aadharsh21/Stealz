// Simple product illustrations for demo data (no real product photos in demo mode).

const SHAPES: Record<string, string> = {
  bag: `<path d="M140 178 C140 92 260 92 260 178" fill="none" stroke="S" stroke-width="10" stroke-linecap="round"/>
<rect x="96" y="168" width="208" height="156" rx="30" fill="F" stroke="S" stroke-width="6"/>
<path d="M96 206 Q200 262 304 206" fill="none" stroke="S" stroke-width="6"/>
<rect x="186" y="228" width="28" height="22" rx="6" fill="A" stroke="S" stroke-width="4"/>`,
  tote: `<path d="M148 182 C148 104 192 104 192 182 M208 182 C208 104 252 104 252 182" fill="none" stroke="S" stroke-width="9" stroke-linecap="round"/>
<path d="M104 178 L296 178 L316 330 L84 330 Z" fill="F" stroke="S" stroke-width="6" stroke-linejoin="round"/>
<path d="M104 206 L296 206" stroke="S" stroke-width="4" opacity=".5"/>`,
  backpack: `<path d="M178 112 C178 82 222 82 222 112" fill="none" stroke="S" stroke-width="8"/>
<rect x="118" y="106" width="164" height="226" rx="54" fill="F" stroke="S" stroke-width="6"/>
<path d="M134 168 L266 168" stroke="S" stroke-width="5"/>
<rect x="146" y="226" width="108" height="76" rx="18" fill="A" stroke="S" stroke-width="5"/>`,
  wallet: `<rect x="88" y="146" width="224" height="140" rx="20" fill="F" stroke="S" stroke-width="6"/>
<path d="M88 196 L312 196" stroke="S" stroke-width="5"/>
<circle cx="272" cy="196" r="12" fill="A" stroke="S" stroke-width="4"/>`,
  sneaker: `<path d="M64 284 L64 232 C64 214 80 204 98 202 L166 192 C188 188 204 170 214 152 L248 152 C262 182 292 202 332 212 C348 216 354 232 354 250 L354 284 Z" fill="F" stroke="S" stroke-width="6" stroke-linejoin="round"/>
<path d="M64 262 L354 262" stroke="S" stroke-width="6"/>
<path d="M182 182 L202 198 M198 170 L218 186 M214 160 L232 176" stroke="S" stroke-width="5" stroke-linecap="round"/>
<path d="M140 240 C196 236 252 222 306 228" fill="none" stroke="A" stroke-width="9" stroke-linecap="round"/>`,
  boot: `<path d="M148 84 L242 84 L242 226 C242 240 254 250 270 252 L322 260 C338 263 348 275 348 292 L348 314 L148 314 Z" fill="F" stroke="S" stroke-width="6" stroke-linejoin="round"/>
<path d="M148 294 L348 294" stroke="S" stroke-width="6"/>
<path d="M166 84 L166 64 L190 64 L190 84" fill="none" stroke="S" stroke-width="5"/>`,
  heel: `<path d="M76 284 C130 282 170 244 198 206 L256 202 C280 204 304 226 322 252 L300 256 L294 334 L282 334 L278 262 C240 268 200 296 156 300 L76 300 Z" fill="F" stroke="S" stroke-width="6" stroke-linejoin="round"/>`,
  watch: `<rect x="164" y="56" width="72" height="96" rx="14" fill="F" stroke="S" stroke-width="6"/>
<rect x="164" y="248" width="72" height="96" rx="14" fill="F" stroke="S" stroke-width="6"/>
<circle cx="200" cy="200" r="72" fill="A" stroke="S" stroke-width="7"/>
<circle cx="200" cy="200" r="56" fill="#fbfaf7" stroke="S" stroke-width="3"/>
<path d="M200 200 L200 162 M200 200 L230 214" stroke="S" stroke-width="6" stroke-linecap="round"/>
<rect x="270" y="190" width="14" height="20" rx="4" fill="S"/>`,
  sunglasses: `<path d="M64 168 H180 V212 C180 246 156 262 122 262 C88 262 64 242 64 210 Z" fill="F" stroke="S" stroke-width="6" stroke-linejoin="round"/>
<path d="M220 168 H336 V210 C336 242 312 262 278 262 C244 262 220 246 220 212 Z" fill="F" stroke="S" stroke-width="6" stroke-linejoin="round"/>
<path d="M180 182 C192 170 208 170 220 182" fill="none" stroke="S" stroke-width="6"/>
<path d="M64 174 L40 162 M336 174 L360 162" stroke="S" stroke-width="6" stroke-linecap="round"/>`,
  jeans: `<path d="M128 78 L272 78 L288 332 L216 332 L200 166 L184 332 L112 332 Z" fill="F" stroke="S" stroke-width="6" stroke-linejoin="round"/>
<path d="M128 104 L272 104" stroke="S" stroke-width="5"/>
<path d="M146 112 C150 140 170 146 186 140 M254 112 C250 140 230 146 214 140" fill="none" stroke="A" stroke-width="4"/>`,
  tee: `<path d="M140 88 L176 76 C186 98 214 98 224 76 L260 88 L322 140 L290 182 L266 162 L266 322 L134 322 L134 162 L110 182 L78 140 Z" fill="F" stroke="S" stroke-width="6" stroke-linejoin="round"/>`,
  shirt: `<path d="M150 84 L180 74 L200 100 L220 74 L250 84 L310 120 L330 262 L300 266 L284 162 L280 332 L120 332 L116 162 L100 266 L70 262 L90 120 Z" fill="F" stroke="S" stroke-width="6" stroke-linejoin="round"/>
<path d="M200 100 L200 332" stroke="S" stroke-width="4"/>
<circle cx="200" cy="150" r="5" fill="S"/><circle cx="200" cy="200" r="5" fill="S"/><circle cx="200" cy="250" r="5" fill="S"/>`,
  dress: `<path d="M170 68 L230 68 L236 118 C252 150 256 162 250 176 L312 332 L88 332 L150 176 C144 162 148 150 164 118 Z" fill="F" stroke="S" stroke-width="6" stroke-linejoin="round"/>
<path d="M152 176 L248 176" stroke="A" stroke-width="7"/>`,
  jacket: `<path d="M150 78 L250 78 L320 118 L336 322 L290 322 L284 190 L280 332 L120 332 L116 190 L110 322 L64 322 L80 118 Z" fill="F" stroke="S" stroke-width="6" stroke-linejoin="round"/>
<path d="M168 80 L200 172 L232 80" fill="none" stroke="S" stroke-width="5"/>
<path d="M200 172 L200 332" stroke="A" stroke-width="5"/>`,
  hoodie: `<path d="M156 98 C156 46 244 46 244 98" fill="F" stroke="S" stroke-width="6"/>
<path d="M150 92 L250 92 L318 130 L334 320 L290 320 L282 190 L280 332 L120 332 L118 190 L110 320 L66 320 L82 130 Z" fill="F" stroke="S" stroke-width="6" stroke-linejoin="round"/>
<rect x="150" y="248" width="100" height="56" rx="14" fill="A" stroke="S" stroke-width="4"/>`,
  hat: `<path d="M108 232 C108 140 292 140 292 232 Z" fill="F" stroke="S" stroke-width="6" stroke-linejoin="round"/>
<path d="M108 232 C170 226 282 230 344 252 C300 266 200 258 108 252 Z" fill="A" stroke="S" stroke-width="6" stroke-linejoin="round"/>
<circle cx="200" cy="148" r="9" fill="S"/>`,
  jewelry: `<path d="M108 104 C126 232 274 232 292 104" fill="none" stroke="S" stroke-width="5" stroke-dasharray="2 9" stroke-linecap="round"/>
<path d="M200 214 L222 244 L200 286 L178 244 Z" fill="F" stroke="S" stroke-width="5" stroke-linejoin="round"/>
<circle cx="200" cy="212" r="7" fill="A" stroke="S" stroke-width="3"/>`,
  other: `<path d="M114 124 L254 124 L326 200 L254 276 L114 276 Z" fill="F" stroke="S" stroke-width="6" stroke-linejoin="round"/>
<circle cx="150" cy="200" r="14" fill="#fbfaf7" stroke="S" stroke-width="5"/>`,
};

const COLORS: [RegExp, string][] = [
  [/black/, '#1f1f22'], [/navy/, '#26324f'], [/(bordeaux|burgundy|wine|red)/, '#8f2735'],
  [/(olive|sage|green)/, '#6d7b4c'], [/(grey|gray|heather)/, '#8b8e93'], [/rose/, '#d9a0a8'], [/pink/, '#e7a8b8'],
  [/gold/, '#c9a14a'], [/silver/, '#b9bdc3'], [/(tortoise)/, '#6c4a2c'], [/(brown|tan|saddle|chestnut|wheat|camel)/, '#b07b4c'],
  [/(khaki|stone)/, '#b8ad92'], [/(light wash)/, '#8fa9cc'], [/(dark wash|blue|denim)/, '#3f5b86'],
  [/(white|chalk|ivory|cream|natural|nude|brass)/, '#efe8da'],
];

const BACKGROUNDS = ['#f2ede3', '#ebeef0', '#f3ece8', '#ecf0e8', '#efedf3'];

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * 255)));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const category = params.get('c') ?? 'other';
  const tone = (params.get('t') ?? '').toLowerCase();
  const seed = Math.abs(Number(params.get('s')) || 0) % BACKGROUNDS.length;
  const fill = COLORS.find(([re]) => re.test(tone))?.[1] ?? '#b07b4c';
  const light = parseInt(fill.slice(1, 3), 16) > 200;
  const stroke = light ? '#4a4237' : shade(fill, -0.18);
  const accent = light ? '#c9a14a' : shade(fill, 0.22);
  const shape = (SHAPES[category] ?? SHAPES.other).replace(/"S"/g, `"${stroke}"`).replace(/"F"/g, `"${fill}"`).replace(/"A"/g, `"${accent}"`);
  const bg = BACKGROUNDS[seed];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
<rect width="400" height="400" fill="${bg}"/>
<ellipse cx="200" cy="350" rx="130" ry="14" fill="#000" opacity=".06"/>
${shape}
</svg>`;
  return new Response(svg, {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=86400, immutable' },
  });
}
