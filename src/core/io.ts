import { FALLBACK_PALETTE, nextNumericId } from './defaults.ts';
import type { LegacyBadge } from './migrate.ts';
import type { BadgeDef, BadgeSettings, Palette, StyleDef } from './types.ts';

export interface ExportData {
  styles: StyleDef[];
  badges: BadgeDef[];
}

export function exportJson(settings: BadgeSettings): string {
  const data: ExportData = { styles: settings.styles, badges: settings.badges };
  return JSON.stringify(data, null, 2);
}

export interface ImportResult {
  stylesAdded: number;
  badgesAdded: number;
  skipped: number;
  error?: string;
}

function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
}

function importTextColor(v: unknown): string {
  return isHexColor(v) ? v : '';
}

function fail(error: string): ImportResult {
  return { stylesAdded: 0, badgesAdded: 0, skipped: 0, error };
}

/**
 * 取徽章配色：
 * - 新数据自带 leftBg/rightBg，直接采用；
 * - 旧数据只有 styleId，则按导入映射找到本地样式，把它的颜色复制过来（迁移语义）。
 */
function pickPalette(cand: LegacyBadge, styleIdMap: Map<string, string>, settings: BadgeSettings): Palette {
  if (isHexColor(cand.leftBg) && isHexColor(cand.rightBg)) {
    return {
      leftBg: cand.leftBg,
      rightBg: cand.rightBg,
      leftTextColor: importTextColor(cand.leftTextColor),
      rightTextColor: importTextColor(cand.rightTextColor),
    };
  }
  const oldId = typeof cand.styleId === 'string' ? cand.styleId : '';
  const mapped = styleIdMap.get(oldId) ?? settings.defaultStyleId;
  const s = settings.styles.find((x) => x.id === mapped) ?? settings.styles[0];
  if (!s) return { ...FALLBACK_PALETTE };
  return { leftBg: s.leftBg, rightBg: s.rightBg, leftTextColor: s.leftTextColor, rightTextColor: s.rightTextColor };
}

export function mergeImport(settings: BadgeSettings, raw: unknown): ImportResult {
  if (typeof raw !== 'object' || raw === null) return fail('文件不是有效的 JSON 对象');
  const data = raw as Partial<ExportData>;
  if (!Array.isArray(data.styles) || !Array.isArray(data.badges)) return fail('缺少 styles 或 badges 数组');

  const styleIdMap = new Map<string, string>();
  let stylesAdded = 0;
  for (const s of data.styles) {
    if (typeof s !== 'object' || s === null) continue;
    const cand = s as Partial<StyleDef>;
    if (typeof cand.name !== 'string' || cand.name.trim() === '') continue;
    if (!isHexColor(cand.leftBg) || !isHexColor(cand.rightBg)) continue;
    const oldId = typeof cand.id === 'string' ? cand.id : '';
    const existing = settings.styles.find((x) => x.name === cand.name!.trim());
    if (existing) {
      if (oldId !== '') styleIdMap.set(oldId, existing.id);
      continue;
    }
    const id = nextNumericId(settings.styles.map((x) => x.id), true);
    const style: StyleDef = {
      id,
      name: cand.name.trim(),
      leftBg: cand.leftBg,
      rightBg: cand.rightBg,
      leftTextColor: importTextColor(cand.leftTextColor),
      rightTextColor: importTextColor(cand.rightTextColor),
    };
    settings.styles.push(style);
    if (oldId !== '') styleIdMap.set(oldId, id);
    stylesAdded++;
  }

  let badgesAdded = 0;
  let skipped = 0;
  for (const b of data.badges) {
    if (typeof b !== 'object' || b === null) {
      skipped++;
      continue;
    }
    const cand = b as Partial<BadgeDef>;
    if (typeof cand.name !== 'string' || cand.name.trim() === '' || typeof cand.rightText !== 'string' || cand.rightText.trim() === '') {
      skipped++;
      continue;
    }
    if (settings.badges.some((x) => x.name === cand.name!.trim())) {
      skipped++;
      continue;
    }
    const badge: BadgeDef = {
      id: nextNumericId(settings.badges.map((x) => x.id), false),
      name: cand.name.trim(),
      leftText: typeof cand.leftText === 'string' ? cand.leftText : '',
      rightText: cand.rightText.trim(),
      link: typeof cand.link === 'string' ? cand.link : '',
      group: typeof cand.group === 'string' ? cand.group : '',
      // 旧导出文件里图标字段叫 logo，迁移到 logoLeft
      logoLeft:
        typeof cand.logoLeft === 'string'
          ? cand.logoLeft
          : typeof (cand as LegacyBadge).logo === 'string'
            ? ((cand as LegacyBadge).logo as string)
            : '',
      logoLeftInner: typeof cand.logoLeftInner === 'string' ? cand.logoLeftInner : '',
      logoRightInner: typeof cand.logoRightInner === 'string' ? cand.logoRightInner : '',
      logoRight: typeof cand.logoRight === 'string' ? cand.logoRight : '',
      ...pickPalette(cand as LegacyBadge, styleIdMap, settings),
    };
    settings.badges.push(badge);
    badgesAdded++;
  }
  return { stylesAdded, badgesAdded, skipped };
}
