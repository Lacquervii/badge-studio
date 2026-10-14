import { ItemView, Modal, Notice, Setting, TFile } from 'obsidian';
import type { WorkspaceLeaf } from 'obsidian';
import { exportJson, mergeImport } from '../core/io.ts';
import { PRESET_LEFT_BG, PRESET_STYLES } from '../core/presets.ts';
import { findBadgeReferences } from '../core/refs.ts';
import type { BadgeRef } from '../core/refs.ts';
import type { BadgeDef } from '../core/types.ts';
import type { BadgePlugin } from '../main.ts';
import { ConfirmModal } from './confirm.ts';
import { BadgeEditModal, StyleEditModal } from './settingsTab.ts';

export const MANAGER_VIEW_TYPE = 'badge-studio-manager';

const GROUP_ALL = '*';

class PresetModal extends Modal {
  plugin: BadgePlugin;
  constructor(plugin: BadgePlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }
  onOpen(): void {
    this.render();
  }
  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.setTitle('预设配色（shields.io 经典）');
    for (const p of PRESET_STYLES) {
      const exists = this.plugin.store.settings.styles.some((s) => s.name === p.name);
      const row = new Setting(contentEl).setName(p.name).setDesc(`左 ${PRESET_LEFT_BG} ／ 右 ${p.rightBg}`);
      row.controlEl.createSpan({ cls: 'bs-swatch', attr: { style: `background:${PRESET_LEFT_BG}` } });
      row.controlEl.createSpan({ cls: 'bs-swatch', attr: { style: `background:${p.rightBg}` } });
      row.addButton((b) => {
        b.setButtonText(exists ? '已添加' : '添加').setDisabled(exists);
        if (!exists) b.setCta();
        b.onClick(async () => {
          await this.plugin.store.addStyle({ name: p.name, leftBg: PRESET_LEFT_BG, rightBg: p.rightBg });
          new Notice(`已添加样式「${p.name}」`);
          this.render();
        });
      });
    }
  }
  onClose(): void {
    this.contentEl.empty();
  }
}

export class BadgeManagerView extends ItemView {
  plugin: BadgePlugin;
  private unsubscribe: (() => void) | null = null;
  private search = '';
  private groupFilter = GROUP_ALL;
  private refs: Map<string, BadgeRef[]> | null = null;
  private expandedRefs = new Set<string>();

  constructor(leaf: WorkspaceLeaf, plugin: BadgePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return MANAGER_VIEW_TYPE;
  }
  getDisplayText(): string {
    return '徽章管理';
  }
  getIcon(): string {
    return 'shield';
  }

  async onOpen(): Promise<void> {
    this.unsubscribe = this.plugin.onChange(() => void this.refreshRefs());
    this.render();
    await this.refreshRefs();
  }
  async onClose(): Promise<void> {
    if (this.unsubscribe) this.unsubscribe();
  }

  private async refreshRefs(): Promise<void> {
    const names = this.plugin.store.settings.badges.map((b) => b.name);
    this.refs = await findBadgeReferences(this.app, names);
    this.renderBody();
  }

  private dataUri(badge: BadgeDef): string {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(this.plugin.store.buildSvg(badge));
  }

  private render(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('bs-mgr');
    this.buildToolbar(root);
    root.createDiv({ cls: 'bs-mgr-body' });
    this.renderBody();
  }

  private renderBody(): void {
    const body = this.containerEl.querySelector('.bs-mgr-body') as HTMLElement | null;
    if (!body) return;
    body.empty();
    this.renderBadges(body);
    this.renderStyles(body);
  }

  private buildToolbar(root: HTMLElement): void {
    const bar = root.createDiv({ cls: 'bs-mgr-toolbar' });

    const search = bar.createEl('input', { attr: { type: 'text', placeholder: '搜索徽章…' } });
    search.value = this.search;
    search.addEventListener('input', () => {
      this.search = search.value.trim().toLowerCase();
      this.renderBody();
    });

    const select = bar.createEl('select');
    const groups = this.plugin.store.groups();
    if (this.groupFilter !== GROUP_ALL && this.groupFilter !== '' && !groups.includes(this.groupFilter)) {
      this.groupFilter = GROUP_ALL;
    }
    const options: Array<{ value: string; label: string }> = [
      { value: GROUP_ALL, label: '全部分组' },
      ...groups.map((g) => ({ value: g, label: g })),
      { value: '', label: '未分组' },
    ];
    for (const o of options) {
      const opt = select.createEl('option', { text: o.label, attr: { value: o.value } });
      if (o.value === this.groupFilter) opt.selected = true;
    }
    select.addEventListener('change', () => {
      this.groupFilter = select.value;
      this.renderBody();
    });

    const btn = (text: string, onClick: () => void, cta = false): void => {
      const b = bar.createEl('button', { text });
      if (cta) b.addClass('mod-cta');
      b.addEventListener('click', onClick);
    };
    btn('新建徽章', () => new BadgeEditModal(this.plugin, null).open(), true);
    btn('新建样式', () => new StyleEditModal(this.plugin, null).open());
    btn('预设配色', () => new PresetModal(this.plugin).open());
    btn('导入 JSON', () => this.pickImportFile());
    btn('导出 JSON', () => this.exportAll());
    btn('刷新统计', () => void this.refreshRefs());
  }

  private filteredBadges(): BadgeDef[] {
    return this.plugin.store.settings.badges.filter((b) => {
      if (this.search !== '' && !b.name.toLowerCase().includes(this.search)) return false;
      if (this.groupFilter === GROUP_ALL) return true;
      return b.group === this.groupFilter;
    });
  }

  private renderBadges(body: HTMLElement): void {
    const badges = this.filteredBadges();
    const byGroup = new Map<string, BadgeDef[]>();
    for (const b of badges) {
      const arr = byGroup.get(b.group) ?? [];
      arr.push(b);
      byGroup.set(b.group, arr);
    }
    const order = [...byGroup.keys()].filter((g) => g !== '').sort();
    if (byGroup.has('')) order.push('');

    body.createEl('h3', { text: `徽章库（${badges.length}）` });
    if (badges.length === 0) {
      body.createDiv({ cls: 'bs-empty', text: '没有匹配的徽章' });
      return;
    }
    for (const g of order) {
      const list = byGroup.get(g)!;
      const section = body.createEl('details', { cls: 'bs-mgr-group' });
      section.open = true;
      section.createEl('summary', { text: `${g === '' ? '未分组' : g}（${list.length}）` });
      const grid = section.createDiv({ cls: 'bs-mgr-grid' });
      for (const badge of list) this.renderCard(grid, badge);
    }
  }

  private renderCard(grid: HTMLElement, badge: BadgeDef): void {
    const card = grid.createDiv({ cls: 'bs-mgr-card' });

    const head = card.createDiv({ cls: 'bs-mgr-card-head' });
    head.createEl('img', { attr: { src: this.dataUri(badge), draggable: 'false' } });
    head.createSpan({ cls: 'bs-mgr-card-name', text: badge.name });

    const style = this.plugin.store.styleOf(badge);
    const metaParts = [`样式：${style.name}`];
    if (badge.tag !== '') metaParts.push(`#${badge.tag}`);
    if (badge.link !== '') metaParts.push('含链接');
    card.createDiv({ cls: 'bs-mgr-card-meta', text: metaParts.join(' · ') });

    const refsEl = card.createDiv({ cls: 'bs-mgr-card-refs' });
    if (this.refs === null) {
      refsEl.setText('引用统计中…');
    } else {
      const refs = this.refs.get(badge.name) ?? [];
      const total = refs.reduce((n, r) => n + r.count, 0);
      const open = this.expandedRefs.has(badge.id);
      refsEl.setText(refs.length === 0 ? '未被引用' : `${open ? '▾' : '▸'} ${refs.length} 篇笔记引用（共 ${total} 处）`);
      if (refs.length > 0) {
        refsEl.addClass('is-clickable');
        refsEl.addEventListener('click', () => {
          if (this.expandedRefs.has(badge.id)) this.expandedRefs.delete(badge.id);
          else this.expandedRefs.add(badge.id);
          this.renderBody();
        });
      }
      if (open && refs.length > 0) {
        const listEl = card.createDiv({ cls: 'bs-mgr-card-refs-list' });
        for (const r of refs) {
          const a = listEl.createEl('a', { text: `${r.path}（${r.count}）` });
          a.addEventListener('click', (e) => {
            e.stopPropagation();
            const file = this.app.vault.getAbstractFileByPath(r.path);
            if (file instanceof TFile) void this.app.workspace.getLeaf('tab').openFile(file);
          });
        }
      }
    }

    const actions = card.createDiv({ cls: 'bs-mgr-card-actions' });
    const editBtn = actions.createEl('button', { text: '编辑' });
    editBtn.addEventListener('click', () => new BadgeEditModal(this.plugin, badge).open());
    const delBtn = actions.createEl('button', { text: '删除', cls: 'mod-warning' });
    delBtn.addEventListener('click', () => this.deleteBadge(badge));
  }

  private deleteBadge(badge: BadgeDef): void {
    const refs = this.refs?.get(badge.name) ?? [];
    const doDelete = (): void => void this.plugin.store.deleteBadge(badge.id);
    if (refs.length === 0) {
      doDelete();
      return;
    }
    new ConfirmModal(
      this.app,
      `「${badge.name}」被 ${refs.length} 篇笔记引用。删除后正文里的标记会保留为纯文字、不再渲染。仍要删除吗？`,
      doDelete,
    ).open();
  }

  private renderStyles(body: HTMLElement): void {
    body.createEl('h3', { text: `样式库（${this.plugin.store.settings.styles.length}）` });
    for (const style of this.plugin.store.settings.styles) {
      const row = body.createDiv({ cls: 'bs-mgr-style-row' });
      row.createSpan({ cls: 'bs-swatch', attr: { style: `background:${style.leftBg}` } });
      row.createSpan({ cls: 'bs-swatch', attr: { style: `background:${style.rightBg}` } });
      row.createSpan({ text: style.name });
      row.createSpan({ cls: 'bs-mgr-card-meta grow', text: `${style.leftBg} ／ ${style.rightBg} · 被 ${this.plugin.store.styleUsage(style.id)} 个徽章使用` });
      const editBtn = row.createEl('button', { text: '编辑' });
      editBtn.addEventListener('click', () => new StyleEditModal(this.plugin, style).open());
      const delBtn = row.createEl('button', { text: '删除', cls: 'mod-warning' });
      delBtn.addEventListener('click', () => {
        const usage = this.plugin.store.styleUsage(style.id);
        const doDelete = (): void => void this.plugin.store.deleteStyle(style.id);
        if (usage === 0) {
          doDelete();
        } else {
          new ConfirmModal(this.app, `样式「${style.name}」正被 ${usage} 个徽章使用，删除后这些徽章会改用默认样式。仍要删除吗？`, doDelete).open();
        }
      });
    }
  }

  private exportAll(): void {
    const blob = new Blob([exportJson(this.plugin.store.settings)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'badge-studio-export.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    new Notice('已导出徽章库与样式库 JSON');
  }

  private pickImportFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.text().then(async (text) => {
        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch {
          new Notice('导入失败：不是有效的 JSON 文件');
          return;
        }
        const result = mergeImport(this.plugin.store.settings, raw);
        if (result.error) {
          new Notice(`导入失败：${result.error}`);
          return;
        }
        await this.plugin.store.save();
        await this.plugin.store.regenerateAll();
        new Notice(`导入完成：新增样式 ${result.stylesAdded} 个、徽章 ${result.badgesAdded} 个，跳过 ${result.skipped} 个`);
      });
    });
    input.click();
  }
}
