import type { BadgeSettings, Palette, StyleDef } from './types.ts';

const LEFT_BG = '#555555';

/** 兜底配色：样式库为空、或旧数据找不到对应样式时使用 */
export const FALLBACK_PALETTE: Palette = {
  leftBg: LEFT_BG,
  rightBg: '#ffd400',
  leftTextColor: '',
  rightTextColor: '',
};

function paletteOfStyle(styles: StyleDef[], styleId: string): Palette {
  const s = styles.find((x) => x.id === styleId) ?? styles[0];
  return { leftBg: s.leftBg, rightBg: s.rightBg, leftTextColor: s.leftTextColor, rightTextColor: s.rightTextColor };
}

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
    groups: ['状态'],
    refsPreview: true,
    styles,
    badges: [
      { id: '001', name: '状态-未开始', leftText: '状态', rightText: '未开始', link: '', group: '状态', logoLeft: 'circle', logoLeftInner: '', logoRightInner: '', logoRight: '', ...paletteOfStyle(styles, 's007') },
      { id: '002', name: '状态-进行中', leftText: '状态', rightText: '进行中', link: '', group: '状态', logoLeft: 'clock', logoLeftInner: '', logoRightInner: '', logoRight: '', ...paletteOfStyle(styles, 's001') },
      { id: '003', name: '状态-已完成', leftText: '状态', rightText: '已完成', link: '', group: '状态', logoLeft: 'check-circle', logoLeftInner: '', logoRightInner: '', logoRight: '', ...paletteOfStyle(styles, 's002') },
    ],
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
