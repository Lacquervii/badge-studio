import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, nextNumericId } from '../src/core/defaults.ts';

test('默认设置：7 个样式、3 个标签', () => {
  const s = defaultSettings();
  assert.equal(s.styles.length, 7);
  assert.equal(s.badges.length, 3);
  assert.equal(s.assetsFolder, '徽章素材');
  assert.equal(s.defaultStyleId, 's001');
});

test('默认设置：样式左块统一深灰，右块色值符合规格', () => {
  const s = defaultSettings();
  for (const st of s.styles) assert.equal(st.leftBg, '#555555');
  const byName = Object.fromEntries(s.styles.map((st) => [st.name, st.rightBg]));
  assert.equal(byName['黄'], '#ffd400');
  assert.equal(byName['蓝'], '#007ec6');
  assert.equal(byName['紫'], '#7c3aed');
});

test('默认设置：第三个标签是单段（leftText 空）', () => {
  const s = defaultSettings();
  assert.equal(s.badges[2].leftText, '');
  assert.equal(s.badges[2].rightText, '示例');
});

test('nextNumericId 递增且补零', () => {
  assert.equal(nextNumericId(['001', '003'], false), '004');
  assert.equal(nextNumericId([], false), '001');
  assert.equal(nextNumericId(['s007'], true), 's008');
});
