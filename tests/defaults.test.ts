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

test('默认设置：自带三枚状态徽章（未开始 / 进行中 / 已完成）', () => {
  const s = defaultSettings();
  assert.deepEqual(
    s.badges.map((b) => b.name),
    ['状态-未开始', '状态-进行中', '状态-已完成'],
  );
  assert.deepEqual(
    s.badges.map((b) => b.rightText),
    ['未开始', '进行中', '已完成'],
  );
  for (const b of s.badges) assert.equal(b.leftText, '状态');
  for (const b of s.badges) assert.equal(b.group, '状态');
});

test('默认设置：三枚状态徽章各带一枚图标，配色分别是灰 / 黄 / 绿', () => {
  const s = defaultSettings();
  assert.deepEqual(
    s.badges.map((b) => b.logoLeft),
    ['circle', 'clock', 'check-circle'],
  );
  assert.deepEqual(
    s.badges.map((b) => b.rightBg),
    ['#555555', '#ffd400', '#4caf50'],
  );
});

test('nextNumericId 递增且补零', () => {
  assert.equal(nextNumericId(['001', '003'], false), '004');
  assert.equal(nextNumericId([], false), '001');
  assert.equal(nextNumericId(['s007'], true), 's008');
});
