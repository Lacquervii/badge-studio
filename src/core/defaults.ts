import type { BadgeSettings } from './types.ts';

const LEFT_BG = '#555555';

export function defaultSettings(): BadgeSettings {
  const styles = [
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
    groups: ['状态', '科目'],
    refsPreview: true,
    styles,
    badges: [
      { id: '001', name: '状态-进行中', leftText: '状态', rightText: '进行中', styleId: 's001', link: '', group: '状态' },
      { id: '002', name: '科目-现代汉语', leftText: '科目', rightText: '现代汉语', styleId: 's004', link: '', group: '科目' },
      { id: '003', name: '单段-示例', leftText: '', rightText: '示例', styleId: 's005', link: '', group: '' },
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
