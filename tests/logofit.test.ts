import test from 'node:test';
import assert from 'node:assert/strict';
import { fitCustomFragment, isCustomShape } from '../src/core/logofit.ts';

test('纯 path 数据：包成 path 元素，按填充着色', () => {
  const spec = fitCustomFragment('M12 2L2 7v10l10 5 10-5V7z');
  assert.ok(spec);
  assert.equal(spec.filled, true);
  assert.equal(spec.inner, '<path d="M12 2L2 7v10l10 5 10-5V7z"/>');
});

test('24×24 的整段 SVG：不需要额外缩放', () => {
  const spec = fitCustomFragment('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>');
  assert.ok(spec);
  assert.equal(spec.filled, true);
  assert.equal(spec.inner, '<path d="M0 0h24v24H0z"/>');
});

test('描边型图标（fill=none + stroke）：保持描边', () => {
  const spec = fitCustomFragment(
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>',
  );
  assert.ok(spec);
  assert.equal(spec.filled, false);
  assert.equal(spec.inner, '<circle cx="12" cy="12" r="9"/>');
});

test('大 viewBox：等比缩放到 24×24', () => {
  const spec = fitCustomFragment('<svg viewBox="0 0 1024 1024"><path d="M0 0h1024v1024H0z"/></svg>');
  assert.ok(spec);
  assert.match(spec.inner, /^<g transform="translate\(0 0\) scale\(0\.0234\)">/);
});

test('非方形 viewBox：居中摆放', () => {
  const spec = fitCustomFragment('<svg viewBox="0 0 48 24"><path d="M0 0h48v24H0z"/></svg>');
  assert.ok(spec);
  assert.match(spec.inner, /^<g transform="translate\(0 6\) scale\(0\.5\)">/);
});

test('没有 viewBox 时按 width/height 缩放', () => {
  const spec = fitCustomFragment('<svg width="256" height="256"><path d="M0 0h256v256H0z"/></svg>');
  assert.ok(spec);
  assert.match(spec.inner, /scale\(0\.0938\)/);
});

test('写死的颜色换成 currentColor，跟随徽章文字色', () => {
  const spec = fitCustomFragment('<path fill="#e91e63" stroke="rgb(1,2,3)" d="M0 0h24v24H0z"/>');
  assert.ok(spec);
  assert.equal(spec.inner, '<path fill="currentColor" stroke="currentColor" d="M0 0h24v24H0z"/>');
});

test('空白输入返回 null', () => {
  assert.equal(fitCustomFragment('   '), null);
});

test('isCustomShape 区分图标名与自定义图形', () => {
  assert.equal(isCustomShape('github'), false);
  assert.equal(isCustomShape('<path d="M0 0"/>'), true);
  assert.equal(isCustomShape('M0 0h24v24H0z'), true);
});
