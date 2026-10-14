import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBadgeSvg, escapeXml, textColorFor } from '../src/core/svg.ts';
import type { LogoSpec, Measure, StyleDef } from '../src/core/types.ts';

const measure: Measure = (t) => t.length * 7;
const yellow: StyleDef = { id: 's001', name: '黄', leftBg: '#555555', rightBg: '#ffd400', leftTextColor: '', rightTextColor: '' };
const blue: StyleDef = { id: 's004', name: '蓝', leftBg: '#555555', rightBg: '#007ec6', leftTextColor: '', rightTextColor: '' };

test('两段式：宽度=左(字宽+14)+右(字宽+14)，两个矩形', () => {
  const svg = buildBadgeSvg({ leftText: 'DOCS', rightText: 'MIT' }, yellow, measure);
  // 左: 28+14=42, 右: 21+14=35, 总 77
  assert.match(svg, /width="77" height="20"/);
  assert.match(svg, /<rect width="42" height="20" fill="#555555"\/>/);
  assert.match(svg, /<rect x="42" width="35" height="20" fill="#ffd400"\/>/);
  assert.match(svg, /clipPath/);
});

test('单段式：只有一个填色矩形，x=0', () => {
  const svg = buildBadgeSvg({ leftText: '', rightText: '示例' }, blue, measure);
  const rects = svg.match(/<rect x=/g) ?? [];
  const fills = svg.match(/<rect [^>]*fill="#007ec6"/g) ?? [];
  assert.equal(fills.length, 1);
  assert.match(svg, /<rect x="0" width="28" height="20" fill="#007ec6"\/>/);
  assert.match(svg, /width="28" height="20" viewBox/);
  assert.match(svg, /textLength="14"/);
  assert.equal(rects.length, 1);
});

test('字色自动：黄底黑字、蓝底白字、深灰底白字', () => {
  assert.equal(textColorFor('#ffd400'), '#000000');
  assert.equal(textColorFor('#007ec6'), '#ffffff');
  assert.equal(textColorFor('#555555'), '#ffffff');
  const svg = buildBadgeSvg({ leftText: 'a', rightText: 'b' }, yellow, measure);
  assert.match(svg, /fill="#ffffff" textLength/);
  assert.match(svg, /fill="#000000" textLength/);
});

test('textLength 写入且等于实测字宽', () => {
  const svg = buildBadgeSvg({ leftText: 'DOCS', rightText: 'MIT' }, yellow, measure);
  assert.match(svg, /textLength="28"/);
  assert.match(svg, /textLength="21"/);
  assert.match(svg, /lengthAdjust="spacingAndGlyphs"/);
});

test('XML 转义', () => {
  assert.equal(escapeXml('a&b<c>"d"'), 'a&amp;b&lt;c&gt;&quot;d&quot;');
  const svg = buildBadgeSvg({ leftText: '', rightText: 'a&b' }, yellow, measure);
  assert.match(svg, />a&amp;b</);
});

test('三位 hex 与缩写处理', () => {
  assert.equal(textColorFor('#fff'), '#000000');
  assert.equal(textColorFor('#000'), '#ffffff');
});

test('自定义文字色优先于自动黑白', () => {
  const style: StyleDef = { id: 's009', name: '自定义', leftBg: '#555555', rightBg: '#ffd400', leftTextColor: '#123456', rightTextColor: '#abcdef' };
  const svg = buildBadgeSvg({ leftText: 'a', rightText: 'b' }, style, measure);
  assert.match(svg, /fill="#123456" textLength/);
  assert.match(svg, /fill="#abcdef" textLength/);
});

test('文字色为空时回退自动黑白', () => {
  const svg = buildBadgeSvg({ leftText: 'a', rightText: 'b' }, yellow, measure);
  assert.match(svg, /fill="#ffffff" textLength/);
  assert.match(svg, /fill="#000000" textLength/);
});

test('单段带图标：图标区算进唯一一段，图标按该段文字色描边', () => {
  const logo: LogoSpec = { inner: '<path d="M1 1h22v22H1z"/>', filled: false };
  const svg = buildBadgeSvg({ leftText: '', rightText: 'MIT', logoLeft: logo }, yellow, measure);
  // 图标区 5+12+4=21 顶替文字左内边距 7：右段 21(字)+14+14=49
  assert.match(svg, /width="49" height="20"/);
  assert.match(svg, /<rect x="0" width="49" height="20" fill="#ffd400"\/>/);
  assert.match(svg, /<g transform="translate\(5 4\) scale\(0\.5\)" fill="none" stroke="#000000"/);
  assert.match(svg, /<path d="M1 1h22v22H1z"\/>/);
  // 图标右边缘 x=17，文字从 21 起：间距正好是 LOGO_GAP=4
  assert.match(svg, /<text x="21" y="14"[^>]*textLength="21"/);
});

test('右侧图标：贴最右端，宽度算进右段，用右段文字色', () => {
  const logo: LogoSpec = { inner: '<path d="M2 2h20v20H2z"/>', filled: true };
  const svg = buildBadgeSvg({ leftText: '科目', rightText: '现代汉语', logoRight: logo }, yellow, measure);
  // 左 14(字)+14=28，右 28(字)+14+14=56，总 84；图标右边缘 79＝徽章右边距 5
  assert.match(svg, /width="84" height="20"/);
  assert.match(svg, /<rect x="28" width="56" height="20" fill="#ffd400"\/>/);
  assert.match(svg, /<g transform="translate\(67 4\) scale\(0\.5\)" fill="#000000"/);
  // 右段文字仍在左内边距处开始
  assert.match(svg, /<text x="35" y="14"[^>]*textLength="28"/);
});

test('内左与内右图标：各自贴在分界两侧', () => {
  const a: LogoSpec = { inner: '<path d="M1 0"/>', filled: false };
  const b: LogoSpec = { inner: '<path d="M2 0"/>', filled: false };
  const svg = buildBadgeSvg({ leftText: 'DOCS', rightText: 'MIT', logoLeftInner: a, logoRightInner: b }, yellow, measure);
  // 左 7+28+21=56，右 21+21+7=49，总 105
  assert.match(svg, /width="105" height="20"/);
  // 内左图标右边缘贴分界：x=39；内右图标贴分界右侧：x=61
  assert.match(svg, /translate\(39 4\) scale\(0\.5\)/);
  assert.match(svg, /translate\(61 4\) scale\(0\.5\)/);
  // 左段文字仍在段首内边距处，右段文字在图标的 LOGO_GAP 之后
  assert.match(svg, /<text x="7" y="14"[^>]*textLength="28"/);
  assert.match(svg, /<text x="77" y="14"[^>]*textLength="21"/);
});

test('左右图标同时存在：单段徽章两侧各留出图标区', () => {
  const left: LogoSpec = { inner: '<path d="M1 1"/>', filled: false };
  const right: LogoSpec = { inner: '<path d="M2 2"/>', filled: true };
  const svg = buildBadgeSvg({ leftText: '', rightText: 'MIT', logoLeft: left, logoRight: right }, blue, measure);
  // 21(字)+14+14+14=63
  assert.match(svg, /width="63" height="20"/);
  assert.match(svg, /translate\(5 4\) scale\(0\.5\)" fill="none" stroke="#ffffff"/);
  assert.match(svg, /translate\(46 4\) scale\(0\.5\)" fill="#ffffff"/);
  assert.match(svg, /<text x="21" y="14"[^>]*textLength="21"/);
});

test('两段带图标：图标挤宽左段，填充型图标用左段文字色', () => {
  const logo: LogoSpec = { inner: '<path fill="currentColor" d="M0 0h24v24H0z"/>', filled: true };
  const svg = buildBadgeSvg({ leftText: 'DOCS', rightText: 'MIT', logoLeft: logo }, yellow, measure);
  // 左 28(字)+14+14=56，右 21+14=35
  assert.match(svg, /width="91" height="20"/);
  assert.match(svg, /<rect width="56" height="20" fill="#555555"\/>/);
  assert.match(svg, /<rect x="56" width="35" height="20" fill="#ffd400"\/>/);
  assert.match(svg, /<g transform="translate\(5 4\) scale\(0\.5\)" fill="#ffffff"/);
  // 图标自带的 currentColor 会被替换成所在段的实际文字色，否则独立 SVG 里会显黑
  assert.match(svg, /fill="#ffffff" d="M0 0h24v24H0z"/);
  // 图标右边缘 x=17，左段文字从 21 起
  assert.match(svg, /<text x="21" y="14"[^>]*textLength="28"/);
});
