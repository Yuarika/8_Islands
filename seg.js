/* 7セグメント描画（サムネイルと同じ、角を斜めに切った太いセグメント） */
(function (root) {
  'use strict';
  const SKEW = 7; // 傾き(度)

  /* 幅w・高さh・太さT・すき間g の1桁ぶんの7つの多角形。順番: 上 右上 右下 下 左下 左上 中央 */
  function polys(w, h, T, g) {
    const m = h / 2, t = T / 2;
    return [
      [[g, 0], [w - g, 0], [w - T - g, T], [T + g, T]],
      [[w, g], [w, m - t - g], [w - t, m - g], [w - T, m - t - g], [w - T, T + g]],
      [[w - T, m + t + g], [w - t, m + g], [w, m + t + g], [w, h - g], [w - T, h - T - g]],
      [[T + g, h - T], [w - T - g, h - T], [w - g, h], [g, h]],
      [[0, m + t + g], [t, m + g], [T, m + t + g], [T, h - T - g], [0, h - g]],
      [[0, g], [T, T + g], [T, m - t - g], [t, m - g], [0, m - t - g]],
      [[t + g, m], [T + g, m - t], [w - T - g, m - t], [w - t - g, m], [w - T - g, m + t], [T + g, m + t]]
    ];
  }
  const pts = p => p.map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' ');
  const shift = h => h * Math.tan(SKEW * Math.PI / 180);

  /* 1桁ぶんの<g>文字列。x,yは左上。各polygonに class="seg" data-s=番号 */
  function digit(x, y, w, h, T, g, attrs = '') {
    const s = shift(h);
    return `<g transform="translate(${(x + s).toFixed(1)} ${y}) skewX(-${SKEW})" ${attrs}>` +
      polys(w, h, T, g).map((p, i) => `<polygon class="seg" data-s="${i}" points="${pts(p)}"/>`).join('') + '</g>';
  }

  /* <svg data-seg8> を全点灯の「8」で埋める（タイトル用） */
  function fillLogos() {
    document.querySelectorAll('svg[data-seg8]').forEach(svg => {
      const w = 60, h = 100, T = 13, g = 2.2;
      svg.setAttribute('viewBox', `-4 -4 ${w + shift(h) + 8} ${h + 8}`);
      svg.innerHTML = digit(0, 0, w, h, T, g).replace(/class="seg"/g, 'class="seg on"');
    });
  }
  root.Seg = { polys, digit, shift, fillLogos };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fillLogos); else fillLogos();
})(window);
