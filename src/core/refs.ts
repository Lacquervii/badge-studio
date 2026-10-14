import type { App } from 'obsidian';
import { parseBadgeMarker } from './parse.ts';

export interface BadgeRef {
  path: string;
  count: number;
}

export async function findBadgeReferences(app: App, names: string[]): Promise<Map<string, BadgeRef[]>> {
  const wanted = new Set(names);
  const result = new Map<string, BadgeRef[]>();
  for (const name of names) result.set(name, []);
  for (const file of app.vault.getMarkdownFiles()) {
    const text = await app.vault.cachedRead(file);
    const counts = new Map<string, number>();
    for (const line of text.split('\n')) {
      const name = parseBadgeMarker(line);
      if (name !== null && wanted.has(name)) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    for (const [name, count] of counts) result.get(name)?.push({ path: file.path, count });
  }
  return result;
}
