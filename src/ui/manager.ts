import { ButtonComponent, ItemView, Menu, Modal, Notice, SearchComponent, Setting, TFile, setIcon } from 'obsidian';
import type { App, WorkspaceLeaf } from 'obsidian';
import { exportJson, mergeImport } from '../core/io.ts';
import { PRESET_LEFT_BG, PRESET_STYLES } from '../core/presets.ts';
import { findBadgeReferences, notePreview } from '../core/refs.ts';
import type { BadgeRef } from '../core/refs.ts';
import { markerText } from '../core/parse.ts';
import { classifyLink } from '../core/resolve.ts';
import type { BadgeDef } from '../core/types.ts';
import type { BadgePlugin } from '../main.ts';
import { ConfirmModal } from './confirm.ts';
import { BadgeEditModal, StyleEditModal } from './settingsTab.ts';

export const MANAGER_VIEW_TYPE = 'badge-studio-manager';

const UNGROUPED = '';
const MOVE_MIME = 'application/x-badge-studio-move';

function iconBtn(el: HTMLElement, icon: string, title: string): HTMLElement {
  const btn = el.createEl('button', { cls: 'bs-icon-btn' });
  setIcon(btn, icon);
  btn.setAttribute('aria-label', title);
  btn.title = title;
  return btn;
}

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

/** 分组管理集中在弹窗里做，主界面不摆重命名/删除按钮 */
class GroupManagerModal extends Modal {
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
    this.setTitle('管理分组');

    const groups = this.plugin.store.groups();
    if (groups.length === 0) contentEl.createDiv({ cls: 'bs-empty', text: '还没有分组' });
    for (const g of groups) {
      const count = this.plugin.store.settings.badges.filter((b) => b.group === g).length;
      const row = contentEl.createDiv({ cls: 'bs-group-row' });
      setIcon(row.createSpan({ cls: 'bs-nav-icon' }), 'folder');
      row.createSpan({ cls: 'grow', text: g });
      row.createSpan({ cls: 'bs-n', text: `${count} 个` });
      iconBtn(row, 'pencil', '重命名').addEventListener('click', () => {
        new TextPromptModal(this.app, `重命名分组「${g}」`, '保存', g, (name) => {
          void this.plugin.store.renameGroup(g, name).then(() => this.render());
        }).open();
      });
      iconBtn(row, 'trash-2', '删除分组').addEventListener('click', () => {
        const doDelete = (): void => void this.plugin.store.clearGroup(g).then(() => this.render());
        if (count === 0) {
          doDelete();
          return;
        }
        new ConfirmModal(this.app, `删除分组「${g}」？组内 ${count} 个徽章会移入「未分组」，徽章本身不会被删除。`, doDelete).open();
      });
    }

    let name = '';
    const add = new Setting(contentEl).addText((t) => {
      t.setPlaceholder('新分组名字');
      t.onChange((v) => (name = v));
    });
    add.addButton((b) =>
      b
        .setButtonText('创建分组')
        .setCta()
        .onClick(() => {
          if (name.trim() === '') return;
          void this.plugin.store.addGroup(name.trim()).then(() => {
            this.render();
          });
        }),
    );
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
  private page: 'badges' | 'detail' | 'styles' = 'badges';
  private currentGroup: string | null = null;
  private detailBadgeId: string | null = null;
  private search = '';
  private density: 'grid' | 'list' = 'grid';
  private refs: Map<string, BadgeRef[]> | null = null;
  private previewCache = new Map<string, string>();

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
    this.renderMain();
  }

  private renderMain(): void {
    if (this.page === 'detail') this.renderDetailBody();
    else this.renderContent();
  }

  private dataUri(badge: BadgeDef): string {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(this.plugin.store.buildSvg(badge));
  }

  private groupCount(group: string): number {
    return this.plugin.store.settings.badges.filter((b) => b.group === group).length;
  }

  private groupExists(group: string): boolean {
    if (group === UNGROUPED) return this.groupCount(UNGROUPED) > 0;
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
    if (this.page === 'detail') {
      this.renderDetailPage(root);
      return;
    }
    this.renderHeader(root);
    root.createDiv({ cls: 'bs-mgr-filters' });
    root.createDiv({ cls: 'bs-mgr-main' });
    this.renderFilters();
    this.renderContent();
  }

  private renderHeader(root: HTMLElement): void {
    const header = root.createDiv({ cls: 'bs-mgr-header' });

    const title = header.createDiv({ cls: 'bs-mgr-title' });
    setIcon(title.createSpan({ cls: 'bs-mgr-logo' }), 'shield');
    title.createSpan({ text: '徽章工作台' });

    const search = new SearchComponent(header);
    search.setPlaceholder('搜索徽章…');
    search.setValue(this.search);
    search.onChange((v) => {
      this.search = v.trim().toLowerCase();
      this.renderContent();
    });

    new ButtonComponent(header)
      .setButtonText('新建徽章')
      .setCta()
      .onClick(() => new BadgeEditModal(this.plugin, null, this.currentGroup ?? undefined).open());

    const more = new ButtonComponent(header).setIcon('more-horizontal').setTooltip('更多');
    more.onClick((e) => {
      const menu = new Menu();
      menu.addItem((i) =>
        i
          .setTitle('样式库')
          .setIcon('palette')
          .onClick(() => {
            this.page = 'styles';
            this.render();
          }),
      );
      menu.addItem((i) =>
        i
          .setTitle(this.density === 'grid' ? '切换为列表视图' : '切换为网格视图')
          .setIcon(this.density === 'grid' ? 'list' : 'layout-grid')
          .onClick(() => {
            this.density = this.density === 'grid' ? 'list' : 'grid';
            this.renderContent();
          }),
      );
      menu.addItem((i) => i.setTitle('导入 JSON').setIcon('upload').onClick(() => this.pickImportFile()));
      menu.addItem((i) => i.setTitle('导出 JSON').setIcon('download').onClick(() => this.exportAll()));
      menu.addItem((i) =>
        i.setTitle('刷新引用统计').setIcon('refresh-cw').onClick(() => void this.refreshRefs()),
      );
      menu.showAtMouseEvent(e);
    });
  }

  private renderFilters(): void {
    const bar = this.containerEl.querySelector('.bs-mgr-filters') as HTMLElement | null;
    if (!bar) return;
    bar.empty();

    const all = this.plugin.store.settings.badges;
    this.renderFilterChip(bar, null, 'library', '全部徽章', all.length);

    for (const g of this.plugin.store.groups()) {
      this.renderFilterChip(bar, g, 'folder', g, this.groupCount(g));
    }
    const ungrouped = this.groupCount(UNGROUPED);
    if (ungrouped > 0) this.renderFilterChip(bar, UNGROUPED, 'inbox', '未分组', ungrouped);

    const add = bar.createDiv({ cls: 'bs-chip-btn is-add' });
    setIcon(add.createSpan({ cls: 'bs-icon-inline' }), 'folder-plus');
    add.createSpan({ text: '管理分组' });
    add.addEventListener('click', () => new GroupManagerModal(this.plugin).open());
  }

  private renderFilterChip(
    bar: HTMLElement,
    group: string | null,
    icon: string,
    label: string,
    count: number,
  ): void {
    const chip = bar.createDiv({ cls: 'bs-chip-btn' });
    if (this.currentGroup === group) chip.addClass('is-active');
    setIcon(chip.createSpan({ cls: 'bs-icon-inline' }), icon);
    chip.createSpan({ text: label });
    chip.createSpan({ cls: 'bs-n', text: `${count}` });
    chip.addEventListener('click', () => {
      this.currentGroup = group;
      this.renderFilters();
      this.renderContent();
    });
    if (group !== null) this.setupDropTarget(chip, group);
  }

  private setupDropTarget(chip: HTMLElement, group: string): void {
    chip.addEventListener('dragover', (e) => {
      if (!e.dataTransfer?.types.includes(MOVE_MIME)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      chip.addClass('is-drop');
    });
    chip.addEventListener('dragleave', () => chip.removeClass('is-drop'));
    chip.addEventListener('drop', (e) => {
      e.preventDefault();
      chip.removeClass('is-drop');
      const id = e.dataTransfer?.getData(MOVE_MIME);
      if (!id) return;
      void this.plugin.store.updateBadge(id, { group });
    });
  }

  private renderContent(): void {
    const main = this.containerEl.querySelector('.bs-mgr-main') as HTMLElement | null;
    if (!main) return;
    main.empty();

    if (this.search !== '') {
      const list = this.plugin.store.settings.badges.filter((b) => b.name.toLowerCase().includes(this.search));
      main.createDiv({ cls: 'bs-section-title', text: `搜索「${this.search}」· ${list.length} 个` });
      if (list.length === 0) {
        this.renderEmpty(main, 'search', '没有匹配的徽章', '换个关键词试试');
        return;
      }
      this.renderGrid(main, list);
      return;
    }

    if (this.currentGroup !== null && !this.groupExists(this.currentGroup)) {
      this.currentGroup = null;
      this.renderFilters();
    }

    const all = this.plugin.store.settings.badges;
    let list = all;
    let title = '';
    if (this.currentGroup === null) {
      title = `全部徽章 · ${all.length}`;
    } else {
      title = `${this.currentGroup === UNGROUPED ? '未分组' : this.currentGroup} · ${this.groupCount(this.currentGroup)}`;
      list = all.filter((b) => b.group === this.currentGroup);
    }
    main.createDiv({ cls: 'bs-section-title', text: title });

    if (list.length === 0) {
      const group = this.currentGroup;
      this.renderEmpty(
        main,
        group === null ? 'shield' : group === UNGROUPED ? 'inbox' : 'folder',
        group === null ? '还没有徽章' : '这个分组还没有徽章',
        '点右上角「新建徽章」，会自动归入当前分组',
      );
      return;
    }
    this.renderGrid(main, list);
  }

  private renderEmpty(main: HTMLElement, icon: string, title: string, desc: string): void {
    const box = main.createDiv({ cls: 'bs-empty-state' });
    const iconEl = box.createDiv({ cls: 'bs-empty-icon' });
    setIcon(iconEl, icon);
    box.createDiv({ cls: 'bs-empty-title', text: title });
    box.createDiv({ cls: 'bs-empty-desc', text: desc });
  }

  private renderGrid(main: HTMLElement, badges: BadgeDef[]): void {
    const grid = main.createDiv({ cls: `bs-grid${this.density === 'list' ? ' is-list' : ''}` });
    for (const badge of badges) this.renderCard(grid, badge);
  }

  private renderCard(grid: HTMLElement, badge: BadgeDef): void {
    const card = grid.createDiv({ cls: 'bs-card' });

    const canvas = card.createDiv({ cls: 'bs-card-canvas' });
    canvas.createEl('img', { attr: { src: this.dataUri(badge), draggable: 'false' } });

    card.createDiv({ cls: 'bs-card-name', text: badge.name });

    const meta = card.createDiv({ cls: 'bs-card-meta' });
    if (this.density === 'list' || this.search !== '') {
      meta.createSpan({ text: badge.group === UNGROUPED ? '未分组' : badge.group });
    }
    const refsEl = meta.createSpan({ cls: 'bs-card-refs' });
    if (this.refs === null) {
      refsEl.setText('统计中…');
    } else {
      const refs = this.refs.get(badge.name) ?? [];
      refsEl.setText(refs.length === 0 ? '未被引用' : `${refs.length} 篇引用`);
      if (refs.length > 0) {
        refsEl.addClass('is-clickable');
        refsEl.addEventListener('click', (e) => {
          e.stopPropagation();
          new RefsModal(this.app, badge.name, refs).open();
        });
      }
    }

    card.addEventListener('click', () => this.openDetail(badge));
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.openCardMenu(e, badge);
    });
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', (e) => {
      if (!e.dataTransfer) return;
      e.dataTransfer.setData(MOVE_MIME, badge.id);
      e.dataTransfer.effectAllowed = 'move';
    });
  }

  private openCardMenu(e: MouseEvent, badge: BadgeDef): void {
    const menu = new Menu();
    menu.addItem((i) => i.setTitle('编辑').setIcon('pencil').onClick(() => new BadgeEditModal(this.plugin, badge).open()));
    menu.addItem((i) =>
      i.setTitle('复制标记').setIcon('copy').onClick(() => {
        void navigator.clipboard.writeText(markerText(badge.name));
        new Notice(`已复制：${markerText(badge.name)}`);
      }),
    );
    menu.addItem((i) => i.setTitle('删除').setIcon('trash-2').onClick(() => this.deleteBadge(badge)));
    menu.showAtMouseEvent(e);
  }

  private openDetail(badge: BadgeDef): void {
    this.page = 'detail';
    this.detailBadgeId = badge.id;
    this.render();
  }

  private renderDetailPage(root: HTMLElement): void {
    const badge = this.plugin.store.settings.badges.find((b) => b.id === this.detailBadgeId);
    if (!badge) {
      this.page = 'badges';
      this.detailBadgeId = null;
      this.render();
      return;
    }
    const header = root.createDiv({ cls: 'bs-mgr-header' });
    new ButtonComponent(header)
      .setIcon('arrow-left')
      .setTooltip('返回徽章库')
      .onClick(() => {
        this.page = 'badges';
        this.detailBadgeId = null;
        this.render();
      });
    const title = header.createDiv({ cls: 'bs-mgr-title' });
    setIcon(title.createSpan({ cls: 'bs-mgr-logo' }), 'shield');
    title.createSpan({ text: '徽章详情' });
    new ButtonComponent(header)
      .setIcon('pencil')
      .setTooltip('编辑徽章')
      .onClick(() => new BadgeEditModal(this.plugin, badge).open());
    new ButtonComponent(header)
      .setIcon('trash-2')
      .setTooltip('删除徽章')
      .onClick(() => this.deleteBadge(badge));
    root.createDiv({ cls: 'bs-mgr-main' });
    this.renderDetailBody();
  }

  private renderDetailBody(): void {
    const main = this.containerEl.querySelector('.bs-mgr-main') as HTMLElement | null;
    if (!main) return;
    main.empty();
    const badge = this.plugin.store.settings.badges.find((b) => b.id === this.detailBadgeId);
    if (!badge) return;

    const head = main.createDiv({ cls: 'bs-detail-head' });
    const canvas = head.createDiv({ cls: 'bs-detail-canvas' });
    canvas.createEl('img', { attr: { src: this.dataUri(badge), draggable: 'false' } });
    const info = head.createDiv({ cls: 'bs-detail-info' });
    info.createDiv({ cls: 'bs-detail-name', text: badge.name });
    if (badge.link !== '') {
      const lk = classifyLink(badge.link);
      const linkEl = info.createDiv({ cls: 'bs-detail-link' });
      setIcon(linkEl.createSpan(), lk.kind === 'url' ? 'external-link' : 'link');
      linkEl.createSpan({ text: badge.link });
      linkEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (lk.kind === 'url') window.open(lk.url);
        else if (lk.kind === 'note') void this.app.workspace.openLinkText(lk.name, '');
      });
    }

    const styleSec = main.createDiv({ cls: 'bs-detail-section' });
    styleSec.createEl('h4', { text: '样式' });
    const style = this.plugin.store.styleOf(badge);
    const box = styleSec.createDiv({ cls: 'bs-style-box' });
    box.createSpan({ cls: 'bs-swatch', attr: { style: `background:${style.leftBg}` } });
    box.createSpan({ cls: 'bs-swatch', attr: { style: `background:${style.rightBg}` } });
    box.createSpan({ cls: 'bs-style-name', text: style.name });
    box.createSpan({ cls: 'bs-n', text: `${style.leftBg} ／ ${style.rightBg}` });

    const refsSec = main.createDiv({ cls: 'bs-detail-section' });
    const refs = this.refs?.get(badge.name) ?? null;
    const total = refs?.reduce((n, r) => n + r.count, 0) ?? 0;
    const h4 = refsSec.createEl('h4');
    h4.createSpan({ text: refs === null ? '引用（统计中…）' : `引用（${refs.length} 篇 · 共 ${total} 处）` });
    if (refs !== null) {
      new ButtonComponent(h4)
        .setIcon(this.plugin.store.settings.refsPreview ? 'eye' : 'eye-off')
        .setTooltip('显示 / 关闭引用预览')
        .onClick(async () => {
          this.plugin.store.settings.refsPreview = !this.plugin.store.settings.refsPreview;
          await this.plugin.store.save();
          this.renderDetailBody();
        });
      new ButtonComponent(h4)
        .setIcon('refresh-cw')
        .setTooltip('重新扫描引用')
        .onClick(() => {
          this.previewCache.clear();
          void this.refreshRefs();
        });
    }
    if (refs !== null && refs.length > 0) {
      const listEl = refsSec.createDiv({ cls: 'bs-ref-list' });
      const showPreview = this.plugin.store.settings.refsPreview;
      for (const r of refs) {
        const item = listEl.createDiv({ cls: 'bs-ref-item' });
        item.createDiv({ cls: 'bs-ref-title', text: r.path.split('/').pop()?.replace(/\.md$/, '') ?? r.path });
        item.createDiv({ cls: 'bs-ref-path', text: `${r.path} · ${r.count} 处` });
        if (showPreview) {
          const pv = item.createDiv({ cls: 'bs-ref-preview' });
          const cached = this.previewCache.get(r.path);
          if (cached !== undefined) pv.setText(cached);
          else this.loadPreview(r.path, pv);
        }
        item.addEventListener('click', () => {
          const file = this.app.vault.getAbstractFileByPath(r.path);
          if (file instanceof TFile) void this.app.workspace.getLeaf('tab').openFile(file);
        });
      }
    } else if (refs !== null) {
      refsSec.createDiv({ cls: 'bs-empty', text: '还没有笔记引用这个徽章' });
    }
  }

  private loadPreview(path: string, el: HTMLElement): void {
    void notePreview(this.app, path)
      .then((text) => {
        this.previewCache.set(path, text);
        if (el.isConnected) el.setText(text);
      })
      .catch(() => {
        /* 读取失败时留空 */
      });
  }

  private deleteBadge(badge: BadgeDef): void {
    const refs = this.refs?.get(badge.name) ?? [];
    const doDelete = (): void => {
      void this.plugin.store.deleteBadge(badge.id).then(() => {
        if (this.page === 'detail' && this.detailBadgeId === badge.id) {
          this.page = 'badges';
          this.detailBadgeId = null;
        }
        this.render();
      });
    };
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
    const header = root.createDiv({ cls: 'bs-mgr-header' });
    new ButtonComponent(header)
      .setIcon('arrow-left')
      .setTooltip('返回徽章库')
      .onClick(() => {
        this.page = 'badges';
        this.render();
      });
    const title = header.createDiv({ cls: 'bs-mgr-title' });
    setIcon(title.createSpan({ cls: 'bs-mgr-logo' }), 'palette');
    title.createSpan({ text: '样式库' });
    new ButtonComponent(header).setButtonText('预设配色').onClick(() => new PresetModal(this.plugin).open());
    new ButtonComponent(header)
      .setButtonText('新建样式')
      .setCta()
      .onClick(() => new StyleEditModal(this.plugin, null).open());

    const main = root.createDiv({ cls: 'bs-mgr-main' });
    main.createEl('h3', { text: `样式库（${this.plugin.store.settings.styles.length}）` });
    main.createDiv({ cls: 'bs-empty', text: '改动样式后，使用它的徽章会全部自动重画；删除使用中的样式会先提示。' });
    for (const style of this.plugin.store.settings.styles) {
      const row = new Setting(main)
        .setName(style.name)
        .setDesc(`左 ${style.leftBg} ／ 右 ${style.rightBg} · 被 ${this.plugin.store.styleUsage(style.id)} 个徽章使用`);
      row.controlEl.createSpan({ cls: 'bs-swatch', attr: { style: `background:${style.leftBg}` } });
      row.controlEl.createSpan({ cls: 'bs-swatch', attr: { style: `background:${style.rightBg}` } });
      row.addButton((b) => b.setButtonText('编辑').onClick(() => new StyleEditModal(this.plugin, style).open()));
      row.addButton((b) =>
        b.setButtonText('删除').setWarning().onClick(() => {
          const usage = this.plugin.store.styleUsage(style.id);
          const doDelete = (): void => void this.plugin.store.deleteStyle(style.id);
          if (usage === 0) {
            doDelete();
            return;
          }
          new ConfirmModal(this.app, `样式「${style.name}」正被 ${usage} 个徽章使用，删除后这些徽章会改用默认样式。仍要删除吗？`, doDelete).open();
        }),
      );
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
