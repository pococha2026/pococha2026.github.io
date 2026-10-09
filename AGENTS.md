# Pococha関連ツールのGitHub公開

GitHub公開先は pococha2026/pococha2026.github.io。公開URLにyoshiを使用しない。作成者表示はPococha1012。既存レイアウト・計算結果・端末保存キー・出力機能を維持する。

## 更新候補と公開承認（2026-10-10から）

各ツールの更新版は公開版へ直ちに反映しない。本人専用の未公開一覧 https://pococha2026-preview.freefreelife2000.chatgpt.site/ （Sites appgprj_6ac90c5524f481918e89e5e2ca639ea2）へ候補一式を最初に保存する。その一覧の対象ツールの「公開版へ同期」ボタンが押された時だけ、確認した候補IDに固定して公開する。

対象IDは meter / coin / answers / record。候補の作成・登録・閲覧・Sitesの保存や公開成功を理由に公開GitHubファイルを書き換えない。候補を公開GitHubの別ブランチ・PR・Actions artifactへ置かない。元の公開Sitesにも更新候補を先にデプロイしない。公開用HTML・manifest・アイコン・SW・ZIPは対象ツールの一式で原子的に反映し、他ツールを変更しない。

未公開一覧の候補JSONは schemaVersion:1、toolId、version、sourceCommit、files:[{path,encoding:"base64",content,sha256}]。私有Siteソース内 scripts/create-candidate.mjs で生成できる。登録POST /api/stageは公開操作を行わない。候補のpreview変換は公開に使用せず、保存した元のbytesを公開する。所有者だけがアクセスできる状態を保つ。公開接続が未設定なら同期不能を明記し、完了を装わない。

旧 sync-pococha-challenge / sync-pococha-meter workflows の job は停止したままにする。定期同期・公開Sitesからの自動コピー・閲覧時の公開書込・リリースJSON経由の自動公開を再開しない。従来の「Sites公開成功後にポコチャレを即同期する」手順は廃止。

メーター計算の動的ボーダーデータは従来Sites APIを読み取る。これはツールの版更新と別で維持する。GitHubから管理者書込を行わない。お問い合わせと管理ページはSitesに保持し、管理リンクはGitHubで隠す。
