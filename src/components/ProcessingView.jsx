import { Loader } from 'lucide-react'

export default function ProcessingView({ progress }) {
  return (
    <div className="processing-view">
      <Loader className="processing-view__icon" />
      <p className="processing-view__status">{progress.text}</p>
      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="processing-view__guidance">
        ※初回のみAIエンジンの読み込みに数十秒かかる場合があります。画面を閉じずにお待ちください。
      </p>
    </div>
  )
}
