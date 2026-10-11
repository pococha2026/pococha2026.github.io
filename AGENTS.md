# Pococha関連ツールのGitHub公開

GitHub公開先は pococha2026/pococha2026.github.io。公開URLにyoshiを使用しない。作成者表示はPococha1012。既存レイアウト・計算結果・端末保存キー・出力機能を維持する。

## 更新時のSites・GitHub自動同期（2026-10-11 10:32 JST、旧方針より優先）
ユーザーの明示指示：「更新時、今後は全てsites版にgithub版も自動同期OK」
- 今後、全Pococha関連ツールの更新時は、同じ更新作業内でSites版の公開とGitHub公開版（スマホ利用URLを含む）の同期・公開確認まで実行する。この指示は今後毎回の公開同期の許可であり、公開同期のための追加確認や所有者の同期ボタン操作を待つ旧規則を置き換える。ユーザーが特定の作業について下書き・未公開・公開待ちを指定した場合は、その指定を優先する。
- 確認済みの候補一式を先に本人専用の未公開一覧へ登録し、Sites版を公開した後、同じ更新版のGitHub用元ファイル一式を pococha2026/pococha2026.github.io の main へ反映する。対象ツールだけを変更し、他ツールの変更・秘密情報・管理データの公開を行わない。
- 一覧の同期接続が未設定でも、利用可能なGitHub連携で同一の候補を同期できる場合は実行する。既存のGitHub版独自編集や競合は上書きしない。main更新は確認したheadを基準に force:false で行い、書き込み結果不明時は読取で確認してから判断する。
- Sitesのデプロイ成功、GitHubへのファイル保存、GitHub Pagesへの配信確認を区別する。片方が失敗・未確認なら両方完了と報告しない。毎回Sites版・GitHubスマホ用URLを最終回答に示す。
- これは更新作業時の同期許可であり、無関係な毎時・定期同期の再開ではない。owner-private候補一覧、各Sitesの既存公開範囲、公開URL、Pococha1012名称、計算・解答・レイアウト・端末保存キー・認証を維持する。

## 旧更新候補フロー（上記の更新時自動同期方針に矛盾する部分は失効）

各ツールの更新版は公開版へ直ちに反映しない。本人専用の未公開一覧 https://pococha2026-preview.freefreelife2000.chatgpt.site/ （Sites appgprj_6ac90c5524f481918e89e5e2ca639ea2）へ候補一式を最初に保存する。その一覧の対象ツールの「公開版へ同期」ボタンが押された時だけ、確認した候補IDに固定して公開する。

対象IDは meter / coin / answers / record。候補の作成・登録・閲覧・Sitesの保存や公開成功を理由に公開GitHubファイルを書き換えない。候補を公開GitHubの別ブランチ・PR・Actions artifactへ置かない。元の公開Sitesにも更新候補を先にデプロイしない。公開用HTML・manifest・アイコン・SW・ZIPは対象ツールの一式で原子的に反映し、他ツールを変更しない。

未公開一覧の候補JSONは schemaVersion:1、toolId、version、sourceCommit、files:[{path,encoding:"base64",content,sha256}]。私有Siteソース内 scripts/create-candidate.mjs で生成できる。登録POST /api/stageは公開操作を行わない。候補のpreview変換は公開に使用せず、保存した元のbytesを公開する。所有者だけがアクセスできる状態を保つ。公開接続が未設定なら同期不能を明記し、完了を装わない。

旧 sync-pococha-challenge / sync-pococha-meter workflows の job は停止したままにする。定期同期・公開Sitesからの自動コピー・閲覧時の公開書込・リリースJSON経由の自動公開を再開しない。従来の「Sites公開成功後にポコチャレを即同期する」手順は廃止。

メーター計算の動的ボーダーデータは従来Sites APIを読み取る。これはツールの版更新と別で維持する。GitHubから管理者書込を行わない。お問い合わせと管理ページはSitesに保持し、管理リンクはGitHubで隠す。
