export const brandColors = {
  pink: "bg-hot-pink",
  yellow: "bg-lemon",
  blue: "bg-sky",
  lime: "bg-lime",
  purple: "bg-lavender",
  coral: "bg-coral",
  black: "bg-ink",
  cream: "bg-cream",
  bubblegum: "bg-bubblegum",
} as const;

export type BrandColor = keyof typeof brandColors;

export const rotateClass: Record<number, string> = {
  [-3]: "-rotate-3",
  [-2]: "-rotate-2",
  [-1]: "-rotate-1",
  0: "rotate-0",
  1: "rotate-1",
  2: "rotate-2",
  3: "rotate-3",
};

export const hardShadow = "shadow-[4px_4px_0_#000]";
