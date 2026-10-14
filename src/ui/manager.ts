import { ItemView, Modal, Notice, Setting, TFile, setIcon } from 'obsidian';
import type { App, WorkspaceLeaf } from 'obsidian';
import { exportJson, mergeImport } from '../core/io.ts';
import { PRESET_LEFT_BG, PRESET_STYLES } from '../core/presets.ts';
import { findBadgeReferences } from '../core/refs.ts';
import type { BadgeRef } from '../core/refs.ts';
import type { BadgeDef } from '../core/types.ts';
import type { BadgePlugin } from '../main.ts';
import { ConfirmModal } from './confirm.ts';
import { BadgeEditModal, StyleEditModal } from './settingsTab.ts';

export const MANAGER_VIEW_TYPE = 'badge-studio-manager';

const UNGROUPED = '';

class TextPromptModal extends Modal {
  private title: string;
  private cta: string;
  private initial: string;
  private onSubmit: (v: string) => void;

  constructor(app: App, title: string, cta: string, initial: string, onSubmit: (v: string) => void) {
    super(app);
    this.title = title;
    this.cta = cta;
    this.initial = initial;
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    this.setTitle(this.title);
    let value = this.initial;
    const submit = (): void => {
      const v = value.trim();
      if (v === '') return;
      this.close();
      this.onSubmit(v);
    };
    new Setting(contentEl).setName('名字').addText((t) => {
      t.setValue(this.initial);
      t.onChange((v) => (value = v));
      t.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
      t.inputEl.focus();
    });
    new Setting(contentEl).addButton((b) => b.setButtonText(this.cta).setCta().onClick(submit));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class RefsModal extends Modal {
  private badgeName: string;
  private refs: BadgeRef[];

  constructor(app: App, badgeName: string, refs: BadgeRef[]) {
    super(app);
    this.badgeName = badgeName;
    this.refs = refs;
  }

  onOpen(): void {
    const { contentEl } = this;
    this.setTitle(`「${this.badgeName}」的引用`);
    const total = this.refs.reduce((n, r) => n + r.count, 0);
    contentEl.createEl('p', { cls: 'bs-empty', text: `${this.refs.length} 篇笔记，共 ${total} 处。点击跳转。` });
    const listEl = contentEl.createDiv({ cls: 'bs-refs-list' });
    for (const r of this.refs) {
      const a = listEl.createEl('a', { text: `${r.path}（${r.count} 处）` });
      a.addEventListener('click', () => {
        const file = this.app.vault.getAbstractFileByPath(r.path);
        if (file instanceof TFile) {
          this.close();
          void this.app.workspace.getLeaf('tab').openFile(file);
        }
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

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
  private page: 'badges' | 'styles' = 'badges';
  private currentGroup: string | null = null;
  private search = '';
  private refs: Map<string, BadgeRef[]> | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: BadgePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return MANAGER_VIEW_TYPE;
  }
  getDisplayText(): string {
    return '徽章工作台';
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
    this.renderContent();
  }

  private dataUri(badge: BadgeDef): string {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(this.plugin.store.buildSvg(badge));
  }

  private folderExists(group: string): boolean {
    if (group === UNGROUPED) return this.plugin.store.settings.badges.some((b) => b.group === UNGROUPED);
    return this.plugin.store.groups().includes(group);
  }

  private render(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('bs-mgr');
    if (this.page === 'styles') {
      this.renderStylesPage(root);
      return;
    }
    this.buildToolbar(root);
    root.createDiv({ cls: 'bs-mgr-content' });
    this.renderContent();
  }

  private buildToolbar(root: HTMLElement): void {
    const bar = root.createDiv({ cls: 'bs-mgr-toolbar' });

    const search = bar.createEl('input', { attr: { type: 'text', placeholder: '搜索徽章…' } });
    search.value = this.search;
    search.addEventListener('input', () => {
      this.search = search.value.trim().toLowerCase();
      this.renderContent();
    });

    const btn = (text: string, onClick: () => void, cta = false): void => {
      const b = bar.createEl('button', { text });
      if (cta) b.addClass('mod-cta');
      b.addEventListener('click', onClick);
    };
    btn('新建徽章', () => new BadgeEditModal(this.plugin, null, this.currentGroup ?? undefined).open(), true);
    btn('新建分组', () => {
      new TextPromptModal(this.app, '新建分组', '创建', '', (name) => {
        void this.plugin.store.addGroup(name).then(() => {
          this.currentGroup = name;
          this.render();
        });
      }).open();
    });
    btn('样式库', () => {
      this.page = 'styles';
      this.render();
    });
    btn('导入 JSON', () => this.pickImportFile());
    btn('导出 JSON', () => this.exportAll());
    btn('刷新统计', () => void this.refreshRefs());
  }

  private renderContent(): void {
    const content = this.containerEl.querySelector('.bs-mgr-content') as HTMLElement | null;
    if (!content) return;
    content.empty();
    if (this.search !== '') {
      this.renderSearchResults(content);
      return;
    }
    if (this.currentGroup !== null) {
      if (!this.folderExists(this.currentGroup)) {
        this.currentGroup = null;
      } else {
        this.renderGroupView(content, this.currentGroup);
        return;
      }
    }
    this.renderFolderGrid(content);
  }

  private renderBreadcrumb(content: HTMLElement, group: string): void {
    const nav = content.createDiv({ cls: 'bs-mgr-crumb' });
    const home = nav.createEl('a', { text: '全部徽章' });
    home.addEventListener('click', () => {
      this.currentGroup = null;
      this.renderContent();
    });
    nav.createSpan({ text: ' ／ ' });
    nav.createSpan({ text: group === UNGROUPED ? '未分组' : group });
  }

  private renderFolderGrid(content: HTMLElement): void {
    const badges = this.plugin.store.settings.badges;
    const grid = content.createDiv({ cls: 'bs-folder-grid' });
    const folders: Array<{ group: string; list: BadgeDef[] }> = [];
    for (const g of this.plugin.store.groups()) {
      folders.push({ group: g, list: badges.filter((b) => b.group === g) });
    }
    const ungrouped = badges.filter((b) => b.group === UNGROUPED);
    if (ungrouped.length > 0) folders.push({ group: UNGROUPED, list: ungrouped });

    for (const f of folders) this.renderFolderCard(grid, f.group, f.list);
    if (badges.length === 0 && folders.length === 0) {
      content.createDiv({ cls: 'bs-empty', text: '还没有徽章，点右上角「新建徽章」开始' });
    }
  }

  private renderFolderCard(grid: HTMLElement, group: string, list: BadgeDef[]): void {
    const card = grid.createDiv({ cls: 'bs-folder' });
    const main = card.createDiv({ cls: 'bs-folder-main' });
    const head = main.createDiv({ cls: 'bs-folder-head' });
    const icon = head.createSpan({ cls: 'bs-folder-icon' });
    setIcon(icon, group === UNGROUPED ? 'inbox' : 'folder');
    head.createSpan({ cls: 'bs-folder-name', text: group === UNGROUPED ? '未分组' : group });
    head.createSpan({ cls: 'bs-folder-count', text: `${list.length}` });
    const previews = main.createDiv({ cls: 'bs-folder-previews' });
    for (const badge of list.slice(0, 3)) {
      previews.createEl('img', { attr: { src: this.dataUri(badge), draggable: 'false' } });
    }
    if (list.length === 0) previews.createSpan({ cls: 'bs-empty', text: '空分组' });
    main.addEventListener('click', () => {
      this.currentGroup = group;
      this.renderContent();
    });

    if (group !== UNGROUPED) {
      const actions = card.createDiv({ cls: 'bs-folder-actions' });
      const renameBtn = actions.createEl('button', { text: '重命名' });
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        new TextPromptModal(this.app, `重命名分组「${group}」`, '保存', group, (name) => {
          void this.plugin.store.renameGroup(group, name).then(() => this.renderContent());
        }).open();
      });
      const delBtn = actions.createEl('button', { text: '删除', cls: 'mod-warning' });
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const doDelete = (): void => {
          void this.plugin.store.clearGroup(group).then(() => {
            if (this.currentGroup === group) this.currentGroup = null;
            this.renderContent();
          });
        };
        if (list.length === 0) {
          doDelete();
        } else {
          new ConfirmModal(this.app, `删除分组「${group}」？组内 ${list.length} 个徽章会移入「未分组」，不会被删除。`, doDelete).open();
        }
      });
    }
  }

  private renderGroupView(content: HTMLElement, group: string): void {
    this.renderBreadcrumb(content, group);
    const list = this.plugin.store.settings.badges.filter((b) => b.group === group);
    const grid = content.createDiv({ cls: 'bs-mgr-grid' });
    for (const badge of list) this.renderCard(grid, badge, false);
    if (list.length === 0) {
      content.createDiv({ cls: 'bs-empty', text: '这个分组还没有徽章，点「新建徽章」会自动归入本组' });
    }
  }

  private renderSearchResults(content: HTMLElement): void {
    const list = this.plugin.store.settings.badges.filter((b) => b.name.toLowerCase().includes(this.search));
    content.createDiv({ cls: 'bs-empty', text: `搜索到 ${list.length} 个徽章` });
    const grid = content.createDiv({ cls: 'bs-mgr-grid' });
    for (const badge of list) this.renderCard(grid, badge, true);
    if (list.length === 0) content.createDiv({ cls: 'bs-empty', text: '没有匹配的徽章' });
  }

  private renderCard(grid: HTMLElement, badge: BadgeDef, showGroup: boolean): void {
    const card = grid.createDiv({ cls: 'bs-mgr-card' });

    const head = card.createDiv({ cls: 'bs-mgr-card-head' });
    head.createEl('img', { attr: { src: this.dataUri(badge), draggable: 'false' } });
    head.createSpan({ cls: 'bs-mgr-card-name', text: badge.name });

    if (showGroup) {
      card.createDiv({ cls: 'bs-mgr-card-meta', text: badge.group === UNGROUPED ? '未分组' : badge.group });
    }

    const refsEl = card.createDiv({ cls: 'bs-mgr-card-refs' });
    if (this.refs === null) {
      refsEl.setText('引用统计中…');
    } else {
      const refs = this.refs.get(badge.name) ?? [];
      const total = refs.reduce((n, r) => n + r.count, 0);
      refsEl.setText(refs.length === 0 ? '未被引用' : `${refs.length} 篇笔记引用（共 ${total} 处）`);
      if (refs.length > 0) {
        refsEl.addClass('is-clickable');
        refsEl.addEventListener('click', () => new RefsModal(this.app, badge.name, refs).open());
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

  private renderStylesPage(root: HTMLElement): void {
    const bar = root.createDiv({ cls: 'bs-mgr-toolbar' });
    const back = bar.createEl('button', { text: '← 返回徽章库' });
    back.addEventListener('click', () => {
      this.page = 'badges';
      this.render();
    });
    const addBtn = bar.createEl('button', { text: '新建样式', cls: 'mod-cta' });
    addBtn.addEventListener('click', () => new StyleEditModal(this.plugin, null).open());
    const presetBtn = bar.createEl('button', { text: '预设配色' });
    presetBtn.addEventListener('click', () => new PresetModal(this.plugin).open());

    const content = root.createDiv({ cls: 'bs-mgr-content' });
    content.createEl('h3', { text: `样式库（${this.plugin.store.settings.styles.length}）` });
    content.createDiv({ cls: 'bs-empty', text: '改动样式后，使用它的徽章会全部自动重画。' });
    for (const style of this.plugin.store.settings.styles) {
      const row = content.createDiv({ cls: 'bs-mgr-style-row' });
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
