const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function isValidSlug(value: string): boolean {
  return value.length > 0 && value.length <= 120 && SLUG_PATTERN.test(value);
}

/** Appends -2, -3, ... until the slug is free according to `taken`. */
export function uniqueSlug(base: string, taken: (candidate: string) => boolean): string {
  const seed = base.length > 0 ? base : 'item';
  if (!taken(seed)) return seed;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${seed.slice(0, 115)}-${suffix}`;
    if (!taken(candidate)) return candidate;
  }
  throw new Error('Could not derive a unique slug');
}
