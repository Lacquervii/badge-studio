import test from 'node:test';
import assert from 'node:assert/strict';
import { findMarkerRuns, parseBadgeMarker, markerText } from '../src/core/parse.ts';

test('parseBadgeMarker 半角/全角冒号、首尾空格', () => {
  assert.equal(parseBadgeMarker('badge: 状态-进行中'), '状态-进行中');
  assert.equal(parseBadgeMarker('badge：状态-进行中'), '状态-进行中');
  assert.equal(parseBadgeMarker('  badge :  名字  '), '名字');
  assert.equal(parseBadgeMarker('普通文字'), null);
  assert.equal(parseBadgeMarker('badge:'), null);
  assert.equal(parseBadgeMarker('行中 badge: x'), null);
});

test('findMarkerRuns 连续行合并成一排，空行/普通行断开', () => {
  const lines = [
    'badge: a',
    'badge: b',
    '',
    'badge: c',
    '普通段落',
    'badge: d',
  ];
  const runs = findMarkerRuns(lines);
  assert.equal(runs.length, 3);
  assert.deepEqual(runs[0], { startLine: 0, endLine: 1, names: ['a', 'b'] });
  assert.deepEqual(runs[1], { startLine: 2 + 1, endLine: 3, names: ['c'] });
  assert.deepEqual(runs[2], { startLine: 5, endLine: 5, names: ['d'] });
});

test('markerText 生成插入文本', () => {
  assert.equal(markerText('单段-示例'), 'badge: 单段-示例');
});
