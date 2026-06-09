import { useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'

/** 复制当前完整 URL（适用于 Hash 路由部署） */
export function ViewShareBar() {
  const [copied, setCopied] = useState(false)
  const { t } = useI18n()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="share-bar">
      <span className="muted small">{t('shareView')}</span>
      <button type="button" className="btn ghost" onClick={() => void copy()}>
        {copied ? t('copied') : t('copyView')}
      </button>
    </div>
  )
}
