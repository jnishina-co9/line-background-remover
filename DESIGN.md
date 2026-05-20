---
version: "1.0"
brand:
  name: "Minimal Web App Design System"
colors:
  base:
    value: "#FFFFFF"
    description: "基本背景色、および青背景上の文字色"
  main:
    value: "#1D3FBB"
    description: "白・グレー背景上の文字色、入力フォーム背景、プライマリボタン背景"
  accent:
    value: "#E9E9E9"
    description: "カード背景、セカンダリボタン背景"
typography:
  fontFamily:
    base: "'Noto Sans JP', sans-serif"
    accent: "'Outfit', sans-serif"
  fontSize:
    body: "16px"
    h1: "32px"
    h2: "24px"
spacing:
  base: "8px"
  scale: [8, 16, 24, 32, 48, 64]
radii:
  default: "0px"
breakpoints:
  desktop_large: "1440px"
  laptop: "1439px"
  tablet: "1023px"
  mobile: "767px"
---


# Design Principles
装飾を限界まで削ぎ落とした、圧倒的にミニマルでクリーンなデスクトップファーストUI。
使用する色は指定された3色（青・白・グレー）のみに制限する。枠線（border）、影（box-shadow）、角丸（border-radius: 0px）は一切使用せず、フラットな「色面」の切り替えとタイポグラフィのみで美しさと機能性を表現する。
ライトモードのみの単一仕様とし、ダークモードは考慮しない。


## Color & Typography Strategy
3色の組み合わせによる徹底した色分けルール。
- **白背景（#FFFFFF）の上**:
  - 文字色・アイコン色はすべてメインの青（#1D3FBB）とする。
- **グレー背景（#E9E9E9）の上**:
  - 文字色・アイコン色はすべてメインの青（#1D3FBB）とする。
- **青背景（#1D3FBB）の上**:
  - 文字色・アイコン色はすべてベースの白（#FFFFFF）とする。

日本語の本文には Noto Sans JP、見出しや数字などのアクセント要素には Outfit を適用し、文字の大きさ（階層）と余白だけでクリーンなレイアウトを作る。


## Layout & Breakpoints
- **ベース（1440px以上）**: コンテンツの最大幅を `1200px` に制限し、画面中央に配置。
- **Laptop（1439px以下）**: コンテンツ幅100%、左右に24pxの余白（padding）。
- **Tablet（1023px以下）**: 横並びのレイアウトを2カラム以下に整理。
- **Mobile（767px以下）**: 完全に1カラム化し、縦スクロールの導線に一元化。


## Components
すべてのコンポーネントにおいて枠線と影は禁止（none）。
- **Forms & Interactive Areas（入力・操作エリア）**:
  - テキスト入力やファイルドロップ領域などの背景は青（#1D3FBB）とし、文字やアイコンは白（#FFFFFF）とする。
  - ホバー時やドラッグ中は不透明度を下げて状態変化を示す。
- **Button (Primary)**:
  - 背景は青（#1D3FBB）、文字は白（#FFFFFF）。
  - ホバー時は、要素全体の不透明度をわずかに下げる（opacity: 0.9）ことでクリーンに状態変化を示す。
- **Button (Secondary)**:
  - 背景はグレー（#E9E9E9）、文字は青（#1D3FBB）。
- **Card / Section（要素の区切り）**:
  - 枠線は使わず、背景をグレー（#E9E9E9）に塗りつぶした「面」として配置する。
- **Icons**:
  - `Lucide React` を使用。色ルール（背景に応じた青または白）を完全に適用する。
- **Navigation & Links**:
  - クリック可能な要素には必ず `cursor: pointer` を付与する。
- **Spacing**:
  - すべての配置・余白は 8px の倍数（spacing.scale）を厳格に適用し、グリッドの美しさを保つ。
- **Header**:
  - ページ最上部に配置するタイトルエリア。メインカラムのコンテナ外に配置し、中央揃え（`text-align: center`）とする。
  - メインタイトル（h1）は `Outfit`（フォントサイズ 32px、太さ 700、文字間隔 `letter-spacing: 0.05em`）を使用し、色はメインカラーの青（#1D3FBB）。
  - サブタイトルは `Noto Sans JP`（フォントサイズ 16px、太さ 700、文字間隔 `letter-spacing: 0.1em`）を使用し、ハイフンで囲んだ形式（例：`- ここに日本語のアプリ名 -`）とする。色はメインカラーの青（#1D3FBB）。
  - 上部に 48px、下部に 48px、左右に 24px の余白（例：親要素の `padding: 48px 24px 0` と自身の `margin-bottom: 48px` の組み合わせ等）を設け、タイトルとサブタイトル間は 8px の余白（`gap: 8px`）とする。
  - モバイル環境（767px以下）では、h1を 24px、サブタイトルを 14px、上下の余白を縮小して最適化する。
- **Footer**:
  - ページ最下部に配置するコピーライトエリア（© 2026 深森呼吸）。メインカラムのコンテナ外に配置し、幅100%・中央揃えとする。
  - 背景色はベースカラーの白（#FFFFFF）とし、上部に 24px、下部に 24px、左右に 0 の余白（`padding: 24px 0`）を確保して窮屈さを排除する。
  - ページ内のコンテンツ量が少ない場合でも、親要素（`body`）のFlexbox仕様（`min-height: 100vh`, `flex-direction: column`）と組み合わせ、`margin-top: auto` を指定することで常に画面最下部に吸着（固定）させる。
  - コピーライトテキストは `Outfit` および `Noto Sans JP`（フォントサイズ 14px、色はメインの青 #1D3FBB、文字間隔 `letter-spacing: 0.05em`）とし、控えめかつモダンな印象とする。