import { useRef, useState, useCallback } from 'react'
import { UploadCloud, Image } from 'lucide-react'

export default function UploadView({ onProcess, selectedPreviews }) {
  const fileInputRef = useRef(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFiles = useCallback(
    (files) => {
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
      if (imageFiles.length === 0) return
      // 1つのファイルのみ渡す
      onProcess([imageFiles[0]])
    },
    [onProcess]
  )

  const handleClick = () => fileInputRef.current?.click()

  const handleChange = (e) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="tool-area">
      <h2 className="step-title">
        <Image className="step-title__icon" /> 1. 画像を選択
      </h2>
      <div
        className={`drop-zone${isDragOver ? ' drop-zone--over' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadCloud className="drop-zone__icon" />
        <p className="drop-zone__text">クリックして画像ファイルを選択</p>
        <p className="drop-zone__sub-text">
          または、ここにドラッグ＆ドロップ（PNG / JPG）
        </p>

        {selectedPreviews && selectedPreviews.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '100%', maxWidth: '600px' }}>
              <img
                src={selectedPreviews[0]}
                alt="アップロード画像のサムネイル"
                style={{ width: '100%', height: 'auto', display: 'block', backgroundColor: '#FFFFFF' }}
              />
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
