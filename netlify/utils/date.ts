export function todayYMD(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export function getDateParam(url: URL): string {
  const d = url.searchParams.get('date');
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return todayYMD();
}
