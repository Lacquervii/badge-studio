import type { App } from 'obsidian';
import { TFile } from 'obsidian';
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

/** 读取笔记开头若干文字作为预览（跳过 frontmatter、标题、标记行） */
export async function notePreview(app: App, path: string, maxLen = 90): Promise<string> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return '';
  let text = await app.vault.cachedRead(file);
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3);
    if (end > 0) text = text.slice(end + 4);
  }
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#') && !/^badge\s*[:：]/.test(l) && !/^\S+\s*::/.test(l));
  const snippet = lines.slice(0, 2).join(' ');
  return snippet.length > maxLen ? snippet.slice(0, maxLen) + '…' : snippet;
}
