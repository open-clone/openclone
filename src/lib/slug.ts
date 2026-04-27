export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(slug);
}

export function assertValidSlug(slug: string): void {
  if (!isValidSlug(slug)) {
    throw new Error(`Invalid clone slug: ${slug}`);
  }
}
