import { useCallback } from 'react'
import { Download, RotateCcw } from 'lucide-react'

export default function ResultView({ items, onReset }) {
  const downloadSingle = useCallback((item) => {
    if (!item.resultBlob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(item.resultBlob)
    a.download = item.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  if (items.length === 0) return null
  const item = items[0]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <div style={{
            width: '100%',
            backgroundImage: 'conic-gradient(#FFFFFF 90deg, #E9E9E9 90deg 180deg, #FFFFFF 180deg 270deg, #E9E9E9 270deg)',
            backgroundSize: '32px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img
              src={item.resultUrl}
              alt={item.originalName}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        </div>
      </div>

      <div className="result-actions">
        <button
          type="button"
          className="btn btn--main"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={() => downloadSingle(item)}
        >
          <Download style={{ width: '20px', height: '20px' }} /> 保存する
        </button>
        <button
          type="button"
          className="btn btn--base"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={onReset}
        >
          <RotateCcw style={{ width: '20px', height: '20px' }} /> リセットしてトップに戻る
        </button>
        <p className="disclaimer">
          ※ 本ツールはLINEスタンプの審査通過を保証するものではありません。
        </p>
      </div>
    </>
  )
}
