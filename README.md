# 8 Islands — WEB PUZZLE

浮遊する8つの島を、すべて水色に灯すWeb謎です。HTML / CSS / JavaScript だけで動くので、ビルドやサーバーは要りません。

## GitHub Pages で公開する

1. GitHub で新しいリポジトリを作ります（例: `8-islands`。公開URLは `https://ユーザー名.github.io/8-islands/` になります）。
2. **`_dev` フォルダー以外のすべて**をリポジトリのルートにアップロードします。
   （「Add file → Upload files」にドラッグ＆ドロップ。`index.html` がリポジトリ直下に来るようにします）
   - アップロードするもの: `index.html` `index.css` `game.html` `game.css` `game.js` `rules.js` `seg.js` `gate.js` `favicon.svg` `img/` `.nojekyll` `README.md`
   - `_dev` には解法入りのテストと旧版が入っています。公開リポジトリには入れないでください。
3. リポジトリの **Settings → Pages** を開き、Source を「Deploy from a branch」、Branch を `main` / `/(root)` にして Save します。
4. 1〜2分後に表示されるURLで遊べます。

`.nojekyll` は隠しファイルなので、ドラッグ＆ドロップで抜けることがあります。抜けても動作には影響しません。

## テスト公開（パスワード）

スタート画面でパスワードを入れるまで START が押せません。`game.html` に直接アクセスしてもスタート画面へ戻されます。一度解除すると、そのブラウザでは次回から入力不要です。

- 現在のパスワード: `yuarika`
- **本公開するとき**: `gate.js` の `REQUIRE_PASSWORD` を `false` にし、`index.html` と `game.html` の `<meta name="robots" content="noindex">` を削除します。
- **パスワードを変えるとき**: ゲームのページを開いてブラウザのコンソールで `Gate.hash('新しいパスワード')` を実行し、出てきた値を `gate.js` の `PASSWORD_HASH` に貼り付けます。

※ブラウザ内だけの簡易的な制限です。リポジトリやファイルを直接見られると中身は読めます。

## 書き換える場所

- **スタート画面の挑戦ポスト・リンク**: `index.html` 末尾の `X_POST_URL` / `X_POST_TEXT` / `PROFILE_URL`
- **クリアポスト・リンク**: `game.js` 冒頭の `PUZZLE_URL` / `ANNOUNCEMENT_POST_URL` / `CLEAR_TAGS` / `PROFILE_URL`
- **OGP（Xのカード）**: `index.html` の `og:url` / `og:image` / `twitter:image`。公開URLが `https://yuarika.github.io/8-islands/` 以外なら変更します。
- **飛行速度・高さ**: `game.js` の `FLIGHT`
- **効果音ファイル**: `game.js` の `SFX_FILES` に登録すると、内蔵の合成音より優先されます（例: `{ clear: 'sfx/clear.mp3' }`）

## ファイル

| ファイル | 内容 |
|---|---|
| index.html / index.css | スタート画面（パスワード・ABOUT・HOW TO PLAY・START・挑戦ポスト・作者プロフィール） |
| game.html / game.css / game.js | ゲーム画面（島の画面・選択ボード・奈落・遊び方・クリア画面） |
| rules.js | Stageと移動の判定 |
| seg.js | 7セグメント描画（タイトルの「8」とボードの数字） |
| gate.js | テスト公開用のパスワード制限 |
| img/thumbnail.png / favicon.svg | サムネイル・アイコン |
| _dev/ | 制作者用（解法入りテスト `rules.test.cjs`、旧版 `_old_v1`）。**公開しない** |

テスト: `node _dev/rules.test.cjs`
