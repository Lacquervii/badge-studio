import type { TFile } from 'obsidian';
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
      this.settings = { ...defaultSettings(), ...(data as BadgeSettings) };
      for (const b of this.settings.badges) {
        if (typeof b.group !== 'string') b.group = '';
      }
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

  groups(): string[] {
    const set = new Set<string>();
    for (const b of this.settings.badges) if (b.group !== '') set.add(b.group);
    return [...set].sort();
  }

  styleUsage(styleId: string): number {
    return this.settings.badges.filter((b) => b.styleId === styleId).length;
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
