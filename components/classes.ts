// Class recipes for buttons and chips. A plain module (no 'use client') so server components
// can use them too.

export type ButtonVariant = 'primary' | 'secondary' | 'tinted' | 'ghost' | 'sticker';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Apple-style capsule buttons. Small ones keep a 44px tap area even when they look smaller. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  const base =
    'press relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold disabled:opacity-40';
  const sizes: Record<ButtonSize, string> = {
    sm: "h-9 px-4 text-subhead after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
    md: 'h-11 px-5 text-callout',
    lg: 'h-[3.25rem] px-7 text-headline',
  };
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-ink text-paper hover:bg-ink/85',
    secondary: 'bg-fill text-ink hover:bg-fill-strong',
    tinted: 'bg-sticker/20 text-accent-ink hover:bg-sticker/30',
    ghost: 'text-ink hover:bg-fill',
    sticker: 'bg-sticker text-sticker-ink hover:brightness-105',
  };
  return `${base} ${sizes[size]} ${variants[variant]}`;
}

/** A filter capsule: gray until selected, then solid. */
export function chipClass(selected: boolean): string {
  return `press relative inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-subhead font-semibold after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] ${
    selected ? 'bg-ink text-paper' : 'bg-fill text-ink hover:bg-fill-strong'
  }`;
}
