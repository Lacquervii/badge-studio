import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBadgeSvg, escapeXml, textColorFor } from '../src/core/svg.ts';
import type { Measure, StyleDef } from '../src/core/types.ts';

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
