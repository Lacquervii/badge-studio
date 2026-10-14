import { ButtonComponent, ItemView, Menu, Modal, Notice, SearchComponent, Setting, TFile, setIcon } from 'obsidian';
import type { App, WorkspaceLeaf } from 'obsidian';
import { BADGE_MIME } from '../drop.ts';
import { exportJson, mergeImport } from '../core/io.ts';
import { PRESET_FAMILIES, PRESET_LEFT_BG } from '../core/presets.ts';
import { markerText } from '../core/parse.ts';
import { findBadgeReferences } from '../core/refs.ts';
import type { BadgeRef } from '../core/refs.ts';
import type { BadgeDef } from '../core/types.ts';
import type { BadgePlugin } from '../main.ts';
import { ConfirmModal } from './confirm.ts';
import { insertBadgeAtCursor } from './insert.ts';
import { BadgeEditModal, StyleEditModal } from './settingsTab.ts';

export const SIDEBAR_VIEW_TYPE = 'badge-studio-sidebar';

const UNGROUPED = '';

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
      setIcon(row.createSpan({ cls: 'bs-icon-inline' }), 'folder');
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
          void this.plugin.store.addGroup(name.trim()).then(() => this.render());
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
    this.setTitle('预设色系');
    for (const family of PRESET_FAMILIES) {
      contentEl.createEl('h4', { cls: 'bs-preset-family', text: `${family.name} · ${family.desc}` });
      for (const p of family.styles) {
        const exists = this.plugin.store.settings.styles.some((s) => s.name === p.name);
        const leftBg = p.leftBg ?? PRESET_LEFT_BG;
        const row = new Setting(contentEl).setName(p.name);
        row.controlEl.createSpan({ cls: 'bs-swatch', attr: { style: `background:${leftBg}` } });
        row.controlEl.createSpan({ cls: 'bs-swatch', attr: { style: `background:${p.rightBg}` } });
        row.addButton((b) => {
          b.setButtonText(exists ? '已添加' : '添加').setDisabled(exists);
          if (!exists) b.setCta();
          b.onClick(async () => {
            await this.plugin.store.addStyle({
              name: p.name,
              leftBg,
              rightBg: p.rightBg,
              leftTextColor: '',
              rightTextColor: '',
            });
            new Notice(`已添加样式「${p.name}」`);
            this.render();
          });
        });
      }
    }
  }
  onClose(): void {
    this.contentEl.empty();
  }
}

export class BadgeSidebarView extends ItemView {
  plugin: BadgePlugin;
  private unsubscribe: (() => void) | null = null;
  private page: 'badges' | 'styles' = 'badges';
  private search = '';
  private collapsedGroups = new Set<string>();
  private refs: Map<string, BadgeRef[]> | null = null;

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
    this.unsubscribe = this.plugin.onChange(() => {
      void this.refreshRefs();
      this.render();
    });
    this.render();
    await this.refreshRefs();
  }
  async onClose(): Promise<void> {
    if (this.unsubscribe) this.unsubscribe();
  }

  private async refreshRefs(): Promise<void> {
    const names = this.plugin.store.settings.badges.map((b) => b.name);
    this.refs = await findBadgeReferences(this.app, names);
    if (this.page === 'badges') this.renderList();
  }

  private dataUri(badge: BadgeDef): string {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(this.plugin.store.buildSvg(badge));
  }

  private render(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('bs-sidebar');
    if (this.page === 'styles') {
      this.renderStylesPage(root);
      return;
    }
    this.renderHeader(root);
    root.createDiv({ cls: 'bs-list' });
    this.renderList();
    const formWrap = root.createDiv({ cls: 'bs-temp-form', attr: { style: 'display:none' } });
    this.buildTempForm(formWrap);
    this.renderFooter(root, formWrap);
  }

  private renderHeader(root: HTMLElement): void {
    const header = root.createDiv({ cls: 'bs-side-header' });
    const searchWrap = header.createDiv({ cls: 'bs-side-search' });
    const search = new SearchComponent(searchWrap);
    search.setPlaceholder('搜索徽章…');
    search.setValue(this.search);
    search.onChange((v) => {
      this.search = v.trim().toLowerCase();
      this.renderList();
    });
    const more = new ButtonComponent(header).setIcon('more-horizontal').setTooltip('更多');
    more.onClick((e) => {
      const menu = new Menu();
      menu.addItem((i) => i.setTitle('导入 JSON').setIcon('upload').onClick(() => this.pickImportFile()));
      menu.addItem((i) => i.setTitle('导出 JSON').setIcon('download').onClick(() => this.exportAll()));
      menu.showAtMouseEvent(e);
    });
  }

  private renderFooter(root: HTMLElement, formWrap: HTMLElement): void {
    const footer = root.createDiv({ cls: 'bs-side-footer' });
    new ButtonComponent(footer)
      .setIcon('plus')
      .setTooltip('临时徽章')
      .onClick(() => {
        formWrap.style.display = formWrap.style.display === 'none' ? 'block' : 'none';
      });
    new ButtonComponent(footer)
      .setIcon('circle-plus')
      .setTooltip('新建徽章')
      .onClick(() => new BadgeEditModal(this.plugin, null).open());
    new ButtonComponent(footer)
      .setIcon('folder-plus')
      .setTooltip('管理分组')
      .onClick(() => new GroupManagerModal(this.plugin).open());
    new ButtonComponent(footer)
      .setIcon('palette')
      .setTooltip('样式库')
      .onClick(() => {
        this.page = 'styles';
        this.render();
      });
  }

  private renderList(): void {
    const listEl = this.containerEl.querySelector('.bs-list') as HTMLElement | null;
    if (!listEl) return;
    listEl.empty();
    const badges = this.plugin.store.settings.badges.filter((b) => b.name.toLowerCase().includes(this.search));
    const byGroup = new Map<string, BadgeDef[]>();
    for (const b of badges) {
      const arr = byGroup.get(b.group) ?? [];
      arr.push(b);
      byGroup.set(b.group, arr);
    }
    const order = [...byGroup.keys()].filter((g) => g !== '').sort();
    if (byGroup.has('')) order.push('');
    for (const g of order) {
      const collapsed = this.collapsedGroups.has(g);
      const h = listEl.createDiv({ cls: 'bs-group-header' });
      setIcon(h.createSpan({ cls: 'bs-chevron' }), collapsed ? 'chevron-right' : 'chevron-down');
      setIcon(h.createSpan({ cls: 'bs-icon-inline' }), g === '' ? 'inbox' : 'folder');
      h.createSpan({ text: g === '' ? '未分组' : g });
      h.createSpan({ cls: 'bs-count', text: `${byGroup.get(g)!.length}` });
      h.onClickEvent(() => {
        if (collapsed) this.collapsedGroups.delete(g);
        else this.collapsedGroups.add(g);
        this.renderList();
      });
      h.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.openGroupMenu(e, g);
      });
      if (collapsed) continue;
      for (const badge of byGroup.get(g)!) {
        const row = listEl.createDiv({ cls: 'bs-row' });
        row.createEl('img', { attr: { src: this.dataUri(badge), draggable: 'false' } });
        row.createSpan({ text: badge.name });
        const refs = this.refs?.get(badge.name) ?? [];
        if (refs.length > 0) {
          const count = row.createSpan({ cls: 'bs-row-count', text: `${refs.length}` });
          count.title = `${refs.length} 篇笔记引用`;
          count.addEventListener('click', (e) => {
            e.stopPropagation();
            new RefsModal(this.app, badge.name, refs).open();
          });
        }
        row.setAttribute('draggable', 'true');
        row.addEventListener('dragstart', (e) => {
          if (e.dataTransfer) {
            e.dataTransfer.setData(BADGE_MIME, badge.name);
            e.dataTransfer.setData('text/plain', markerText(badge.name));
            e.dataTransfer.effectAllowed = 'copy';
          }
        });
        row.onClickEvent(() => insertBadgeAtCursor(this.plugin, badge));
        row.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.openBadgeMenu(e, badge);
        });
      }
    }
    if (badges.length === 0) listEl.createDiv({ cls: 'bs-empty', text: '没有匹配的徽章' });
  }

  private openGroupMenu(e: MouseEvent, group: string): void {
    const menu = new Menu();
    if (group !== '') {
      menu.addItem((i) =>
        i.setTitle('在此分组新建徽章').setIcon('plus').onClick(() => new BadgeEditModal(this.plugin, null, group).open()),
      );
      menu.addItem((i) =>
        i.setTitle('重命名分组').setIcon('pencil').onClick(() => {
          new TextPromptModal(this.app, `重命名分组「${group}」`, '保存', group, (name) => {
            void this.plugin.store.renameGroup(group, name).then(() => this.render());
          }).open();
        }),
      );
      menu.addItem((i) =>
        i.setTitle('删除分组').setIcon('trash-2').onClick(() => {
          const count = this.plugin.store.settings.badges.filter((b) => b.group === group).length;
          const doDelete = (): void => {
            void this.plugin.store.clearGroup(group).then(() => this.render());
          };
          if (count === 0) {
            doDelete();
            return;
          }
          new ConfirmModal(this.app, `删除分组「${group}」？组内 ${count} 个徽章会移入「未分组」，徽章本身不会被删除。`, doDelete).open();
        }),
      );
    } else {
      menu.addItem((i) =>
        i.setTitle('在未分组新建徽章').setIcon('plus').onClick(() => new BadgeEditModal(this.plugin, null, '').open()),
      );
    }
    menu.showAtMouseEvent(e);
  }

  private openBadgeMenu(e: MouseEvent, badge: BadgeDef): void {
    const menu = new Menu();
    menu.addItem((i) => i.setTitle('编辑').setIcon('pencil').onClick(() => new BadgeEditModal(this.plugin, badge).open()));
    menu.addItem((i) =>
      i.setTitle('复制标记').setIcon('copy').onClick(() => {
        void navigator.clipboard.writeText(markerText(badge.name));
        new Notice(`已复制：${markerText(badge.name)}`);
      }),
    );
    const refs = this.refs?.get(badge.name) ?? [];
    if (refs.length > 0) {
      menu.addItem((i) =>
        i.setTitle(`引用列表（${refs.length} 篇）`).setIcon('list').onClick(() => new RefsModal(this.app, badge.name, refs).open()),
      );
    }
    menu.addItem((i) =>
      i.setTitle('删除').setIcon('trash-2').onClick(() => {
        const doDelete = (): void => void this.plugin.store.deleteBadge(badge.id);
        const warning =
          refs.length > 0
            ? `「${badge.name}」被 ${refs.length} 篇笔记引用。删除后徽章数据、正文里的标记和已固化的图片都会被移除。仍要删除吗？`
            : `删除「${badge.name}」？正文里的标记和已固化的图片也会被移除。仍要删除吗？`;
        new ConfirmModal(this.app, warning, doDelete).open();
      }),
    );
    menu.showAtMouseEvent(e);
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
          link: '',
          group: '',
        });
        insertBadgeAtCursor(this.plugin, badge);
      });
    });
  }

  private renderStylesPage(root: HTMLElement): void {
    const header = root.createDiv({ cls: 'bs-side-header' });
    new ButtonComponent(header)
      .setIcon('arrow-left')
      .setTooltip('返回徽章列表')
      .onClick(() => {
        this.page = 'badges';
        this.render();
      });
    new ButtonComponent(header)
      .setButtonText('新建样式')
      .setCta()
      .onClick(() => new StyleEditModal(this.plugin, null).open());
    new ButtonComponent(header)
      .setButtonText('预设色系')
      .onClick(() => new PresetModal(this.plugin).open());

    const list = root.createDiv({ cls: 'bs-style-page' });
    for (const style of this.plugin.store.settings.styles) {
      const row = list.createDiv({ cls: 'bs-style-row' });
      row.createSpan({ cls: 'bs-swatch', attr: { style: `background:${style.leftBg}` } });
      row.createSpan({ cls: 'bs-swatch', attr: { style: `background:${style.rightBg}` } });
      const info = row.createDiv({ cls: 'bs-style-info' });
      info.createSpan({ cls: 'bs-style-name', text: style.name });
      info.createSpan({ cls: 'bs-n', text: `被 ${this.plugin.store.styleUsage(style.id)} 个徽章使用` });
      iconBtn(row, 'pencil', '编辑').addEventListener('click', () => new StyleEditModal(this.plugin, style).open());
      iconBtn(row, 'trash-2', '删除样式').addEventListener('click', () => {
        const usage = this.plugin.store.styleUsage(style.id);
        const doDelete = (): void => void this.plugin.store.deleteStyle(style.id);
        if (usage === 0) {
          doDelete();
          return;
        }
        new ConfirmModal(this.app, `样式「${style.name}」正被 ${usage} 个徽章使用，删除后这些徽章会改用默认样式。仍要删除吗？`, doDelete).open();
      });
    }
    if (this.plugin.store.settings.styles.length === 0) {
      list.createDiv({ cls: 'bs-empty', text: '还没有样式' });
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
