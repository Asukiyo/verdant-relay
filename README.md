# VERDANT RELAY — GitHub Pages公開版

近未来の3D拠点育成ゲーム。ビームで残骸を解体し、合金・コアを取引して拠点を拡張します。

## GitHubの画面から公開する
1. GitHubで新しいリポジトリを作成します。推奨名は `verdant-relay`。Publicを選び、READMEを追加して作成します（ソースコードも一般公開されます）。
2. このZIPを展開し、中身の `index.html`、`style.css`、`game` フォルダー、`vendor` フォルダー、`README.md`、`.nojekyll` をリポジトリの直下へアップロードしてコミットします。ZIPそのものや、外側のフォルダーをアップロードしないでください。既存READMEはこのREADMEで置き換えて構いません。
3. リポジトリの Settings → Pages → Build and deployment で Source を `Deploy from a branch`、Branch を `main`、フォルダーを `/(root)` にして Save。
4. Pagesの設定画面に公開URLが表示され、デプロイが成功したら開きます。Asukiyoアカウントでリポジトリ名がverdant-relayなら、URLの形式は `https://asukiyo.github.io/verdant-relay/` です。これは予定URLで、現時点で公開済みとは限りません。

## 更新
変更したファイルを同じ場所へアップロードしてコミットすると再公開されます。npm installやビルドは不要です。

## 操作
スマホ：画面をドラッグして移動。PC：WASD・矢印キー、または地面をクリック。近くの敵・残骸へ自動照射。建設・強化マークでは1秒待機します。

## 保存データ
進行状況はブラウザーのlocalStorageに保存されます。ChatGPT側の既存URLとは保存先が異なるため、以前の進行状況は自動移行されません。ブラウザーや端末が変わった場合も別セーブになります。

## 動作環境
WebGL対応のブラウザーが必要です。3D表示できない場合はハードウェアアクセラレーションの設定を確認してください。HTMLのダブルクリックではなく、HTTP配信で開いてください。

## 外部ライブラリ
Three.js 0.180.0（MIT）。ライセンスはvendor内に同梱しています。その他のゲームコードに、このREADMEで新たなライセンスを付与するものではありません。

公開設定の公式手順：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
