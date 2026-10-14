import type { BadgeDef } from './types.ts';

export function matchBadgeForTag(tagName: string, badges: BadgeDef[]): BadgeDef | undefined {
  return badges.find((b) => b.tag !== '' && b.tag === tagName);
}

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
