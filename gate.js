/* テスト公開用のパスワード制限
   ・本公開するときは REQUIRE_PASSWORD を false にするだけで解除できます。
   ・パスワードを変えるときは、ブラウザのコンソールで Gate.hash('新しいパスワード') を実行し、
     表示された値を PASSWORD_HASH に貼り付けてください。
   ※ブラウザ内だけの簡易的な制限です。ページのファイル自体は誰でも取得できます。 */
(function (root) {
  'use strict';
  const REQUIRE_PASSWORD = true;
  const PASSWORD_HASH = '560b12e56644a086';
  const KEY = 'eight-islands:web:v2:' + location.pathname.replace(/[^/]*$/, '') + ':gate';
  let memory = false;

  function hash(text) {
    const bytes = new TextEncoder().encode('8islands:' + String(text).trim());
    let x = 0x811c9dc5, y = 0x2545F491;
    bytes.forEach(c => { x ^= c; x = Math.imul(x, 0x01000193) >>> 0; });
    [...bytes, 35].forEach(c => { y ^= c; y = Math.imul(y, 0x01000193) >>> 0; });
    return x.toString(16).padStart(8, '0') + y.toString(16).padStart(8, '0');
  }
  function ok() {
    if (!REQUIRE_PASSWORD || memory) return true;
    try { return localStorage.getItem(KEY) === PASSWORD_HASH; } catch (e) { return false; }
  }
  function check(text) {
    if (hash(text) !== PASSWORD_HASH) return false;
    memory = true;
    try { localStorage.setItem(KEY, PASSWORD_HASH); } catch (e) {}
    return true;
  }
  root.Gate = { required: REQUIRE_PASSWORD, ok, check, hash };
  // ゲーム画面に直接来た場合は、未解除ならスタート画面へ戻す
  if (document.documentElement.dataset.gate === 'game' && !ok()) location.replace('index.html');
})(window);
