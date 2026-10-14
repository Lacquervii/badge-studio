export interface PresetStyle {
  name: string;
  leftBg?: string;
  rightBg: string;
}

export interface PresetFamily {
  name: string;
  desc: string;
  styles: PresetStyle[];
}

export const PRESET_LEFT_BG = '#555555';

export const PRESET_FAMILIES: PresetFamily[] = [
  {
    name: 'GitHub 经典',
    desc: 'shields.io 同款配色',
    styles: [
      { name: 'brightgreen', rightBg: '#4c1' },
      { name: 'green', rightBg: '#97ca00' },
      { name: 'yellow', rightBg: '#dfb317' },
      { name: 'yellowgreen', rightBg: '#a4a61d' },
      { name: 'orange', rightBg: '#fe7d37' },
      { name: 'red', rightBg: '#e05d44' },
      { name: 'blue', rightBg: '#007ec6' },
      { name: 'blueviolet', rightBg: '#8b5cf6' },
      { name: 'lightgrey', rightBg: '#9f9f9f' },
      { name: 'critical', rightBg: '#d73a4a' },
    ],
  },
  {
    name: '莫兰迪',
    desc: '低饱和灰调，温柔不刺眼',
    styles: [
      { name: '雾蓝', rightBg: '#8fa3b0' },
      { name: '豆绿', rightBg: '#9fae94' },
      { name: '陶土', rightBg: '#b8907f' },
      { name: '灰粉', rightBg: '#c4a0a0' },
      { name: '燕麦', rightBg: '#c4b49a' },
      { name: '雾紫', rightBg: '#a49bb8' },
      { name: '云灰', rightBg: '#b0b5ba' },
    ],
  },
  {
    name: '马卡龙',
    desc: '清透 pastel，适合手账/日记',
    styles: [
      { name: '薄荷', rightBg: '#8fd8bd' },
      { name: '草莓', rightBg: '#ffb3c2' },
      { name: '奶油', rightBg: '#ffe49a' },
      { name: '晴空', rightBg: '#a3c8f5' },
      { name: '薰衣草', rightBg: '#c9b8f5' },
      { name: '蜜桃', rightBg: '#ffc4a3' },
      { name: '青苹果', rightBg: '#c8e6a0' },
    ],
  },
  {
    name: '赛博朋克',
    desc: '深底＋霓虹，科技感',
    styles: [
      { name: '霓虹青', leftBg: '#1f2937', rightBg: '#22d3ee' },
      { name: '霓虹粉', leftBg: '#1f2937', rightBg: '#f472b6' },
      { name: '电光紫', leftBg: '#1f2937', rightBg: '#a78bfa' },
      { name: '激光绿', leftBg: '#1f2937', rightBg: '#4ade80' },
      { name: '警戒黄', leftBg: '#1f2937', rightBg: '#fde047' },
    ],
  },
  {
    name: '森林大地',
    desc: '沉稳自然色',
    styles: [
      { name: '苔绿', rightBg: '#4a7c59' },
      { name: '深林', rightBg: '#2d5a3d' },
      { name: '棕褐', rightBg: '#8b6f47' },
      { name: '土黄', rightBg: '#c9a227' },
      { name: '砖红', rightBg: '#a8583c' },
      { name: '墨绿', rightBg: '#3f6b52' },
    ],
  },
  {
    name: '海洋',
    desc: '清冷蓝绿系',
    styles: [
      { name: '深海', rightBg: '#0f4c81' },
      { name: '湖蓝', rightBg: '#2e86ab' },
      { name: '青绿', rightBg: '#1b998b' },
      { name: '天蓝', rightBg: '#4aa3df' },
      { name: '藏蓝', rightBg: '#2c4a7c' },
      { name: '湖绿', rightBg: '#3aa8a0' },
    ],
  },
];
