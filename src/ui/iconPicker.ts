import { SuggestModal, getIconIds, setIcon } from 'obsidian';
import type { App } from 'obsidian';
import { LOGO_CHOICES } from '../core/icons.ts';

/** 全部内置图标名；万一取不到就退回常用候选表 */
let cachedNames: string[] | null = null;
function iconNames(): string[] {
  if (cachedNames) return cachedNames;
  let ids: string[] = [];
  try {
    ids = getIconIds();
  } catch {
    ids = [];
  }
  cachedNames = ids.length > 0 ? ids : [...LOGO_CHOICES];
  return cachedNames;
}

/** 图标选择器：可搜索、可滚动的内置图标列表（原生 datalist 下拉不能滚动） */
export class IconPickerModal extends SuggestModal<string> {
  private pick: (name: string) => void;

  constructor(app: App, pick: (name: string) => void) {
    super(app);
    this.pick = pick;
    this.setPlaceholder(`搜图标名…（内置图标共 ${iconNames().length} 个）`);
    this.setInstructions([
      { command: '↑↓', purpose: '浏览' },
      { command: '↵', purpose: '选用' },
      { command: '名字不够用？', purpose: '到 lucide.dev/icons 查，或粘贴自带 SVG' },
    ]);
  }

  getSuggestions(query: string): string[] {
    const q = query.trim().toLowerCase();
    const names = iconNames();
    if (q === '') return names.slice(0, 120);
    const hit = names.filter((n) => n.includes(q));
    hit.sort((a, b) => a.indexOf(q) - b.indexOf(q) || a.localeCompare(b));
    return hit.slice(0, 200);
  }

  renderSuggestion(name: string, el: HTMLElement): void {
    const iconEl = el.createSpan({ cls: 'bs-picker-icon' });
    setIcon(iconEl, name);
    el.createSpan({ cls: 'bs-picker-name', text: name });
  }

  onChooseSuggestion(name: string): void {
    this.pick(name);
  }
}
