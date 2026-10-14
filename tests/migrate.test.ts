import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings } from '../src/core/defaults.ts';
import { migrateBadgeColors, migrateBadgeLogos } from '../src/core/migrate.ts';
import type { LegacyBadge } from '../src/core/migrate.ts';
import type { BadgeDef, StyleDef } from '../src/core/types.ts';

const styles: StyleDef[] = [
  { id: 's001', name: '黄', leftBg: '#555555', rightBg: '#ffd400', leftTextColor: '', rightTextColor: '' },
  { id: 's004', name: '蓝', leftBg: '#555555', rightBg: '#007ec6', leftTextColor: '#111111', rightTextColor: '' },
];

test('旧数据：按 styleId 把样式颜色复制到徽章上，并清掉 styleId', () => {
  const badge: LegacyBadge = { id: '001', name: 'A', styleId: 's004' };
  const changed = migrateBadgeColors(badge, styles);
  assert.equal(changed, true);
  assert.equal(badge.rightBg, '#007ec6');
  assert.equal(badge.leftBg, '#555555');
  assert.equal(badge.leftTextColor, '#111111');
  assert.equal(badge.styleId, undefined);
});

test('旧数据：样式已不存在时用兜底配色', () => {
  const badge: LegacyBadge = { id: '002', name: 'B', styleId: 's999' };
  const changed = migrateBadgeColors(badge, styles);
  assert.equal(changed, true);
  assert.equal(badge.leftBg, '#555555');
  assert.equal(badge.rightBg, '#ffd400');
});

test('新数据：颜色已在徽章上，不迁移，只清理遗留字段', () => {
  const badge: LegacyBadge = {
    id: '003',
    name: 'C',
    leftBg: '#222222',
    rightBg: '#333333',
    leftTextColor: '',
    rightTextColor: '#ffffff',
  };
  const changed = migrateBadgeColors(badge, styles);
  assert.equal(changed, false);
  assert.equal(badge.leftBg, '#222222');
  assert.equal(badge.rightBg, '#333333');
});

test('新数据带 styleId 残留时也会被清掉', () => {
  const badge: LegacyBadge = {
    id: '004',
    name: 'D',
    leftBg: '#222222',
    rightBg: '#333333',
    leftTextColor: '',
    rightTextColor: '',
    styleId: 's001',
  };
  assert.equal(migrateBadgeColors(badge, styles), false);
  assert.equal(badge.styleId, undefined);
});

test('旧图标字段 logo → 迁移成「左段最左」，其余三个位置补空', () => {
  const badge: LegacyBadge = { id: '005', name: 'E', logo: 'github' };
  assert.equal(migrateBadgeLogos(badge), true);
  assert.equal(badge.logoLeft, 'github');
  assert.equal(badge.logoLeftInner, '');
  assert.equal(badge.logoRightInner, '');
  assert.equal(badge.logoRight, '');
  assert.equal(badge.logo, undefined);
});

test('已有 logoLeft 时不再迁移，只补齐缺的位置', () => {
  const badge: LegacyBadge = { id: '006', name: 'F', logoLeft: 'book' };
  assert.equal(migrateBadgeLogos(badge), false);
  assert.equal(badge.logoLeft, 'book');
  assert.equal(badge.logoLeftInner, '');
  assert.equal(badge.logoRight, '');
});

test('默认设置里的徽章已经自带颜色，与样式无关', () => {
  const s = defaultSettings();
  for (const b of s.badges) {
    assert.match(b.leftBg, /^#/);
    assert.match(b.rightBg, /^#/);
    assert.equal((b as BadgeDef & { styleId?: unknown }).styleId, undefined);
  }
});
