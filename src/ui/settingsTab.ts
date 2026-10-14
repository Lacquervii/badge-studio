import { AbstractInputSuggest, Modal, Notice, PluginSettingTab, Setting, TFile } from 'obsidian';
import type { App } from 'obsidian';
import { resolveLogo } from '../core/logo.ts';
import type { BadgeDef, SidebarViewKind, StyleDef } from '../core/types.ts';
import type { BadgePlugin } from '../main.ts';
import { makeLogoEl } from './chip.ts';
import { IconPickerModal } from './iconPicker.ts';
import { insertBadgeAtCursor } from './insert.ts';

/** 用系统浏览器打开外部链接（模态里的 <a> 默认会在应用内跳转） */
function extLink(el: HTMLElement, text: string, href: string): void {
  const a = el.createEl('a', { text });
  a.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(href);
  });
}

/** 「链接」输入框的笔记联想：选中的是完整路径，天然区分同名文件 */
class FileSuggest extends AbstractInputSuggest<TFile> {
  private onPick: (file: TFile) => void;

  constructor(app: App, inputEl: HTMLInputElement, onPick: (file: TFile) => void) {
    super(app, inputEl);
    this.onPick = onPick;
  }

  protected getSuggestions(query: string): TFile[] {
    const q = query.trim().toLowerCase();
    const files = this.app.vault.getMarkdownFiles();
    const matched =
      q === '' ? files.slice(0, 30) : files.filter((f) => f.path.toLowerCase().includes(q));
    matched.sort((a, b) => {
      const ai = a.basename.toLowerCase().startsWith(q) ? 0 : 1;
      const bi = b.basename.toLowerCase().startsWith(q) ? 0 : 1;
      return ai - bi || a.basename.localeCompare(b.basename);
    });
    return matched.slice(0, 30);
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.createDiv({ text: file.basename });
    el.createDiv({ cls: 'bs-suggest-path', text: file.path });
  }

  selectSuggestion(file: TFile): void {
    this.setValue(file.path);
    this.onPick(file);
    this.close();
  }
}

/** 取色器 + hex 输入框；返回值可用来从外部回填颜色（比如「套用样式」） */
function addColor(control: HTMLElement, value: string, onChange: (v: string) => void): (v: string) => void {
  const picker = control.createEl('input', { cls: 'bs-color-picker', attr: { type: 'color', value } });
  const text = control.createEl('input', { cls: 'bs-color-text', attr: { type: 'text', value, size: '8' } });
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
  return (v: string) => {
    picker.value = v;
    text.value = v;
  };
}

/** 「自动＝按底色亮度黑白」的文字色控件；返回值可用来从外部回填 */
function addTextColor(
  control: HTMLElement,
  auto: boolean,
  color: string,
  onChange: (auto: boolean, color: string) => void,
): (auto: boolean, color: string) => void {
  const cb = control.createEl('input', { attr: { type: 'checkbox' } });
  cb.checked = auto;
  const picker = control.createEl('input', { cls: 'bs-color-picker', attr: { type: 'color', value: auto ? '#000000' : color } });
  picker.style.display = auto ? 'none' : 'inline-block';
  picker.style.marginLeft = '6px';
  picker.style.verticalAlign = 'middle';
  const label = control.createEl('span', { cls: 'bs-n', text: auto ? '自动' : '自定义' });
  label.style.marginLeft = '4px';
  cb.addEventListener('change', () => {
    picker.style.display = cb.checked ? 'none' : 'inline-block';
    label.setText(cb.checked ? '自动' : '自定义');
    onChange(cb.checked, picker.value);
  });
  picker.addEventListener('input', () => onChange(false, picker.value));
  return (a: boolean, c: string) => {
    cb.checked = a;
    picker.value = a ? '#000000' : c;
    picker.style.display = a ? 'none' : 'inline-block';
    label.setText(a ? '自动' : '自定义');
  };
}

export class StyleEditModal extends Modal {
  plugin: BadgePlugin;
  existing: StyleDef | null;
  name = '';
  leftBg = '#555555';
  rightBg = '#ffd400';
  leftAuto = true;
  rightAuto = true;
  leftTextColor = '#000000';
  rightTextColor = '#ffffff';

  constructor(plugin: BadgePlugin, existing: StyleDef | null) {
    super(plugin.app);
    this.plugin = plugin;
    this.existing = existing;
    if (existing) {
      this.name = existing.name;
      this.leftBg = existing.leftBg;
      this.rightBg = existing.rightBg;
      this.leftAuto = existing.leftTextColor === '';
      this.rightAuto = existing.rightTextColor === '';
      if (existing.leftTextColor !== '') this.leftTextColor = existing.leftTextColor;
      if (existing.rightTextColor !== '') this.rightTextColor = existing.rightTextColor;
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
    const leftTextRow = new Setting(contentEl).setName('左块文字').setDesc('自动＝按底色亮度黑白');
    addTextColor(leftTextRow.controlEl, this.leftAuto, this.leftTextColor, (auto, color) => {
      this.leftAuto = auto;
      this.leftTextColor = color;
    });
    const rightTextRow = new Setting(contentEl).setName('右块文字').setDesc('自动＝按底色亮度黑白');
    addTextColor(rightTextRow.controlEl, this.rightAuto, this.rightTextColor, (auto, color) => {
      this.rightAuto = auto;
      this.rightTextColor = color;
    });
    new Setting(contentEl).addButton((b) => {
      b.setButtonText('保存').setCta();
      b.onClick(async () => {
        if (this.name.trim() === '') return;
        const patch = {
          name: this.name.trim(),
          leftBg: this.leftBg,
          rightBg: this.rightBg,
          leftTextColor: this.leftAuto ? '' : this.leftTextColor,
          rightTextColor: this.rightAuto ? '' : this.rightTextColor,
        };
        if (this.existing) {
          await this.plugin.store.updateStyle(this.existing.id, patch);
        } else {
          await this.plugin.store.addStyle(patch);
        }
        this.close();
      });
    });
  }
  onClose(): void {
    this.contentEl.empty();
  }
}

export class BadgeEditModal extends Modal {
  plugin: BadgePlugin;
  existing: BadgeDef | null;
  name = '';
  leftText = '';
  rightText = '';
  leftBg = '#555555';
  rightBg = '#ffd400';
  leftAuto = true;
  rightAuto = true;
  leftTextColor = '#000000';
  rightTextColor = '#ffffff';
  link = '';
  group = '';
  logoLeft = '';
  logoLeftInner = '';
  logoRightInner = '';
  logoRight = '';

  constructor(plugin: BadgePlugin, existing: BadgeDef | null, presetGroup?: string, presetStyleId?: string) {
    super(plugin.app);
    this.plugin = plugin;
    this.existing = existing;
    // 已有徽章用自己保存的颜色；新建时用「默认样式」（或样式页指定的样式）作初始配色
    const palette = existing
      ? {
          leftBg: existing.leftBg,
          rightBg: existing.rightBg,
          leftTextColor: existing.leftTextColor,
          rightTextColor: existing.rightTextColor,
        }
      : ((presetStyleId !== undefined ? plugin.store.paletteOfStyle(presetStyleId) : null) ?? plugin.store.defaultPalette());
    this.leftBg = palette.leftBg;
    this.rightBg = palette.rightBg;
    this.leftAuto = palette.leftTextColor === '';
    this.rightAuto = palette.rightTextColor === '';
    if (palette.leftTextColor !== '') this.leftTextColor = palette.leftTextColor;
    if (palette.rightTextColor !== '') this.rightTextColor = palette.rightTextColor;
    if (presetGroup !== undefined) this.group = presetGroup;
    if (existing) {
      this.name = existing.name;
      this.leftText = existing.leftText;
      this.rightText = existing.rightText;
      this.link = existing.link;
      this.group = existing.group;
      this.logoLeft = existing.logoLeft;
      this.logoLeftInner = existing.logoLeftInner;
      this.logoRightInner = existing.logoRightInner;
      this.logoRight = existing.logoRight;
    }
  }

  onOpen(): void {
    const { contentEl } = this;
    this.setTitle(this.existing ? '编辑徽章' : '新建徽章');
    let refreshPreview: () => void = () => {};
    new Setting(contentEl).setName('名字（用于搜索/列表）').addText((t) => t.setValue(this.name).onChange((v) => (this.name = v)));
    new Setting(contentEl).setName('左字（留空＝单段）').addText((t) =>
      t.setValue(this.leftText).onChange((v) => {
        this.leftText = v;
        refreshPreview();
      }),
    );
    new Setting(contentEl).setName('右字').addText((t) =>
      t.setValue(this.rightText).onChange((v) => {
        this.rightText = v;
        refreshPreview();
      }),
    );

    // ── 配色：颜色存在徽章自己身上，样式库只用来快速取色 ──
    const paletteHead = contentEl.createDiv({ cls: 'bs-palette-head' });
    paletteHead.createSpan({ cls: 'bs-palette-title', text: '配色' });
    const previewWrap = paletteHead.createSpan({ cls: 'bs-palette-preview' });
    refreshPreview = (): void => {
      previewWrap.empty();
      previewWrap.innerHTML = this.plugin.store.previewSvg({
        leftText: this.leftText,
        rightText: this.rightText,
        logoLeft: this.logoLeft,
        logoLeftInner: this.logoLeftInner,
        logoRightInner: this.logoRightInner,
        logoRight: this.logoRight,
        leftBg: this.leftBg,
        rightBg: this.rightBg,
        leftTextColor: this.leftAuto ? '' : this.leftTextColor,
        rightTextColor: this.rightAuto ? '' : this.rightTextColor,
      });
    };

    let leftSetter: ((v: string) => void) | null = null;
    let rightSetter: ((v: string) => void) | null = null;
    let leftTextSetter: ((auto: boolean, color: string) => void) | null = null;
    let rightTextSetter: ((auto: boolean, color: string) => void) | null = null;

    new Setting(contentEl)
      .setName('套用样式')
      .setDesc('从样式库一键取色，取完仍可单独微调；样式库的改动与删除都不会影响已创建的徽章')
      .addDropdown((d) => {
        d.addOption('', '选择样式…');
        for (const s of this.plugin.store.settings.styles) d.addOption(s.id, s.name);
        d.setValue('');
        d.onChange((v) => {
          if (v === '') return;
          const p = this.plugin.store.paletteOfStyle(v);
          if (!p) return;
          this.leftBg = p.leftBg;
          this.rightBg = p.rightBg;
          this.leftAuto = p.leftTextColor === '';
          this.rightAuto = p.rightTextColor === '';
          if (p.leftTextColor !== '') this.leftTextColor = p.leftTextColor;
          if (p.rightTextColor !== '') this.rightTextColor = p.rightTextColor;
          leftSetter?.(this.leftBg);
          rightSetter?.(this.rightBg);
          leftTextSetter?.(this.leftAuto, this.leftTextColor);
          rightTextSetter?.(this.rightAuto, this.rightTextColor);
          refreshPreview();
          d.setValue('');
        });
      });

    const leftRow = new Setting(contentEl).setName('左块颜色').setDesc('分类那一段');
    leftSetter = addColor(leftRow.controlEl, this.leftBg, (v) => {
      this.leftBg = v;
      refreshPreview();
    });
    const rightRow = new Setting(contentEl).setName('右块颜色').setDesc('状态那一段');
    rightSetter = addColor(rightRow.controlEl, this.rightBg, (v) => {
      this.rightBg = v;
      refreshPreview();
    });
    const leftTextRow = new Setting(contentEl).setName('左块文字').setDesc('自动＝按底色亮度黑白');
    leftTextSetter = addTextColor(leftTextRow.controlEl, this.leftAuto, this.leftTextColor, (auto, color) => {
      this.leftAuto = auto;
      this.leftTextColor = color;
      refreshPreview();
    });
    const rightTextRow = new Setting(contentEl).setName('右块文字').setDesc('自动＝按底色亮度黑白');
    rightTextSetter = addTextColor(rightTextRow.controlEl, this.rightAuto, this.rightTextColor, (auto, color) => {
      this.rightAuto = auto;
      this.rightTextColor = color;
      refreshPreview();
    });
    refreshPreview();
    // 三行式排版：标题 / 说明 / 控件；图标分左右两处，各占一行
    const logoField = contentEl.createDiv({ cls: 'bs-logo-field' });
    logoField.createDiv({ cls: 'bs-logo-title', text: '图标（选填）' });
    const logoDesc = logoField.createDiv({ cls: 'bs-logo-desc' });
    logoDesc.appendText('留空＝无图标。名字不够用到 ');
    extLink(logoDesc, 'lucide.dev/icons', 'https://lucide.dev/icons/');
    logoDesc.appendText(' 查，或点「浏览图标」挑现成的；品牌 logo 的 SVG 到 ');
    extLink(logoDesc, 'svgcode.com/cn/explore', 'https://svgcode.com/cn/explore');
    logoDesc.appendText(' 找，下载的文件内容可整段粘进来。（想给两个胶囊的四角各配一枚，展开下面的「高级」）');

    /** 一行图标输入：预览 + 输入框 + 浏览按钮 */
    const makeLogoRow = (
      label: string,
      init: string,
      apply: (v: string) => void,
      parent: HTMLElement = logoField,
    ): void => {
      const row = parent.createDiv({ cls: 'bs-logo-control' });
      row.createSpan({ cls: 'bs-logo-label', text: label });
      const preview = row.createSpan({ cls: 'bs-logo-preview' });
      const input = row.createEl('input', {
        cls: 'bs-logo-input',
        attr: { type: 'text', placeholder: '如 github，或粘贴 SVG / path 数据' },
      });
      input.value = init;
      const state = row.createSpan({ cls: 'bs-n' });
      const browse = row.createEl('button', { cls: 'bs-logo-browse', text: '浏览图标' });

      const sync = (): void => {
        const v = input.value.trim();
        apply(v);
        const spec = resolveLogo(v);
        preview.empty();
        if (spec) preview.appendChild(makeLogoEl(spec, 'transparent', 'currentColor', 16));
        state.setText(v === '' ? '' : spec ? '✓' : '⚠ 没认出');
        state.className = v === '' ? 'bs-n' : spec ? 'bs-n bs-logo-ok' : 'bs-n bs-logo-bad';
        refreshPreview();
      };

      input.addEventListener('input', sync);
      browse.addEventListener('click', () => {
        new IconPickerModal(this.app, (name) => {
          input.value = name;
          sync();
        }).open();
      });
      sync();
    };

    makeLogoRow('左段左', this.logoLeft, (v) => (this.logoLeft = v));

    // 高级：另外三个位置默认折起来，不打扰日常使用
    const advanced = logoField.createEl('details', { cls: 'bs-logo-advanced' });
    advanced.createEl('summary', { text: '高级：另外三个位置也能放图标' });
    const advBody = advanced.createDiv({ cls: 'bs-logo-advanced-body' });
    makeLogoRow('左段右', this.logoLeftInner, (v) => (this.logoLeftInner = v), advBody);
    makeLogoRow('右段左', this.logoRightInner, (v) => (this.logoRightInner = v), advBody);
    makeLogoRow('右段右', this.logoRight, (v) => (this.logoRight = v), advBody);

    const linkRow = new Setting(contentEl).setName('链接（选填：网址或笔记名）');
    const hint = contentEl.createDiv({ cls: 'bs-link-hint' });
    const updateHint = (): void => {
      const v = this.link.trim();
      if (v === '') {
        hint.setText('留空＝徽章不带链接，点击不跳转');
        return;
      }
      if (/^https?:\/\//i.test(v)) {
        hint.setText('外部网址，点击时用浏览器打开');
        return;
      }
      const base = v.split('/').pop()?.replace(/\.md$/, '') ?? v;
      const sameName = this.plugin.app.vault.getMarkdownFiles().filter((f) => f.basename === base);
      const dest = this.plugin.app.metadataCache.getFirstLinkpathDest(v, '');
      if (dest) {
        hint.setText(
          sameName.length > 1
            ? `→ ${dest.path}（库里有 ${sameName.length} 个同名笔记，建议从下拉选完整路径）`
            : `→ ${dest.path}`,
        );
      } else {
        hint.setText('⚠ 找不到这篇笔记，点击时会按这个名字打开（可能新建空笔记）');
      }
    };
    linkRow.addText((t) => {
      t.setValue(this.link);
      t.onChange((v) => {
        this.link = v;
        updateHint();
      });
      new FileSuggest(this.plugin.app, t.inputEl, (file) => {
        this.link = file.path;
        updateHint();
      });
    });
    updateHint();
    new Setting(contentEl).setName('分组（选填）').addText((t) => {
      t.setValue(this.group).onChange((v) => (this.group = v.trim()));
      t.inputEl.setAttribute('list', 'bs-group-datalist');
    });
    const dl = contentEl.createEl('datalist', { attr: { id: 'bs-group-datalist' } });
    for (const g of this.plugin.store.groups()) dl.createEl('option', { attr: { value: g } });
    const submit = async (insert: boolean): Promise<void> => {
      if (this.name.trim() === '' || this.rightText.trim() === '') return;
      const patch = {
        name: this.name.trim(),
        leftText: this.leftText.trim(),
        rightText: this.rightText.trim(),
        leftBg: this.leftBg,
        rightBg: this.rightBg,
        leftTextColor: this.leftAuto ? '' : this.leftTextColor,
        rightTextColor: this.rightAuto ? '' : this.rightTextColor,
        link: this.link.trim(),
        group: this.group,
        logoLeft: this.logoLeft.trim(),
        logoLeftInner: this.logoLeftInner.trim(),
        logoRightInner: this.logoRightInner.trim(),
        logoRight: this.logoRight.trim(),
      };
      let badge: BadgeDef;
      if (this.existing) {
        await this.plugin.store.updateBadge(this.existing.id, patch);
        badge = { ...this.existing, ...patch };
      } else {
        badge = await this.plugin.store.addBadge(patch);
      }
      this.close();
      if (insert) insertBadgeAtCursor(this.plugin, badge);
    };
    new Setting(contentEl)
      .addButton((b) => b.setButtonText('保存').onClick(() => void submit(false)))
      .addButton((b) => b.setButtonText('保存并插入').setCta().onClick(() => void submit(true)));
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

    new Setting(containerEl).setName('默认样式').setDesc('新建徽章时的初始配色来源。样式库只是取色模板：改动或删除样式，都不会影响已创建的徽章').addDropdown((d) => {
      for (const s of this.plugin.store.settings.styles) d.addOption(s.id, s.name);
      d.setValue(this.plugin.store.settings.defaultStyleId);
      d.onChange(async (v) => {
        this.plugin.store.settings.defaultStyleId = v;
        await this.plugin.store.save();
      });
    });

    new Setting(containerEl)
      .setName('侧栏默认视图')
      .setDesc('列表：徽章 + 名字 + 引用数；堆放：纯徽章图片流（侧栏右上角的按钮也能随时切换）')
      .addDropdown((d) => {
        d.addOption('list', '列表');
        d.addOption('grid', '堆放');
        d.setValue(this.plugin.store.settings.sidebarView);
        d.onChange(async (v) => {
          this.plugin.store.settings.sidebarView = v as SidebarViewKind;
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

    new Setting(containerEl)
      .setName('清理无用素材')
      .setDesc('素材文件夹里那些已经不属于任何徽章的 badge-xxx.svg（删徽章时它的素材会自动进回收站，这里可以把历史遗留的一次性清掉）')
      .addButton((b) =>
        b.setButtonText('清理').onClick(async () => {
          const n = await this.plugin.store.cleanOrphanAssets();
          new Notice(n > 0 ? `已清理 ${n} 个无用素材（移入回收站）` : '没有发现无用素材');
        }),
      );

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
      if (badge.group !== '') row.setDesc(`分组：${badge.group}`);
      row.controlEl.createEl('img', { attr: { src: svg, style: 'margin-right:8px', draggable: 'false' } });
      row.addButton((b) => b.setButtonText('编辑').onClick(() => new BadgeEditModal(this.plugin, badge).open()));
      row.addButton((b) => b.setButtonText('删除').setWarning().onClick(async () => {
        await this.plugin.store.deleteBadge(badge.id);
        this.display();
      }));
    }
    new Setting(containerEl).addButton((b) => b.setButtonText('新建标签').setCta().onClick(() => new BadgeEditModal(this.plugin, null).open()));
  }
}
