import { useState, useCallback } from 'react'
import { removeBackground } from '@imgly/background-removal'
import { ImageDown } from 'lucide-react'
import UploadView from './components/UploadView'
import ProcessingView from './components/ProcessingView'
import ResultView from './components/ResultView'

// アプリの3つの状態
const STATE = { UPLOAD: 'upload', PROCESSING: 'processing', RESULT: 'result' }

export default function App() {
  const [appState, setAppState] = useState(STATE.UPLOAD)
  const [selectedPreviews, setSelectedPreviews] = useState([])
  const [items, setItems] = useState([])
  const [progress, setProgress] = useState({ text: 'AIモデルを準備中...', percent: 0 })

  // 背景削除の実行
  const handleProcess = useCallback(async (files) => {
    // 既存のプレビューや生成物をクリア
    selectedPreviews.forEach((url) => URL.revokeObjectURL(url))
    items.forEach((item) => URL.revokeObjectURL(item.resultUrl))

    const file = files[0]
    if (!file) return

    const preview = URL.createObjectURL(file)
    setSelectedPreviews([preview])
    setItems([])
    setAppState(STATE.PROCESSING)
    setProgress({ text: 'AIモデルを準備中...', percent: 0 })

    try {
      const blob = await removeBackground(file, {
        model: 'medium', // 標準モデル
        output: { format: 'image/png' },
        progress: (key, current, total) => {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0
          if (key.startsWith('fetch') || key.startsWith('model')) {
            setProgress({
              text: `AIモデルを準備中... [モデルダウンロード中: ${pct}%]`,
              percent: pct,
            })
          } else {
            setProgress({
              text: `背景を透過中... [透過処理中: ${pct}%]`,
              percent: pct,
            })
          }
        },
      })

      const resultUrl = URL.createObjectURL(blob)
      const baseName = file.name.replace(/\.[^/.]+$/, '')
      const name = `${baseName}_nobg.png`
      const id = Math.random().toString(36).substring(2, 9)

      setItems([{
        id,
        originalName: file.name,
        name,
        resultBlob: blob,
        resultUrl,
      }])
      setProgress({
        text: '変換完了',
        percent: 100,
      })
      setAppState(STATE.RESULT)
    } catch (err) {
      console.error('背景削除エラー:', err)
      alert(`${file.name}の処理中にエラーが発生しました。`)
      setAppState(STATE.UPLOAD)
    }
  }, [selectedPreviews, items])

  // リセット
  const handleReset = useCallback(() => {
    selectedPreviews.forEach((url) => URL.revokeObjectURL(url))
    items.forEach((item) => URL.revokeObjectURL(item.resultUrl))
    setSelectedPreviews([])
    setItems([])
    setProgress({ text: 'AIモデルを準備中...', percent: 0 })
    setAppState(STATE.UPLOAD)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [selectedPreviews, items])

  return (
    <>
      <header className="header">
        <div className="header-section">
          <h1>BACKGROUND REMOVER</h1>
          <div className="subtitle">- 背景削除ツール -</div>
        </div>
      </header>

      <main className="container">
        {/* ヒーローセクション（キャッチコピー ＆ デモ動画） */}
        <div className="hero-section">
          <div className="hero-section__text">
            <h2 className="hero-section__title">
              AIが被写体を瞬時に認識。<br />面倒な背景切り抜きを自動化します。
            </h2>
            <p className="hero-section__desc">
              ブラウザ上で完結するためプライバシーも安心。<br />透過PNG画像を無料でダウンロードできます。
            </p>
          </div>
          <div className="hero-section__demo">
            <img src="/video-junko.gif" alt="背景削除 of デモ動画" className="hero-section__img" />
          </div>
        </div>

        {/* ツールセクション */}
        <section className="content-section">
          {/* Step 1: 画像を選択 */}
          <UploadView onProcess={handleProcess} selectedPreviews={selectedPreviews} />

          {/* Step 2: 変換結果 */}
          <div className="tool-area">
            <h2 className="step-title">
              <ImageDown className="step-title__icon" /> 2. 変換結果
            </h2>

            {/* 処理中状態 */}
            {appState === STATE.PROCESSING && (
              <ProcessingView progress={progress} />
            )}

            {/* 結果表示状態 */}
            {appState === STATE.RESULT && (
              <ResultView
                items={items}
                onReset={handleReset}
              />
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <p className="footer__copy">© 2026 深森呼吸</p>
      </footer>
    </>
  )
}
