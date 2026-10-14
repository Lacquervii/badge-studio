export interface PresetStyle {
  name: string;
  rightBg: string;
}

const LEFT_BG = '#555555';

export const PRESET_LEFT_BG = LEFT_BG;

export const PRESET_STYLES: PresetStyle[] = [
  { name: 'brightgreen', rightBg: '#44cc11' },
  { name: 'green', rightBg: '#97ca00' },
  { name: 'yellowgreen', rightBg: '#a4a61d' },
  { name: 'yellow', rightBg: '#dfb317' },
  { name: 'orange', rightBg: '#fe7d37' },
  { name: 'red', rightBg: '#e05d44' },
  { name: 'blue', rightBg: '#007ec6' },
  { name: 'lightgrey', rightBg: '#9f9f9f' },
  { name: 'blueviolet', rightBg: '#8a2be2' },
  { name: 'pink', rightBg: '#ff69b4' },
  { name: '9cf', rightBg: '#99ccff' },
];
