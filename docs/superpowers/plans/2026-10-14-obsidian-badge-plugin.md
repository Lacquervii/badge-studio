# 徽章工坊（Obsidian Badge Studio）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做一个 Obsidian 插件：把 GitHub 盾牌徽章画成 SVG 小图存进库内素材文件夹，笔记用原生嵌图语法引用（插件卸载后仍显示），配两层标签库设置、侧边栏/命令面板插入、#标签皮肤开关。

**Architecture:** 纯核心（types/defaults/svg/resolve，不 import obsidian，可 node --test 单测）＋ Obsidian 壳（store 服务、sidebar ItemView、SettingTab、SuggestModal、tag-skin 的 postprocessor + CodeMirror ViewPlugin）。SVG 宽度用注入的 measure 函数（生产＝canvas 实测，测试＝桩）。

**Tech Stack:** TypeScript、esbuild、Obsidian Plugin API（ItemView / PluginSettingTab / SuggestModal / MarkdownPostProcessor / CodeMirror 6 Decoration）、Node 24 原生 test runner（type stripping 直跑 .ts）。

**Spec:** `docs/superpowers/specs/2026-10-14-obsidian-badge-plugin-design.md`

**Git 说明:** 项目目录内 `git init` 独立仓库（用户 home 目录是个零提交的 git 仓库，不能往里提交）。每个任务结束提交一次。

**文件结构:**
- `src/core/types.ts` — 全部接口与 Measure 类型
- `src/core/defaults.ts` — 默认设置（7 样式＋3 标签）＋ nextNumericId
- `src/core/svg.ts` — escapeXml / textColorFor / buildBadgeSvg（纯函数）
- `src/core/resolve.ts` — matchBadgeForTag / classifyLink（纯函数）
- `src/store.ts` — BadgeStore：读写 data.json、素材文件夹、SVG 生成写盘、增删改、renumber/重分配
- `src/ui/chip.ts` — makeChip DOM 芯片（tag 皮肤与预览共用）
- `src/tagskin.ts` — 阅读模式 postprocessor + 实时预览 CM ViewPlugin
- `src/ui/sidebar.ts` — BadgeSidebarView（搜索/清单/临时徽章/打开设置）
- `src/ui/insert.ts` — insertBadgeAtCursor + BadgeInsertModal(SuggestModal)
- `src/ui/settingsTab.ts` — BadgeSettingTab + StyleEditModal + BadgeEditModal + 颜色控件
- `src/main.ts` — BadgePlugin：装配 ribbon/view/command/settings/tagskin/events
- `styles.css`、`manifest.json`、`versions.json`、`esbuild.config.mjs`、`package.json`、`tsconfig.json`
- `tests/defaults.test.ts`、`tests/svg.test.ts`、`tests/resolve.test.ts`

**注意（贯穿）:** 所有相对 import 带 `.ts` 后缀（Node type stripping 要求）；不用 enum/namespace/参数属性（erasable-syntax-only）。

---

### Task 1: 脚手架 + 构建管线 + git init

**Files:**
- Create: `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `manifest.json`, `versions.json`, `.gitignore`, `src/main.ts`(最小可加载版), `styles.css`(空占位)

- [ ] **Step 1: git init**

Run:
```bash
cd "/Users/farroadeta/Downloads/github标签" && git init && git branch -M main
```
Expected: `Initialized empty Git repository ...`

- [ ] **Step 2: 写 package.json**

```json
{
  "name": "badge-studio",
  "version": "1.0.0",
  "description": "GitHub-style shield badges as durable SVG image embeds",
  "type": "module",
  "main": "main.js",
  "scripts": {
    "build": "node esbuild.config.mjs production",
    "dev": "node esbuild.config.mjs",
    "test": "node --test tests/defaults.test.ts tests/svg.test.ts tests/resolve.test.ts"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "esbuild": "^0.24.0",
    "obsidian": "^1.7.2",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 3: 写 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "lib": ["DOM", "ES2020"],
    "types": ["node"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: 写 esbuild.config.mjs**

```js
import esbuild from 'esbuild';
import process from 'process';

const prod = process.argv[2] === 'production';

esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*'],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  outfile: 'main.js',
}).catch(() => process.exit(1));
```

- [ ] **Step 5: 写 manifest.json 与 versions.json**

manifest.json:
```json
{
  "id": "badge-studio",
  "name": "Badge Studio 徽章工坊",
  "version": "1.0.0",
  "minAppVersion": "1.5.0",
  "description": "GitHub-style shield badges as durable SVG image embeds; two-layer style/badge library, sidebar picker, #tag skins.",
  "author": "Farroadeta",
  "isDesktopOnly": false
}
```
versions.json:
```json
{ "1.0.0": "1.5.0" }
```

- [ ] **Step 6: 写 .gitignore**

```
node_modules/
main.js
*.js.map
.DS_Store
```

- [ ] **Step 7: 写最小 src/main.ts（仅验证构建）**

```ts
import { Plugin } from 'obsidian';

export default class BadgePlugin extends Plugin {
  async onload(): Promise<void> {
    console.log('badge-studio loaded');
  }
}
```

- [ ] **Step 8: 写 styles.css 占位**

```css
/* badge-studio styles, filled in Task 10 */
```

- [ ] **Step 9: 安装依赖并构建**

Run:
```bash
npm install && npm run build
```
Expected: 生成 `main.js`，esbuild 输出 1 个 bundle 无 error。

- [ ] **Step 10: 提交**

```bash
git add package.json package-lock.json tsconfig.json esbuild.config.mjs manifest.json versions.json .gitignore src/main.ts styles.css docs
git commit -m "chore: scaffold badge-studio plugin with esbuild pipeline"
```

---

### Task 2: 核心类型 + 默认值（含测试）

**Files:**
- Create: `src/core/types.ts`, `src/core/defaults.ts`, `tests/defaults.test.ts`

- [ ] **Step 1: 写 src/core/types.ts**

```ts
export interface StyleDef {
  id: string;
  name: string;
  leftBg: string;
  rightBg: string;
}

export interface BadgeDef {
  id: string;
  name: string;
  leftText: string;
  rightText: string;
  styleId: string;
  tag: string;
  link: string;
}

export interface BadgeSettings {
  assetsFolder: string;
  renderTags: boolean;
  defaultStyleId: string;
  styles: StyleDef[];
  badges: BadgeDef[];
}

export type Measure = (text: string) => number;

export interface ChipSpec {
  leftText: string;
  rightText: string;
  leftBg: string;
  rightBg: string;
}
```

- [ ] **Step 2: 写 src/core/defaults.ts**

```ts
import type { BadgeSettings } from './types.ts';

const LEFT_BG = '#555555';

export function defaultSettings(): BadgeSettings {
  const styles = [
    { id: 's001', name: '黄', rightBg: '#ffd400' },
    { id: 's002', name: '绿', rightBg: '#4caf50' },
    { id: 's003', name: '红', rightBg: '#e05d44' },
    { id: 's004', name: '蓝', rightBg: '#007ec6' },
    { id: 's005', name: '紫', rightBg: '#7c3aed' },
    { id: 's006', name: '橙', rightBg: '#f97316' },
    { id: 's007', name: '灰', rightBg: '#555555' },
  ].map((s) => ({ ...s, leftBg: LEFT_BG }));

  return {
    assetsFolder: '徽章素材',
    renderTags: true,
    defaultStyleId: 's001',
    styles,
    badges: [
      { id: '001', name: '状态-进行中', leftText: '状态', rightText: '进行中', styleId: 's001', tag: '', link: '' },
      { id: '002', name: '科目-现代汉语', leftText: '科目', rightText: '现代汉语', styleId: 's004', tag: '', link: '' },
      { id: '003', name: '单段-示例', leftText: '', rightText: '示例', styleId: 's005', tag: '', link: '' },
    ],
  };
}

export function nextNumericId(ids: string[], withS: boolean): string {
  let max = 0;
  for (const id of ids) {
    const raw = withS ? id.replace(/^s/, '') : id;
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n > max) max = n;
  }
  const num = String(max + 1).padStart(3, '0');
  return withS ? `s${num}` : num;
}
```

- [ ] **Step 3: 写失败测试 tests/defaults.test.ts**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, nextNumericId } from '../src/core/defaults.ts';

test('默认设置：7 个样式、3 个标签、开关默认开', () => {
  const s = defaultSettings();
  assert.equal(s.styles.length, 7);
  assert.equal(s.badges.length, 3);
  assert.equal(s.renderTags, true);
  assert.equal(s.assetsFolder, '徽章素材');
  assert.equal(s.defaultStyleId, 's001');
});

test('默认设置：样式左块统一深灰，右块色值符合规格', () => {
  const s = defaultSettings();
  for (const st of s.styles) assert.equal(st.leftBg, '#555555');
  const byName = Object.fromEntries(s.styles.map((st) => [st.name, st.rightBg]));
  assert.equal(byName['黄'], '#ffd400');
  assert.equal(byName['蓝'], '#007ec6');
  assert.equal(byName['紫'], '#7c3aed');
});

test('默认设置：第三个标签是单段（leftText 空）', () => {
  const s = defaultSettings();
  assert.equal(s.badges[2].leftText, '');
  assert.equal(s.badges[2].rightText, '示例');
});

test('nextNumericId 递增且补零', () => {
  assert.equal(nextNumericId(['001', '003'], false), '004');
  assert.equal(nextNumericId([], false), '001');
  assert.equal(nextNumericId(['s007'], true), 's008');
});
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: 4 个 test 全 PASS（类型与默认值已实现，本任务测试即验收）。

- [ ] **Step 5: 提交**

```bash
git add src/core/types.ts src/core/defaults.ts tests/defaults.test.ts
git commit -m "feat: core types and default style/badge library"
```

---

### Task 3: SVG 生成器（含测试）

**Files:**
- Create: `src/core/svg.ts`, `tests/svg.test.ts`

- [ ] **Step 1: 写 src/core/svg.ts**

```ts
import type { Measure, StyleDef } from './types.ts';

export const BADGE_HEIGHT = 20;
export const PAD = 7;
export const CORNER = 4;
export const FONT_STACK = "Verdana,Geneva,'PingFang SC','Microsoft YaHei',sans-serif";

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function textColorFor(bg: string): string {
  let hex = bg.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? '#000000' : '#ffffff';
}

function textEl(content: string, x: number, textLen: number, fill: string): string {
  return `<text x="${x}" y="14" font-family="${FONT_STACK}" font-size="11" font-weight="bold" fill="${fill}" textLength="${textLen}" lengthAdjust="spacingAndGlyphs">${escapeXml(content)}</text>`;
}

export function buildBadgeSvg(
  badge: { leftText: string; rightText: string },
  style: StyleDef,
  measure: Measure,
): string {
  const two = badge.leftText !== '';
  const leftTextLen = two ? Math.ceil(measure(badge.leftText)) : 0;
  const rightTextLen = Math.ceil(measure(badge.rightText));
  const lw = two ? leftTextLen + PAD * 2 : 0;
  const rw = rightTextLen + PAD * 2;
  const w = lw + rw;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${BADGE_HEIGHT}" viewBox="0 0 ${w} ${BADGE_HEIGHT}" role="img">`);
  parts.push(`<clipPath id="r"><rect width="${w}" height="${BADGE_HEIGHT}" rx="${CORNER}"/></clipPath>`);
  parts.push(`<g clip-path="url(#r)">`);
  if (two) parts.push(`<rect width="${lw}" height="${BADGE_HEIGHT}" fill="${style.leftBg}"/>`);
  parts.push(`<rect x="${lw}" width="${rw}" height="${BADGE_HEIGHT}" fill="${style.rightBg}"/>`);
  parts.push(`</g>`);
  if (two) parts.push(textEl(badge.leftText, PAD, leftTextLen, textColorFor(style.leftBg)));
  parts.push(textEl(badge.rightText, lw + PAD, rightTextLen, textColorFor(style.rightBg)));
  parts.push(`</svg>`);
  return parts.join('');
}
```

- [ ] **Step 2: 写测试 tests/svg.test.ts**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBadgeSvg, escapeXml, textColorFor } from '../src/core/svg.ts';
import type { Measure, StyleDef } from '../src/core/types.ts';

const measure: Measure = (t) => t.length * 7;
const yellow: StyleDef = { id: 's001', name: '黄', leftBg: '#555555', rightBg: '#ffd400' };
const blue: StyleDef = { id: 's004', name: '蓝', leftBg: '#555555', rightBg: '#007ec6' };

test('两段式：宽度=左(字宽+14)+右(字宽+14)，两个矩形', () => {
  const svg = buildBadgeSvg({ leftText: 'DOCS', rightText: 'MIT' }, yellow, measure);
  // 左: 28+14=42, 右: 21+14=35, 总 77
  assert.match(svg, /width="77" height="20"/);
  assert.match(svg, /<rect width="42" height="20" fill="#555555"\/>/);
  assert.match(svg, /<rect x="42" width="35" height="20" fill="#ffd400"\/>/);
  assert.match(svg, /clipPath/);
});

test('单段式：只有一个填色矩形，x=0', () => {
  const svg = buildBadgeSvg({ leftText: '', rightText: '示例' }, blue, measure);
  const rects = svg.match(/<rect x=/g) ?? [];
  const fills = svg.match(/<rect [^>]*fill="#007ec6"/g) ?? [];
  assert.equal(fills.length, 1);
  assert.match(svg, /<rect x="0" width="28" height="20" fill="#007ec6"\/>/);
  assert.match(svg, /width="28" height="20" viewBox/);
  assert.match(svg, /textLength="14"/);
  assert.equal(rects.length, 1);
});

test('字色自动：黄底黑字、蓝底白字、深灰底白字', () => {
  assert.equal(textColorFor('#ffd400'), '#000000');
  assert.equal(textColorFor('#007ec6'), '#ffffff');
  assert.equal(textColorFor('#555555'), '#ffffff');
  const svg = buildBadgeSvg({ leftText: 'a', rightText: 'b' }, yellow, measure);
  assert.match(svg, /fill="#ffffff" textLength/);
  assert.match(svg, /fill="#000000" textLength/);
});

test('textLength 写入且等于实测字宽', () => {
  const svg = buildBadgeSvg({ leftText: 'DOCS', rightText: 'MIT' }, yellow, measure);
  assert.match(svg, /textLength="28"/);
  assert.match(svg, /textLength="21"/);
  assert.match(svg, /lengthAdjust="spacingAndGlyphs"/);
});

test('XML 转义', () => {
  assert.equal(escapeXml('a&b<c>"d"'), 'a&amp;b&lt;c&gt;&quot;d&quot;');
  const svg = buildBadgeSvg({ leftText: '', rightText: 'a&b' }, yellow, measure);
  assert.match(svg, />a&amp;b</);
});

test('三位 hex 与缩写处理', () => {
  assert.equal(textColorFor('#fff'), '#000000');
  assert.equal(textColorFor('#000'), '#ffffff');
});
```

- [ ] **Step 3: 跑测试**

Run: `npm test`
Expected: 全部 PASS（svg 6 个 + defaults 4 个）。

- [ ] **Step 4: 提交**

```bash
git add src/core/svg.ts tests/svg.test.ts
git commit -m "feat: shields-style SVG builder with measured widths and auto text color"
```

---

### Task 4: 标签匹配与链接分类（含测试）

**Files:**
- Create: `src/core/resolve.ts`, `tests/resolve.test.ts`

- [ ] **Step 1: 写 src/core/resolve.ts**

```ts
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
```

- [ ] **Step 2: 写测试 tests/resolve.test.ts**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLink, matchBadgeForTag } from '../src/core/resolve.ts';
import { defaultSettings } from '../src/core/defaults.ts';

test('matchBadgeForTag 按 tag 字段精确匹配，空 tag 不匹配', () => {
  const badges = defaultSettings().badges.map((b, i) =>
    i === 0 ? { ...b, tag: '现代汉语' } : b,
  );
  assert.equal(matchBadgeForTag('现代汉语', badges)?.id, '001');
  assert.equal(matchBadgeForTag('不存在', badges), undefined);
  assert.equal(matchBadgeForTag('', badges), undefined);
});

test('classifyLink 三分支', () => {
  assert.deepEqual(classifyLink(''), { kind: 'none' });
  assert.deepEqual(classifyLink('  '), { kind: 'none' });
  assert.deepEqual(classifyLink('https://x.com/a'), { kind: 'url', url: 'https://x.com/a' });
  assert.deepEqual(classifyLink('HTTP://x.com'), { kind: 'url', url: 'HTTP://x.com' });
  assert.deepEqual(classifyLink('我的笔记'), { kind: 'note', name: '我的笔记' });
});
```

- [ ] **Step 3: 跑测试**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 4: 提交**

```bash
git add src/core/resolve.ts tests/resolve.test.ts
git commit -m "feat: tag-to-badge matching and link classification"
```

---

### Task 5: BadgeStore（设置持久化 + SVG 写盘 + 增删改）

**Files:**
- Create: `src/store.ts`
- Modify: `src/main.ts`（装配 store）

- [ ] **Step 1: 写 src/store.ts**

```ts
import type { BadgePlugin } from './main.ts';
import { defaultSettings, nextNumericId } from './core/defaults.ts';
import { buildBadgeSvg, FONT_STACK } from './core/svg.ts';
import type { BadgeDef, BadgeSettings, StyleDef } from './core/types.ts';

export class BadgeStore {
  plugin: BadgePlugin;
  settings: BadgeSettings = defaultSettings();
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(plugin: BadgePlugin) {
    this.plugin = plugin;
  }

  async load(): Promise<void> {
    const data = await this.plugin.loadData();
    if (data && Array.isArray(data.styles) && Array.isArray(data.badges)) {
      this.settings = data as BadgeSettings;
    } else {
      this.settings = defaultSettings();
      await this.save();
    }
    await this.regenerateAll();
  }

  async save(): Promise<void> {
    await this.plugin.saveData(this.settings);
    this.plugin.bump();
  }

  private measureText(text: string): number {
    if (!this.ctx) this.ctx = document.createElement('canvas').getContext('2d');
    if (!this.ctx) return text.length * 11;
    this.ctx.font = `bold 11px ${FONT_STACK}`;
    return this.ctx.measureText(text).width;
  }

  styleOf(badge: BadgeDef): StyleDef {
    return (
      this.settings.styles.find((s) => s.id === badge.styleId) ??
      this.settings.styles.find((s) => s.id === this.settings.defaultStyleId) ??
      this.settings.styles[0]
    );
  }

  defaultStyle(): StyleDef {
    return (
      this.settings.styles.find((s) => s.id === this.settings.defaultStyleId) ??
      this.settings.styles[0]
    );
  }

  svgPath(badge: BadgeDef): string {
    return `${this.settings.assetsFolder}/badge-${badge.id}.svg`;
  }

  buildSvg(badge: BadgeDef): string {
    return buildBadgeSvg(badge, this.styleOf(badge), (t) => this.measureText(t));
  }

  async ensureFolder(): Promise<void> {
    const folder = this.plugin.app.vault.getAbstractFileByPath(this.settings.assetsFolder);
    if (!folder) await this.plugin.app.vault.createFolder(this.settings.assetsFolder);
  }

  async regenerateBadge(badge: BadgeDef): Promise<void> {
    await this.ensureFolder();
    const path = this.svgPath(badge);
    const svg = this.buildSvg(badge);
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (file) await this.plugin.app.vault.modify(file as import('obsidian').TFile, svg);
    else await this.plugin.app.vault.create(path, svg);
  }

  async regenerateAll(): Promise<void> {
    for (const badge of this.settings.badges) await this.regenerateBadge(badge);
  }

  async renameAssetsFolder(newName: string): Promise<void> {
    const old = this.settings.assetsFolder;
    if (old === newName) return;
    this.settings.assetsFolder = newName;
    await this.ensureFolder();
    for (const badge of this.settings.badges) {
      const file = this.plugin.app.vault.getAbstractFileByPath(`${old}/badge-${badge.id}.svg`);
      if (file) await this.plugin.app.vault.rename(file, this.svgPath(badge));
    }
    await this.save();
  }

  async addBadge(partial: Omit<BadgeDef, 'id'>): Promise<BadgeDef> {
    const badge: BadgeDef = { ...partial, id: nextNumericId(this.settings.badges.map((b) => b.id), false) };
    this.settings.badges.push(badge);
    await this.save();
    await this.regenerateBadge(badge);
    return badge;
  }

  async updateBadge(id: string, patch: Partial<Omit<BadgeDef, 'id'>>): Promise<void> {
    const badge = this.settings.badges.find((b) => b.id === id);
    if (!badge) return;
    Object.assign(badge, patch);
    await this.save();
    await this.regenerateBadge(badge);
  }

  async deleteBadge(id: string): Promise<void> {
    this.settings.badges = this.settings.badges.filter((b) => b.id !== id);
    await this.save();
  }

  async addStyle(partial: Omit<StyleDef, 'id'>): Promise<StyleDef> {
    const style: StyleDef = { ...partial, id: nextNumericId(this.settings.styles.map((s) => s.id), true) };
    this.settings.styles.push(style);
    await this.save();
    await this.regenerateAll();
    return style;
  }

  async updateStyle(id: string, patch: Partial<Omit<StyleDef, 'id'>>): Promise<void> {
    const style = this.settings.styles.find((s) => s.id === id);
    if (!style) return;
    Object.assign(style, patch);
    await this.save();
    await this.regenerateAll();
  }

  async deleteStyle(id: string): Promise<void> {
    this.settings.styles = this.settings.styles.filter((s) => s.id !== id);
    if (this.settings.defaultStyleId === id) {
      this.settings.defaultStyleId = this.settings.styles[0]?.id ?? '';
    }
    for (const badge of this.settings.badges) {
      if (badge.styleId === id) badge.styleId = this.settings.defaultStyleId;
    }
    await this.save();
    await this.regenerateAll();
  }
}
```

- [ ] **Step 2: 改 src/main.ts 装配 store（最小版，UI 后续任务接）**

```ts
import { Plugin } from 'obsidian';
import { BadgeStore } from './store.ts';

export default class BadgePlugin extends Plugin {
  store!: BadgeStore;
  version = 0;
  private listeners: Array<() => void> = [];

  async onload(): Promise<void> {
    this.store = new BadgeStore(this);
    await this.store.load();
  }

  bump(): void {
    this.version++;
    for (const cb of this.listeners) cb();
  }

  onChange(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== cb);
    };
  }
}
```

- [ ] **Step 3: 构建验证**

Run: `npm run build`
Expected: 成功生成 main.js，无 TS/esbuild 报错。

- [ ] **Step 4: 提交**

```bash
git add src/store.ts src/main.ts
git commit -m "feat: BadgeStore with settings persistence and SVG file generation"
```

---

### Task 6: DOM 芯片 + #标签 皮肤（阅读模式 + 实时预览）

**Files:**
- Create: `src/ui/chip.ts`, `src/tagskin.ts`
- Modify: `src/main.ts`（注册皮肤）

- [ ] **Step 1: 写 src/ui/chip.ts**

```ts
import type { ChipSpec } from '../core/types.ts';
import { FONT_STACK } from '../core/svg.ts';
import { textColorFor } from '../core/svg.ts';

export function chipSpecFromBadge(badge: { leftText: string; rightText: string; styleId: string }, style: { leftBg: string; rightBg: string }): ChipSpec {
  return { leftText: badge.leftText, rightText: badge.rightText, leftBg: style.leftBg, rightBg: style.rightBg };
}

export function makeChip(spec: ChipSpec): HTMLSpanElement {
  const chip = document.createElement('span');
  chip.className = 'bs-chip';
  chip.style.display = 'inline-flex';
  chip.style.height = '20px';
  chip.style.borderRadius = '4px';
  chip.style.overflow = 'hidden';
  chip.style.fontFamily = FONT_STACK;
  chip.style.fontSize = '11px';
  chip.style.fontWeight = 'bold';
  chip.style.lineHeight = '20px';
  chip.style.verticalAlign = 'middle';
  chip.style.whiteSpace = 'nowrap';

  const seg = (text: string, bg: string) => {
    const s = document.createElement('span');
    s.style.padding = '0 7px';
    s.style.background = bg;
    s.style.color = textColorFor(bg);
    s.textContent = text;
    return s;
  };

  if (spec.leftText !== '') chip.appendChild(seg(spec.leftText, spec.leftBg));
  chip.appendChild(seg(spec.rightText, spec.rightBg));
  return chip;
}
```

- [ ] **Step 2: 写 src/tagskin.ts**

```ts
import { Decoration, ViewPlugin, WidgetType } from '@codemirror/view';
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import type { Plugin } from 'obsidian';
import { matchBadgeForTag } from './core/resolve.ts';
import { makeChip } from './ui/chip.ts';
import type { BadgePlugin } from './main.ts';
import type { ChipSpec } from './core/types.ts';

const TAG_RE = /#[\p{L}\p{N}_/-]+/gu;

function specForTag(plugin: BadgePlugin, tagName: string): ChipSpec {
  const { badges } = plugin.store.settings;
  const matched = matchBadgeForTag(tagName, badges);
  if (matched) {
    const style = plugin.store.styleOf(matched);
    return { leftText: matched.leftText, rightText: matched.rightText, leftBg: style.leftBg, rightBg: style.rightBg };
  }
  const d = plugin.store.defaultStyle();
  return { leftText: '', rightText: tagName, leftBg: d.leftBg, rightBg: d.rightBg };
}

class ChipWidget extends WidgetType {
  spec: ChipSpec;
  constructor(spec: ChipSpec) {
    super();
    this.spec = spec;
  }
  eq(other: ChipWidget): boolean {
    return JSON.stringify(this.spec) === JSON.stringify(other.spec);
  }
  toDOM(): HTMLElement {
    return makeChip(this.spec);
  }
  ignoreEvent(): boolean {
    return true;
  }
}

function inCodeBlock(view: EditorView, pos: number): boolean {
  let node = syntaxTree(view.state).resolveInner(pos, 1);
  while (node) {
    if (/code|math|comment/i.test(node.name)) return true;
    node = node.parent as typeof node;
  }
  return false;
}

function buildDecorations(view: EditorView, plugin: BadgePlugin): DecorationSet {
  if (!plugin.store.settings.renderTags) return Decoration.none;
  const ranges: Array<{ from: number; to: number; deco: ReturnType<typeof Decoration.replace> }> = [];
  const text = view.state.doc.toString();
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(text)) !== null) {
    const from = m.index;
    const to = from + m[0].length;
    if (view.state.selection.ranges.some((r) => r.from < to && r.to > from)) continue;
    if (inCodeBlock(view, from)) continue;
    const spec = specForTag(plugin, m[0].slice(1));
    ranges.push({ from, to, deco: Decoration.replace({ widget: new ChipWidget(spec) }) });
  }
  ranges.sort((a, b) => a.from - b.from);
  return Decoration.set(ranges.map((r) => r.deco.range(r.from, r.to)), true);
}

export function registerTagSkin(plugin: BadgePlugin): void {
  plugin.registerMarkdownPostProcessor((el) => {
    if (!plugin.store.settings.renderTags) return;
    el.querySelectorAll('a.tag').forEach((a) => {
      const tag = (a.textContent ?? '').replace(/^#/, '');
      if (tag === '') return;
      a.replaceWith(makeChip(specForTag(plugin, tag)));
    });
  });

  plugin.registerEditorExtension(
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        version: number;
        constructor(view: EditorView) {
          this.version = plugin.version;
          this.decorations = buildDecorations(view, plugin);
        }
        update(u: ViewUpdate) {
          if (u.docChanged || u.selectionSet || this.version !== plugin.version) {
            this.version = plugin.version;
            this.decorations = buildDecorations(u.view, plugin);
          }
        }
      },
      { decorations: (v) => v.decorations },
    ),
  );
}
```

- [ ] **Step 3: main.ts 注册皮肤**

在 `onload` 的 `await this.store.load();` 之后加一行：
```ts
    registerTagSkin(this);
```
并在文件顶部加：
```ts
import { registerTagSkin } from './tagskin.ts';
```

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 成功（@codemirror/* 为 external，不打包）。

- [ ] **Step 5: 提交**

```bash
git add src/ui/chip.ts src/tagskin.ts src/main.ts
git commit -m "feat: #tag badge skin for reading mode and live preview"
```

---

### Task 7: 插入逻辑 + 命令面板搜索

**Files:**
- Create: `src/ui/insert.ts`
- Modify: `src/main.ts`（注册命令）

- [ ] **Step 1: 写 src/ui/insert.ts**

```ts
import { MarkdownView, Notice, SuggestModal } from 'obsidian';
import type { TFile } from 'obsidian';
import { classifyLink } from '../core/resolve.ts';
import type { BadgePlugin } from '../main.ts';
import type { BadgeDef } from '../core/types.ts';

export async function insertBadgeAtCursor(plugin: BadgePlugin, badge: BadgeDef): Promise<void> {
  const app = plugin.app;
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view || !view.file) {
    new Notice('请先打开一篇笔记再插入徽章');
    return;
  }
  let svgFile = app.vault.getAbstractFileByPath(plugin.store.svgPath(badge)) as TFile | null;
  if (!svgFile) {
    await plugin.store.regenerateBadge(badge);
    svgFile = app.vault.getAbstractFileByPath(plugin.store.svgPath(badge)) as TFile | null;
  }
  if (!svgFile) {
    new Notice('徽章图片文件生成失败，请检查素材文件夹设置');
    return;
  }
  const embed = app.fileManager.generateMarkdownLink(svgFile, view.file.path, undefined, true);
  let text = embed;
  const lk = classifyLink(badge.link);
  if (lk.kind === 'url') {
    text = `[${embed}](${lk.url})`;
  } else if (lk.kind === 'note') {
    const target = app.metadataCache.getFirstLinkpathDest(lk.name, view.file.path);
    const dest = target ? app.fileManager.generateMarkdownLink(target, view.file.path) : lk.name;
    text = `[${embed}](${dest})`;
  }
  const editor = view.editor;
  editor.replaceRange(text, editor.getCursor());
}

export class BadgeInsertModal extends SuggestModal<BadgeDef> {
  plugin: BadgePlugin;
  constructor(plugin: BadgePlugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.setPlaceholder('输入标签名搜索…');
  }
  getSuggestions(query: string): BadgeDef[] {
    const q = query.trim().toLowerCase();
    return this.plugin.store.settings.badges.filter((b) => b.name.toLowerCase().includes(q));
  }
  renderSuggestion(badge: BadgeDef, el: HTMLElement): void {
    el.createSpan({ text: badge.name });
  }
  onChooseItem(badge: BadgeDef): void {
    void insertBadgeAtCursor(this.plugin, badge);
  }
}
```

- [ ] **Step 2: main.ts 注册命令**

在 `onload` 中加：
```ts
    this.addCommand({
      id: 'insert-badge',
      name: '插入徽章：搜索并插入',
      callback: () => new BadgeInsertModal(this).open(),
    });
```
顶部 import：
```ts
import { BadgeInsertModal } from './ui/insert.ts';
```

- [ ] **Step 3: 构建验证**

Run: `npm run build`
Expected: 成功。

- [ ] **Step 4: 提交**

```bash
git add src/ui/insert.ts src/main.ts
git commit -m "feat: cursor insertion with native embed/link syntax and suggest modal command"
```

---

### Task 8: 侧边栏面板

**Files:**
- Create: `src/ui/sidebar.ts`
- Modify: `src/main.ts`（注册 view + ribbon）、`styles.css`

- [ ] **Step 1: 写 src/ui/sidebar.ts**

```ts
import { ItemView, Setting } from 'obsidian';
import type { WorkspaceLeaf } from 'obsidian';
import type { BadgePlugin } from '../main.ts';
import type { BadgeDef } from '../core/types.ts';
import { insertBadgeAtCursor } from './insert.ts';

export const SIDEBAR_VIEW_TYPE = 'badge-studio-sidebar';

export class BadgeSidebarView extends ItemView {
  plugin: BadgePlugin;
  private unsubscribe: (() => void) | null = null;
  private search = '';

  constructor(leaf: WorkspaceLeaf, plugin: BadgePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return SIDEBAR_VIEW_TYPE;
  }
  getDisplayText(): string {
    return '徽章工坊';
  }
  getIcon(): string {
    return 'shield';
  }

  async onOpen(): Promise<void> {
    this.unsubscribe = this.plugin.onChange(() => this.render());
    this.render();
  }
  async onClose(): Promise<void> {
    if (this.unsubscribe) this.unsubscribe();
  }

  private dataUri(badge: BadgeDef): string {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(this.plugin.store.buildSvg(badge));
  }

  private render(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('bs-sidebar');

    new Setting(root).addSearch((s) => {
      s.setPlaceholder('搜索标签…');
      s.onChange((v) => {
        this.search = v.trim().toLowerCase();
        this.renderList(listEl);
      });
    });

    const listEl = root.createDiv({ cls: 'bs-list' });
    this.renderList(listEl);

    const formWrap = root.createDiv({ cls: 'bs-temp-form', attr: { style: 'display:none' } });
    this.buildTempForm(formWrap);

    new Setting(root)
      .addButton((b) => {
        b.setButtonText('临时徽章').onClick(() => {
          formWrap.style.display = formWrap.style.display === 'none' ? 'block' : 'none';
        });
      })
      .addButton((b) => {
        b.setButtonText('打开设置').onClick(() => {
          (this.app as unknown as { setting?: { openTabById: (id: string) => unknown } }).setting?.openTabById(this.plugin.manifest.id);
        });
      });
  }

  private renderList(listEl: HTMLElement): void {
    listEl.empty();
    const badges = this.plugin.store.settings.badges.filter((b) => b.name.toLowerCase().includes(this.search));
    for (const badge of badges) {
      const row = listEl.createDiv({ cls: 'bs-row' });
      row.createEl('img', { attr: { src: this.dataUri(badge) } });
      row.createSpan({ text: badge.name });
      row.onClickEvent(() => void insertBadgeAtCursor(this.plugin, badge));
    }
    if (badges.length === 0) listEl.createDiv({ cls: 'bs-empty', text: '没有匹配的标签' });
  }

  private buildTempForm(wrap: HTMLElement): void {
    let leftText = '';
    let rightText = '';
    let styleId = this.plugin.store.settings.defaultStyleId;
    new Setting(wrap).setName('左字（留空＝单段）').addText((t) => t.onChange((v) => (leftText = v)));
    new Setting(wrap).setName('右字').addText((t) => t.onChange((v) => (rightText = v)));
    new Setting(wrap).setName('样式').addDropdown((d) => {
      for (const s of this.plugin.store.settings.styles) d.addOption(s.id, s.name);
      d.setValue(styleId);
      d.onChange((v) => (styleId = v));
    });
    new Setting(wrap).addButton((b) => {
      b.setButtonText('生成并插入').setCta();
      b.onClick(async () => {
        if (rightText.trim() === '') return;
        const n = this.plugin.store.settings.badges.filter((x) => x.name.startsWith('临时')).length + 1;
        const badge = await this.plugin.store.addBadge({
          name: `临时 ${n}`,
          leftText: leftText.trim(),
          rightText: rightText.trim(),
          styleId,
          tag: '',
          link: '',
        });
        await insertBadgeAtCursor(this.plugin, badge);
      });
    });
  }
}
```

- [ ] **Step 2: main.ts 注册 view 与 ribbon**

在 `onload` 中加：
```ts
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new BadgeSidebarView(leaf, this));
    this.addRibbonIcon('shield', '徽章工坊：插入徽章', () => void this.revealSidebar());
```
新增方法：
```ts
  async revealSidebar(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE)[0];
    if (existing) {
      await this.app.workspace.revealLeaf(existing);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: SIDEBAR_VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }
```
顶部 import：
```ts
import { BadgeSidebarView, SIDEBAR_VIEW_TYPE } from './ui/sidebar.ts';
```

- [ ] **Step 3: 写 styles.css**

```css
.bs-sidebar { padding: 8px; }
.bs-list { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
.bs-row { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 6px; cursor: pointer; }
.bs-row:hover { background: var(--background-modifier-hover); }
.bs-row img { flex-shrink: 0; }
.bs-empty { color: var(--text-muted); font-size: 12px; padding: 8px; }
.bs-temp-form { border-top: 1px solid var(--background-modifier-border); margin-top: 8px; padding-top: 4px; }
.bs-chip { user-select: none; }
```

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 成功。

- [ ] **Step 5: 提交**

```bash
git add src/ui/sidebar.ts src/main.ts styles.css
git commit -m "feat: sidebar badge picker with live previews and temp badge form"
```

---

### Task 9: 设置界面（两层标签库）

**Files:**
- Create: `src/ui/settingsTab.ts`
- Modify: `src/main.ts`（addSettingTab）

- [ ] **Step 1: 写 src/ui/settingsTab.ts**

```ts
import { App, Modal, PluginSettingTab, Setting } from 'obsidian';
import type { BadgePlugin } from '../main.ts';
import type { BadgeDef, StyleDef } from '../core/types.ts';

function addColor(control: HTMLElement, value: string, onChange: (v: string) => void): void {
  const picker = control.createEl('input', { attr: { type: 'color', value } });
  const text = control.createEl('input', { attr: { type: 'text', value, size: '8' } });
  picker.addEventListener('input', () => {
    text.value = picker.value;
    onChange(picker.value);
  });
  text.addEventListener('change', () => {
    const v = text.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      picker.value = v;
      onChange(v);
    } else {
      text.value = picker.value;
    }
  });
}

class StyleEditModal extends Modal {
  plugin: BadgePlugin;
  existing: StyleDef | null;
  name = '';
  leftBg = '#555555';
  rightBg = '#ffd400';

  constructor(plugin: BadgePlugin, existing: StyleDef | null) {
    super(plugin.app);
    this.plugin = plugin;
    this.existing = existing;
    if (existing) {
      this.name = existing.name;
      this.leftBg = existing.leftBg;
      this.rightBg = existing.rightBg;
    }
  }

  onOpen(): void {
    const { contentEl } = this;
    this.setTitle(this.existing ? '编辑样式' : '新建样式');
    new Setting(contentEl).setName('名字').addText((t) => {
      t.setValue(this.name);
      t.onChange((v) => (this.name = v));
    });
    const leftRow = new Setting(contentEl).setName('左块颜色');
    addColor(leftRow.controlEl, this.leftBg, (v) => (this.leftBg = v));
    const rightRow = new Setting(contentEl).setName('右块颜色');
    addColor(rightRow.controlEl, this.rightBg, (v) => (this.rightBg = v));
    new Setting(contentEl).addButton((b) => {
      b.setButtonText('保存').setCta();
      b.onClick(async () => {
        if (this.name.trim() === '') return;
        if (this.existing) {
          await this.plugin.store.updateStyle(this.existing.id, { name: this.name.trim(), leftBg: this.leftBg, rightBg: this.rightBg });
        } else {
          await this.plugin.store.addStyle({ name: this.name.trim(), leftBg: this.leftBg, rightBg: this.rightBg });
        }
        this.close();
      });
    });
  }
  onClose(): void {
    this.contentEl.empty();
  }
}

class BadgeEditModal extends Modal {
  plugin: BadgePlugin;
  existing: BadgeDef | null;
  name = '';
  leftText = '';
  rightText = '';
  styleId: string;
  tag = '';
  link = '';

  constructor(plugin: BadgePlugin, existing: BadgeDef | null) {
    super(plugin.app);
    this.plugin = plugin;
    this.existing = existing;
    this.styleId = plugin.store.settings.defaultStyleId;
    if (existing) Object.assign(this, { name: existing.name, leftText: existing.leftText, rightText: existing.rightText, styleId: existing.styleId, tag: existing.tag, link: existing.link });
  }

  onOpen(): void {
    const { contentEl } = this;
    this.setTitle(this.existing ? '编辑标签' : '新建标签');
    new Setting(contentEl).setName('名字（用于搜索/列表）').addText((t) => t.setValue(this.name).onChange((v) => (this.name = v)));
    new Setting(contentEl).setName('左字（留空＝单段）').addText((t) => t.setValue(this.leftText).onChange((v) => (this.leftText = v)));
    new Setting(contentEl).setName('右字').addText((t) => t.setValue(this.rightText).onChange((v) => (this.rightText = v)));
    new Setting(contentEl).setName('样式').addDropdown((d) => {
      for (const s of this.plugin.store.settings.styles) d.addOption(s.id, s.name);
      d.setValue(this.styleId);
      d.onChange((v) => (this.styleId = v));
    });
    new Setting(contentEl).setName('对应 #标签（选填）').addText((t) => t.setValue(this.tag).onChange((v) => (this.tag = v.replace(/^#/, ''))));
    new Setting(contentEl).setName('链接（选填：网址或笔记名）').addText((t) => t.setValue(this.link).onChange((v) => (this.link = v)));
    new Setting(contentEl).addButton((b) => {
      b.setButtonText('保存').setCta();
      b.onClick(async () => {
        if (this.name.trim() === '' || this.rightText.trim() === '') return;
        const patch = { name: this.name.trim(), leftText: this.leftText.trim(), rightText: this.rightText.trim(), styleId: this.styleId, tag: this.tag.trim(), link: this.link.trim() };
        if (this.existing) await this.plugin.store.updateBadge(this.existing.id, patch);
        else await this.plugin.store.addBadge(patch);
        this.close();
      });
    });
  }
  onClose(): void {
    this.contentEl.empty();
  }
}

export class BadgeSettingTab extends PluginSettingTab {
  plugin: BadgePlugin;
  constructor(app: App, plugin: BadgePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName('把 #标签 渲染成徽章').setDesc('实时渲染；关闭或卸载插件后 #标签 恢复原样').addToggle((t) => {
      t.setValue(this.plugin.store.settings.renderTags);
      t.onChange(async (v) => {
        this.plugin.store.settings.renderTags = v;
        await this.plugin.store.save();
      });
    });

    new Setting(containerEl).setName('默认样式').setDesc('#标签 未匹配到条目时使用的样式').addDropdown((d) => {
      for (const s of this.plugin.store.settings.styles) d.addOption(s.id, s.name);
      d.setValue(this.plugin.store.settings.defaultStyleId);
      d.onChange(async (v) => {
        this.plugin.store.settings.defaultStyleId = v;
        await this.plugin.store.save();
      });
    });

    new Setting(containerEl).setName('素材文件夹名').setDesc('SVG 小图存放的库内文件夹；改名会自动搬迁文件').addText((t) => {
      t.setValue(this.plugin.store.settings.assetsFolder);
      t.inputEl.addEventListener('change', async () => {
        const v = t.getValue().trim();
        if (v === '' || v === this.plugin.store.settings.assetsFolder) return;
        await this.plugin.store.renameAssetsFolder(v);
        this.display();
      });
    });

    containerEl.createEl('h3', { text: '样式库' });
    for (const style of this.plugin.store.settings.styles) {
      const row = new Setting(containerEl).setName(style.name).setDesc(`左 ${style.leftBg} ／ 右 ${style.rightBg}`);
      row.controlEl.createSpan({ cls: 'bs-swatch', attr: { style: `background:${style.leftBg}` } });
      row.controlEl.createSpan({ cls: 'bs-swatch', attr: { style: `background:${style.rightBg}` } });
      row.addButton((b) => b.setButtonText('编辑').onClick(() => new StyleEditModal(this.plugin, style).open()));
      row.addButton((b) => b.setButtonText('删除').setWarning().onClick(async () => {
        await this.plugin.store.deleteStyle(style.id);
        this.display();
      }));
    }
    new Setting(containerEl).addButton((b) => b.setButtonText('新建样式').setCta().onClick(() => new StyleEditModal(this.plugin, null).open()));

    containerEl.createEl('h3', { text: '标签库' });
    for (const badge of this.plugin.store.settings.badges) {
      const svg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(this.plugin.store.buildSvg(badge));
      const row = new Setting(containerEl).setName(badge.name);
      row.controlEl.createEl('img', { attr: { src: svg, style: 'margin-right:8px' } });
      row.addButton((b) => b.setButtonText('编辑').onClick(() => new BadgeEditModal(this.plugin, badge).open()));
      row.addButton((b) => b.setButtonText('删除').setWarning().onClick(async () => {
        await this.plugin.store.deleteBadge(badge.id);
        this.display();
      }));
    }
    new Setting(containerEl).addButton((b) => b.setButtonText('新建标签').setCta().onClick(() => new BadgeEditModal(this.plugin, null).open()));
  }
}
```

- [ ] **Step 2: styles.css 追加色块样式**

```css
.bs-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; margin-left: 6px; vertical-align: middle; border: 1px solid var(--background-modifier-border); }
```

- [ ] **Step 3: main.ts 注册设置页**

在 `onload` 中加：
```ts
    this.addSettingTab(new BadgeSettingTab(this.app, this));
```
顶部 import：
```ts
import { BadgeSettingTab } from './ui/settingsTab.ts';
```

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 成功。

- [ ] **Step 5: 提交**

```bash
git add src/ui/settingsTab.ts src/main.ts styles.css
git commit -m "feat: two-layer settings UI with style/badge editors and folder rename"
```

---

### Task 10: 安装进 Lacquervii 库 + 全量人工验收

**Files:**
- Modify: 库内 `.obsidian/plugins/badge-studio/`（main.js、manifest.json、styles.css、versions.json）、`.obsidian/community-plugins.json`

- [ ] **Step 1: 生产构建**

Run: `npm run build`
Expected: main.js 生成（无 sourcemap）。

- [ ] **Step 2: 复制到库插件目录**

```bash
V="/Users/farroadeta/Library/Mobile Documents/iCloud~md~obsidian/Documents/Lacquervii/.obsidian/plugins/badge-studio"
mkdir -p "$V" && cp main.js manifest.json styles.css versions.json "$V/"
```
Expected: 无输出即成功；`ls "$V"` 见 4 个文件。

- [ ] **Step 3: 启用插件**

读 `.obsidian/community-plugins.json`，若数组中无 `"badge-studio"` 则追加写回。然后请用户在 Obsidian 里执行命令面板「Reload app without saving」（或重启 Obsidian）。

- [ ] **Step 4: 建测试笔记并逐项验收（对照 spec 第 10 节清单）**

测试笔记内容先手写两行嵌图验证耐用路径：`![[badge-001.svg]] ![[badge-003.svg]]`。
逐项过：
1. 侧边栏（ribbon 盾牌图标）点插单段/两段徽章；编辑、阅读两模式看显示；
2. 同行连点成排、超宽换行、换行分排；
3. 临时徽章表单造一个并插入；
4. 命令面板「插入徽章：搜索并插入」；
5. 设置里给某标签加链接（网址＋笔记名各建一个），阅读模式点击跳转；
6. 设置里改某标签文字/配色 → 所有引用处一起变；
7. #标签 皮肤：正文写 `#现代汉语`（先给某条目填对应 tag）与 `#随便` 各一，看匹配/默认两种样子；代码块里写 `#现代汉语` 不变；开关关掉恢复原样；
8. 光标点到嵌图行露出原始语法、可编辑；
9. **设置里禁用插件 → 重开笔记：SVG 徽章依旧显示、链接依旧可点**（核心要求）；#标签 皮肤消失属预期。

- [ ] **Step 5: 修复验收中发现的问题（如有），重新 build + 复制 + reload，复测**

- [ ] **Step 6: 提交**

```bash
git commit -am "fix: issues found during vault acceptance" || echo "无改动，跳过"
```

---

### Task 11: 收尾

- [ ] **Step 1: 跑全部单测 + 构建**

Run: `npm test && npm run build`
Expected: 全 PASS、构建成功。

- [ ] **Step 2: 打 tag**

```bash
git tag v1.0.0
```

- [ ] **Step 3: 向用户交付说明（口头/聊天）**

用大白话讲：怎么开侧边栏、怎么加样式/标签、临时徽章、#标签开关在哪、素材文件夹是什么、为什么卸了插件徽章还在。

---

## 增量计划（2026-10-14 设计变更：混合方案，已执行）

背景：纯 SVG 嵌图会被 notebook-navigator 日记卡片当作「正文第一张图」抓去当封面。与用户确认改为：日常＝标记行（`badge: 标签名`，插件渲染、非图片），需要耐用时一键「固化」成 SVG 图片行，可「还原」。

- [x] Task 12a: `src/core/parse.ts`（MARKER_RE/parseBadgeMarker/findMarkerRuns/markerText）+ `tests/parse.test.ts`（15 测全过）
- [x] Task 12b: `src/markerskin.ts` 标记渲染（阅读模式 p 段替换＋LP 多行 Range replace 成排 widget；未知标签名保留原文；代码块跳过；阅读模式带链接徽章可点击）；`src/cm.ts` 抽出共享 inCodeBlock
- [x] Task 12c: `src/freeze.ts` 固化/还原（标记排→一行多嵌图，带链接包链接语法；纯徽章图片行→标记行）；main.ts 注册 2 命令；侧边栏加「固化本篇/还原本篇」按钮
- [x] Task 12d: `src/ui/insert.ts` 改为插入标记行；拖拽 dataTransfer 写标记文本；测试笔记更新为标记形态；重新部署进库

验收新增项（待用户执行）：标记在编辑/阅读两模式渲染成徽章；固化后变图片且可被封面抓取（预期）；还原回标记；notebook-navigator 卡片不再抓标记当封面。

---

## 增量计划·第二轮（2026-10-14 管理面板反馈 + LP 渲染修复，已执行）

背景：管理面板 v1 上线后用户反馈一系列体验问题，并发现实时预览拖入第二个徽章时装饰残留/不更新。

- [x] Task 13a: 修复 LP 渲染 bug —— 跨行 `Decoration.replace` 必须 `block: true`（CM6 规则，违反会导致 widget 残留/丢失）；`src/markerskin.ts`
- [x] Task 13b: 移除 #标签 皮肤功能（用户确认「标签不作为徽章」）—— 删 `src/tagskin.ts`，移除 `renderTags` 设置与开关、`BadgeDef.tag` 字段及编辑弹窗对应行、`matchBadgeForTag`
- [x] Task 13c: 管理面板重做工作台 —— 文件夹式分组（根目录分组卡片可新建/重命名/删除分组，点入面包屑导航，设置新增 `groups` 字段持久化空分组）；样式库移入二级页；引用统计改为点击弹 `RefsModal` 跳转列表（不再一级页面展开）；徽章卡片去掉样式/#tag 等标注；`BadgeEditModal` 支持预设分组
- [x] 部署进库；tsc 零错误、18 测试全过、构建成功

验收新增项（待用户执行）：编辑器里连拖两个徽章正常成排、无残留；工作台根目录分组文件夹点击进入/返回；新建分组直接可用；引用数点击弹窗跳转笔记。

---

## 增量计划·第三轮（2026-10-14 编辑体验反馈：拖入后仍无法输入/换行、渲染不稳，已执行）

根因分析（三个叠加问题，全部修复）：

1. **拖入后无法输入/换行（要全选才进得了文字编辑）**：`view.focus()` 在 drop 事件内同步调用，随后浏览器 dragend 默认行为把焦点抢回去。修复：`stopPropagation`（顺带防止 Obsidian/其他插件对同一次拖放重复插入）＋ `setTimeout` 延迟二次聚焦；`src/drop.ts`
2. **编辑器渲染不稳（第二个徽章不显示/widget 残留、与阅读模式不一致）**：跨多行 replace 装饰（inline 或 block）在实时预览里边界情况太多。修复：编辑模式改为**每行一个单行内联 `ChipWidget`**（CM6 最标准模式，范围永不跨行）；阅读模式保持横排合并不变。视觉差异：编辑模式徽章逐行竖排，阅读模式自动合并横排；`src/markerskin.ts`
3. **点击/命令插入后看不到徽章**：旧 `insertBadgeAtCursor` 把光标留在标记行上（按设计该行显示原文），继续打字还会破坏标记。修复：插入时标记强制独占一行（空行整行替换，非空行插到下一行），插入后光标自动落到标记行下一行行首并聚焦，徽章立即渲染；`src/ui/insert.ts`

- [x] 上述三处修复；tsc 零错误、18 测试全过、构建成功；已部署进库

---

## 增量计划·第四轮（2026-10-14 界面打磨：侧边栏排版 + 徽章详情页，已执行）

- [x] Task 14a: 侧边栏重排 —— 搜索框置顶（原生 SearchComponent）、徽章列表 flex 滚动、底部图标按钮（临时/固化/还原/工作台/设置，悬停提示）；去掉挤压的文字按钮行
- [x] Task 14b: 徽章详情二级页 —— 工作台点徽章不再弹编辑框，进入详情页：徽章大图 + 链接；「样式」区块（色块＋名字＋色值）；「引用」区块列出引用笔记（标题＋路径＋数量，点击打开），每条带内容预览（跳过 frontmatter/标题/标记行取前 90 字），预览开关持久化在 settings.refsPreview；编辑/删除收进详情页头部图标
- [x] 分组管理确认：保持胶囊筛选 + 「管理分组」弹窗形态（用户反馈不要文件浏览器式界面、不要常驻重命名/删除按钮）
