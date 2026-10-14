import { TFolder } from 'obsidian';
import type { TFile } from 'obsidian';
import type { BadgePlugin } from './main.ts';
import { defaultSettings, FALLBACK_PALETTE, nextNumericId } from './core/defaults.ts';
import { resolveLogo } from './core/logo.ts';
import { migrateBadgeColors, migrateBadgeLogos } from './core/migrate.ts';
import type { LegacyBadge } from './core/migrate.ts';
import { buildBadgeSvg, FONT_STACK } from './core/svg.ts';
import { stripBadgeReferences } from './core/strip.ts';
import type { BadgeDef, BadgeSettings, LogoSpec, Palette, StyleDef } from './core/types.ts';

export class BadgeStore {
  plugin: BadgePlugin;
  settings: BadgeSettings = defaultSettings();
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(plugin: BadgePlugin) {
    this.plugin = plugin;
  }

  /**
   * 读取设置并做兼容迁移（不写库文件），让渲染时数据立即可用。
   * 素材文件的重生成单独走 regenerateAll（放到后台，避免启动早期写文件失败拖垮插件）。
   */
  async loadSettings(): Promise<void> {
    const data = await this.plugin.loadData();
    if (data && Array.isArray(data.styles) && Array.isArray(data.badges)) {
      this.settings = { ...defaultSettings(), ...(data as BadgeSettings) };
      if (this.settings.sidebarView !== 'list' && this.settings.sidebarView !== 'grid') {
        this.settings.sidebarView = 'list';
      }
      if (!Array.isArray((data as { groups?: unknown }).groups)) {
        this.settings.groups = [...new Set(this.settings.badges.map((b) => b.group).filter((g) => g !== ''))].sort();
      }
      for (const st of this.settings.styles) {
        if (typeof st.leftBg !== 'string') st.leftBg = FALLBACK_PALETTE.leftBg;
        if (typeof st.rightBg !== 'string') st.rightBg = FALLBACK_PALETTE.rightBg;
        if (typeof st.leftTextColor !== 'string') st.leftTextColor = '';
        if (typeof st.rightTextColor !== 'string') st.rightTextColor = '';
      }
      let migrated = false;
      for (const b of this.settings.badges) {
        if (typeof b.group !== 'string') b.group = '';
        const target = b as LegacyBadge;
        // 旧数据里徽章只有 styleId：把对应样式的颜色复制到徽章自己身上，此后与样式库无关
        if (migrateBadgeColors(target, this.settings.styles, this.defaultPalette())) migrated = true;
        // 更早的版本只有一个图标位（logo）→ 迁移成「左段最左」，其余三个位置补空
        if (migrateBadgeLogos(target)) migrated = true;
      }
      if (migrated) await this.save();
    } else {
      this.settings = defaultSettings();
      await this.save();
    }
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

  /** 样式库里某个样式的配色（用于「套用样式」、新建徽章时的初始色） */
  paletteOfStyle(styleId: string): Palette | null {
    const s = this.settings.styles.find((x) => x.id === styleId);
    if (!s) return null;
    return { leftBg: s.leftBg, rightBg: s.rightBg, leftTextColor: s.leftTextColor, rightTextColor: s.rightTextColor };
  }

  /** 新建徽章的初始配色：取自「默认样式」，样式库为空时用兜底色 */
  defaultPalette(): Palette {
    return this.paletteOfStyle(this.settings.defaultStyleId) ?? this.settings.styles[0] ?? { ...FALLBACK_PALETTE };
  }

  /** 四个位置的图标（解析成可直接内联的片段） */
  logosOf(badge: Pick<BadgeDef, 'logoLeft' | 'logoLeftInner' | 'logoRightInner' | 'logoRight'>): {
    logoLeft: LogoSpec | null;
    logoLeftInner: LogoSpec | null;
    logoRightInner: LogoSpec | null;
    logoRight: LogoSpec | null;
  } {
    return {
      logoLeft: resolveLogo(badge.logoLeft),
      logoLeftInner: resolveLogo(badge.logoLeftInner),
      logoRightInner: resolveLogo(badge.logoRightInner),
      logoRight: resolveLogo(badge.logoRight),
    };
  }

  groups(): string[] {
    const set = new Set<string>(this.settings.groups);
    for (const b of this.settings.badges) if (b.group !== '') set.add(b.group);
    return [...set].sort();
  }

  async addGroup(name: string): Promise<void> {
    const n = name.trim();
    if (n === '' || this.settings.groups.includes(n)) return;
    this.settings.groups.push(n);
    await this.save();
  }

  async renameGroup(oldName: string, newName: string): Promise<void> {
    const n = newName.trim();
    if (n === '' || n === oldName) return;
    this.settings.groups = this.settings.groups.filter((g) => g !== oldName && g !== n);
    this.settings.groups.push(n);
    for (const b of this.settings.badges) {
      if (b.group === oldName) b.group = n;
    }
    await this.save();
  }

  async clearGroup(name: string): Promise<void> {
    this.settings.groups = this.settings.groups.filter((g) => g !== name);
    for (const b of this.settings.badges) {
      if (b.group === name) b.group = '';
    }
    await this.save();
  }

  svgPath(badge: BadgeDef): string {
    return `${this.settings.assetsFolder}/badge-${badge.id}.svg`;
  }

  buildSvg(badge: BadgeDef): string {
    return buildBadgeSvg(
      { leftText: badge.leftText, rightText: badge.rightText, ...this.logosOf(badge) },
      badge,
      (t) => this.measureText(t),
    );
  }

  /** 编辑弹窗里的实时预览：用尚未保存的字段直接出图 */
  previewSvg(
    badge: { leftText: string; rightText: string } & Record<
      'logoLeft' | 'logoLeftInner' | 'logoRightInner' | 'logoRight',
      string
    > &
      Palette,
  ): string {
    return buildBadgeSvg(
      { leftText: badge.leftText, rightText: badge.rightText, ...this.logosOf(badge) },
      badge,
      (t) => this.measureText(t),
    );
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
    if (file) await this.plugin.app.vault.modify(file as TFile, svg);
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
    const badge = this.settings.badges.find((b) => b.id === id);
    this.settings.badges = this.settings.badges.filter((b) => b.id !== id);
    await this.save();
    if (!badge) return;
    await this.stripReferences(badge);
    await this.trashAsset(badge);
  }

  /** 把徽章的素材 SVG 移入回收站（正文里的引用已由 stripReferences 清掉） */
  private async trashAsset(badge: BadgeDef): Promise<void> {
    const file = this.plugin.app.vault.getAbstractFileByPath(this.svgPath(badge));
    if (file) await this.plugin.app.fileManager.trashFile(file);
  }

  /**
   * 清理素材文件夹里不属于任何徽章的 badge-xxx.svg（历史遗留的孤儿文件）。
   * 只认 badge-数字.svg 这一种命名，其他手动放进来的文件不动。返回清理数量。
   */
  async cleanOrphanAssets(): Promise<number> {
    const folder = this.plugin.app.vault.getAbstractFileByPath(this.settings.assetsFolder);
    if (!(folder instanceof TFolder)) return 0;
    const ids = new Set(this.settings.badges.map((b) => b.id));
    let removed = 0;
    for (const child of [...folder.children]) {
      const m = /^badge-(\d+)\.svg$/.exec(child.name);
      if (!m || ids.has(m[1])) continue;
      await this.plugin.app.fileManager.trashFile(child);
      removed++;
    }
    return removed;
  }

  /** 删除徽章后，把全库正文里的标记行和已固化图片一并清掉 */
  private async stripReferences(badge: BadgeDef): Promise<void> {
    const needleName = `badge: ${badge.name}`;
    const needleSvg = `badge-${badge.id}.svg`;
    for (const file of this.plugin.app.vault.getMarkdownFiles()) {
      const text = await this.plugin.app.vault.cachedRead(file);
      if (!text.includes(needleName) && !text.includes(needleSvg)) continue;
      const next = stripBadgeReferences(text, badge.name, badge.id);
      if (next !== text) await this.plugin.app.vault.modify(file, next);
    }
  }

  async addStyle(partial: Omit<StyleDef, 'id'>): Promise<StyleDef> {
    const style: StyleDef = { ...partial, id: nextNumericId(this.settings.styles.map((s) => s.id), true) };
    this.settings.styles.push(style);
    await this.save();
    return style;
  }

  /** 样式只是取色模板：改样式不会改动任何已创建的徽章 */
  async updateStyle(id: string, patch: Partial<Omit<StyleDef, 'id'>>): Promise<void> {
    const style = this.settings.styles.find((s) => s.id === id);
    if (!style) return;
    Object.assign(style, patch);
    await this.save();
  }

  /** 删样式同样不影响徽章：徽章的颜色早就复制在自己身上了 */
  async deleteStyle(id: string): Promise<void> {
    this.settings.styles = this.settings.styles.filter((s) => s.id !== id);
    if (this.settings.defaultStyleId === id) {
      this.settings.defaultStyleId = this.settings.styles[0]?.id ?? '';
    }
    await this.save();
  }
}
