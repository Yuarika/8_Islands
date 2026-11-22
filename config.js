/* ===============================================================
   投稿・リンクの設定
   公開後に書き換えるのはこのファイルだけでOKです。
   =============================================================== */
window.SITE_CONFIG = {

  // 公開告知ポストのURL
  // 告知をポストしたら、'' の中にそのポストのURLを貼ってください。
  // 例: 'https://x.com/yuarikaa/status/1234567890123456789'
  // 空欄のままなら、クリアポストには含まれません。
  ANNOUNCEMENT_POST_URL: '',

  // この謎の公開URL（ポストに入るURL）
  // 末尾の ?v=3 は、Xが古いカード情報（サムネイルなし）を使わないようにするためのものです。
  // サムネイルが出なくなったら数字を変えてください（?v=4 など）。ページはそのまま開けます。
  PUZZLE_URL: 'https://yuarika.github.io/8_Islands/?v=3',

  // スタート画面「POST ON X」の投稿文
  CHALLENGE_TEXT: 'WEB謎『8 Islands』に挑戦します！',
  CHALLENGE_TAGS: '#Web_8_Islands #謎解き',

  // クリア画面「クリアをポスト」の投稿文
  // 投稿は「CLEAR_TEXT → 告知ポストURL → 公開URL → CLEAR_TAGS」の順になります。
  CLEAR_TEXT: 'Web謎「8 Islands」をクリアしました！',
  CLEAR_TAGS: '#Web_8_Islands',

  // 作者プロフィール
  PROFILE_URL: 'https://yuarika.github.io/Yuarika_Profile/'
};
