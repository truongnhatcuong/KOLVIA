export const PAGE_SIZE = 10;

export function paginate<T>(items: T[], rawPage: unknown) {
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(Array.isArray(rawPage) ? rawPage[0] : rawPage)) || 1));
  return { items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), page, pages, total: items.length };
}
