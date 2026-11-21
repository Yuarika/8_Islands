/* 8 Islands — 判定ロジック（表示・保存・演出は持たない）
   島の番号: 0上 1右上 2右下 3下 4左下 5左上 6中央 7八つ目の島 / 8 = はじまりの足場 */
(function (root) {
  'use strict';
  const MASKS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
  const START = 8;
  const ALL = 255;
  const MAX_STAGE = 99n; // Stageは99まで。100以上には進めない
  const big = v => BigInt(v);
  const abs = n => (n < 0n ? -n : n);

  /* 移動判定用: bit0-6 = 一の位のセグメント、bit7 = 8つ目の島 */
  function segments(stage) {
    const n = big(stage), a = abs(n);
    const ones = Number(a % 10n), tens = Number((a / 10n) % 10n);
    const eighth = n < 0n || (tens !== 0 && (MASKS[tens] & 64) !== 0);
    return MASKS[ones] | (eighth ? 128 : 0);
  }

  /* 表示用: −1〜−9は左の桁の中央をマイナスに、それ以外は絶対値の下2桁（十の位0は非表示） */
  function display(stage) {
    const n = big(stage), a = abs(n);
    const ones = Number(a % 10n), tens = Number((a / 10n) % 10n);
    if (n < 0n && a < 10n) return { left: 64, right: MASKS[ones], text: '−' + ones };
    return { left: tens ? MASKS[tens] : 0, right: MASKS[ones], text: (tens ? String(tens) : '') + ones };
  }

  function initial() {
    return { stage: '1', lights: 0, island: START, fallen: false, cleared: false, tutorial: true };
  }

  /* 選択時点の状態で1回だけ判定する */
  function move(state, index) {
    if (!Number.isInteger(index) || index < 0 || index > 7 || state.fallen) return { state, outcome: 'blocked' };
    if (state.cleared) return { state: { ...state, island: index }, outcome: 'free' };
    const bit = 1 << index;
    const next = (big(state.stage) + 1n).toString();
    if (!(segments(state.stage) & bit)) {
      return { state: { ...state, lights: 0, fallen: true, tutorial: false }, outcome: 'fall' };
    }
    if (big(next) > MAX_STAGE) return { state, outcome: 'limit' };
    const correct = !(segments(next) & bit);
    const lights = correct ? state.lights ^ bit : 0;
    const result = { ...state, stage: next, lights, island: index, cleared: lights === ALL, tutorial: false };
    return { state: result, outcome: result.cleared ? 'clear' : correct ? (lights & bit ? 'success' : 'toggle') : 'wrong' };
  }

  /* クリア後のみ、はじまりの足場へ戻れる */
  function goStart(state) {
    if (!state.cleared) return { state, outcome: 'blocked' };
    return { state: { ...state, island: START }, outcome: 'free' };
  }

  /* 奈落からの再開。「1つ前」は落下の原因となった選択を行ったStage n に対する n−1 */
  function restart(state, previous) {
    return { ...initial(), tutorial: !previous, stage: previous ? (big(state.stage) - 1n).toString() : '1' };
  }

  function restore(raw) {
    try {
      const s = JSON.parse(raw);
      if (!s || typeof s.stage !== 'string' || !/^-?(0|[1-9]\d*)$/.test(s.stage) || big(s.stage) > MAX_STAGE) return null;
      if (!Number.isInteger(s.lights) || s.lights < 0 || s.lights > ALL) return null;
      if (!Number.isInteger(s.island) || s.island < 0 || s.island > START) return null;
      if (!['fallen', 'cleared', 'tutorial'].every(k => typeof s[k] === 'boolean')) return null;
      if (s.cleared !== (s.lights === ALL)) return null;
      if (s.fallen && (s.lights !== 0 || s.cleared)) return null;
      if (s.tutorial && (s.stage !== '1' || s.lights !== 0 || s.fallen)) return null;
      return { stage: big(s.stage).toString(), lights: s.lights, island: s.island, fallen: s.fallen, cleared: s.cleared, tutorial: s.tutorial };
    } catch (e) { return null; }
  }

  const rules = { MASKS, START, ALL, MAX_STAGE, segments, display, initial, move, goStart, restart, restore };
  if (typeof module !== 'undefined' && module.exports) module.exports = rules;
  else root.IslandRules = rules;
})(typeof globalThis !== 'undefined' ? globalThis : this);
