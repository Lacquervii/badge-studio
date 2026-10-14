import { MarkdownView, Notice } from 'obsidian';
import type { TFile } from 'obsidian';
import { findMarkerRuns } from './core/parse.ts';
import { classifyLink } from './core/resolve.ts';
import type { BadgePlugin } from './main.ts';

async function embedFor(plugin: BadgePlugin, name: string, sourcePath: string): Promise<string | null> {
  const app = plugin.app;
  const badge = plugin.store.settings.badges.find((b) => b.name === name);
  if (!badge) return null;
  await plugin.store.regenerateBadge(badge);
  const svgFile = app.vault.getAbstractFileByPath(plugin.store.svgPath(badge)) as TFile | null;
  if (!svgFile) return null;
  let e = '!' + app.fileManager.generateMarkdownLink(svgFile, sourcePath);
  const lk = classifyLink(badge.link);
  if (lk.kind === 'url') {
    e = `[${e}](${lk.url})`;
  } else if (lk.kind === 'note') {
    const t = app.metadataCache.getFirstLinkpathDest(lk.name, sourcePath);
    const dest = t ? app.fileManager.generateMarkdownLink(t, sourcePath) : lk.name;
    e = `[${e}](${dest})`;
  }
  return e;
}

export async function freezeActiveNote(plugin: BadgePlugin): Promise<void> {
  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
  if (!view || !view.file) {
    new Notice('请先打开一篇笔记');
    return;
  }
  const lines = view.editor.getValue().split('\n');
  const runs = findMarkerRuns(lines);
  if (runs.length === 0) {
    new Notice('本篇没有发现徽章标记（badge: 名字）');
    return;
  }
  let frozen = 0;
  for (const run of [...runs].reverse()) {
    const embeds: string[] = [];
    let ok = true;
    for (const name of run.names) {
      const e = await embedFor(plugin, name, view.file.path);
      if (!e) {
        ok = false;
        break;
      }
      embeds.push(e);
    }
    if (!ok) continue;
    lines.splice(run.startLine, run.endLine - run.startLine + 1, embeds.join(' '));
    frozen++;
  }
  if (frozen === 0) {
    new Notice('标记名在标签库里找不到，未固化');
    return;
  }
  view.editor.setValue(lines.join('\n'));
  const skipped = runs.length - frozen;
  new Notice(skipped > 0 ? `已固化 ${frozen} 排徽章，${skipped} 排因找不到标签而保留为文字` : `已固化 ${frozen} 排徽章为图片`);
}

function pureBadgeLineToMarkers(plugin: BadgePlugin, line: string): string[] | null {
  const rest = line
    .replace(/\[[^\]]*!?\[\[[^\]]*\]\]\([^)]*\)/g, '')
    .replace(/!?\[\[[^\]]*badge-\d+\.svg[^\]]*\]\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]*badge-\d+\.svg[^)]*\)/g, '');
  if (rest.trim() !== '') return null;
  const hits = line.match(/badge-(\d+)\.svg/g);
  if (!hits) return null;
  const names: Array<string | null> = hits.map((h) => {
    const id = /badge-(\d+)\.svg/.exec(h)?.[1] ?? '';
    return plugin.store.settings.badges.find((b) => b.id === id)?.name ?? null;
  });
  if (names.some((n) => n === null)) return null;
  return names as string[];
}

export function unfreezeActiveNote(plugin: BadgePlugin): void {
  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
  if (!view || !view.file) {
    new Notice('请先打开一篇笔记');
    return;
  }
  const lines = view.editor.getValue().split('\n');
  const out: string[] = [];
  let changed = 0;
  for (const line of lines) {
    const names = pureBadgeLineToMarkers(plugin, line);
    if (names) {
      out.push(...names.map((n) => `badge: ${n}`));
      changed++;
    } else {
      out.push(line);
    }
  }
  if (changed === 0) {
    new Notice('本篇没有可还原的徽章图片行（素材文件夹里的 badge-xxx.svg 嵌图行）');
    return;
  }
  view.editor.setValue(out.join('\n'));
  new Notice(`已还原 ${changed} 行徽章为标记`);
}
