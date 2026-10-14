import type { BadgeSettings, Palette, StyleDef } from './types.ts';

const LEFT_BG = '#555555';

/** 兜底配色：样式库为空、或旧数据找不到对应样式时使用 */
export const FALLBACK_PALETTE: Palette = {
  leftBg: LEFT_BG,
  rightBg: '#ffd400',
  leftTextColor: '',
  rightTextColor: '',
};

export function defaultSettings(): BadgeSettings {
  const styles: StyleDef[] = [
    { id: 's001', name: '黄', rightBg: '#ffd400' },
    { id: 's002', name: '绿', rightBg: '#4caf50' },
    { id: 's003', name: '红', rightBg: '#e05d44' },
    { id: 's004', name: '蓝', rightBg: '#007ec6' },
    { id: 's005', name: '紫', rightBg: '#7c3aed' },
    { id: 's006', name: '橙', rightBg: '#f97316' },
    { id: 's007', name: '灰', rightBg: '#555555' },
  ].map((s) => ({ ...s, leftBg: LEFT_BG, leftTextColor: '', rightTextColor: '' }));

  return {
    assetsFolder: '徽章素材',
    defaultStyleId: 's001',
    sidebarView: 'list',
    // 新装时留空：徽章由用户自己建，样式库只提供配色模板
    groups: [],
    refsPreview: true,
    styles,
    badges: [],
  };
}

export function nextNumericId(ids: string[], withS: boolean): string {
  let max = 0;
  for (const id of ids) {
    const raw = withS ? id.replace(/^s/, '') : id;
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n > max) max = n;
  }
  const num = String(max + 1).padStart(3, '0');
  return withS ? `s${num}` : num;
}
