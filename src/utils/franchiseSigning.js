export function normalizeFranchiseSigningUrl(stored, origin = (typeof window !== 'undefined' ? window.location.origin : '')) {
  if (!stored || typeof stored !== 'string') return '';
  const s = stored.trim();
  if (!s) return '';
  try {
    const baseOrigin = String(origin || '').replace(/\/+$/, '');
    const abs = /^https?:\/\//i.test(s)
      ? s
      : `${baseOrigin}${s.startsWith('/') ? '' : '/'}${s}`;
    const u = new URL(abs);
    if (!u.pathname.toLowerCase().includes('sign-contract')) return s;
    const qs = u.searchParams.toString();
    return `${baseOrigin}${u.pathname}${qs ? `?${qs}` : ''}`;
  } catch {
    return s;
  }
}

export function franchiseSigningHref(stored, origin = (typeof window !== 'undefined' ? window.location.origin : '')) {
  if (!stored || typeof stored !== 'string') return '';
  return normalizeFranchiseSigningUrl(stored, origin) || stored.trim();
}
