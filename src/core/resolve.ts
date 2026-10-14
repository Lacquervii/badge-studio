export type LinkKind =
  | { kind: 'none' }
  | { kind: 'url'; url: string }
  | { kind: 'note'; name: string };

export function classifyLink(link: string): LinkKind {
  const t = link.trim();
  if (t === '') return { kind: 'none' };
  if (/^https?:\/\//i.test(t)) return { kind: 'url', url: t };
  return { kind: 'note', name: t };
}
