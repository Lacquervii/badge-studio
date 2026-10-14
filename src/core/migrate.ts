import { FALLBACK_PALETTE } from './defaults.ts';
import type { BadgeDef, Palette, StyleDef } from './types.ts';

/** 旧版数据结构：徽章只记录 styleId（颜色在样式库里）、图标只有一个 logo 位 */
export interface LegacyBadge extends Partial<BadgeDef> {
  styleId?: unknown;
  /** 更早版本的图标字段：只有一个位置 */
  logo?: unknown;
}

/**
 * 旧版只有一个图标位（logo）→ 迁移成「左段最左」，并补齐其余三个位置。
 * 返回是否需要保存。
 */
export function migrateBadgeLogos(badge: LegacyBadge): boolean {
  let changed = false;
  if (typeof badge.logoLeft !== 'string') {
    badge.logoLeft = typeof badge.logo === 'string' ? badge.logo : '';
    changed = true;
  }
  if (typeof badge.logoLeftInner !== 'string') badge.logoLeftInner = '';
  if (typeof badge.logoRightInner !== 'string') badge.logoRightInner = '';
  if (typeof badge.logoRight !== 'string') badge.logoRight = '';
  delete badge.logo;
  return changed;
}

/**
 * 把旧徽章的样式颜色一次复制到徽章自己身上（此后徽章与样式库再无关系）。
 * 已是新结构时只清理遗留的 styleId 字段；返回是否发生了实质迁移。
 */
export function migrateBadgeColors(
  badge: LegacyBadge,
  styles: StyleDef[],
  fallback: Palette = FALLBACK_PALETTE,
): boolean {
  const hasOwnPalette =
    typeof badge.leftBg === 'string' &&
    typeof badge.rightBg === 'string' &&
    typeof badge.leftTextColor === 'string' &&
    typeof badge.rightTextColor === 'string';
  if (hasOwnPalette) {
    delete badge.styleId;
    return false;
  }
  const oldId = typeof badge.styleId === 'string' ? badge.styleId : '';
  const s = styles.find((x) => x.id === oldId);
  badge.leftBg = s?.leftBg ?? fallback.leftBg;
  badge.rightBg = s?.rightBg ?? fallback.rightBg;
  badge.leftTextColor = s?.leftTextColor ?? fallback.leftTextColor;
  badge.rightTextColor = s?.rightTextColor ?? fallback.rightTextColor;
  delete badge.styleId;
  return true;
}
