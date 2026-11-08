export function createPostUrl(slug: string, origin: string): string {
  return new URL(`/posts/${encodeURIComponent(slug)}`, origin).toString();
}
