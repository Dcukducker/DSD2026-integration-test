import { useState } from 'react'
import { feedbackApiService } from '../../services/feedbackApiService'
import { authStore } from '../../services/authStore'
import { useI18n } from '../../i18n/I18nContext'

type Props = {
  open: boolean
  onClose: () => void
}

export function FeedbackSubmitModal({ open, onClose }: Props) {
  const { t } = useI18n()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!open) return null

  const resetAndClose = () => {
    setContent('')
    setError(null)
    setDone(false)
    onClose()
  }

  const submit = async () => {
    const text = content.trim()
    const user = authStore.getUser()
    if (!text) {
      setError(t('feedbackContentRequired'))
      return
    }
    if (!user?.id) {
      setError(t('feedbackLoginRequired'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await feedbackApiService.createFeedback({ userId: user.id, content: text })
      setDone(true)
      setContent('')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('loadFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="entry-modal-mask" role="dialog" aria-modal="true" onClick={resetAndClose}>
      <div
        className="entry-modal feedback-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0, color: '#0f2a4e' }}>{t('feedbackSubmitTitle')}</h3>
        <p className="muted small" style={{ marginTop: 6 }}>{t('feedbackSubmitDesc')}</p>

        {done ? (
          <p className="status status-success" style={{ marginTop: 12 }}>{t('feedbackSubmitSuccess')}</p>
        ) : (
          <>
            <label className="muted small" htmlFor="feedback-content" style={{ display: 'block', marginTop: 12 }}>
              {t('feedbackContentLabel')}
            </label>
            <textarea
              id="feedback-content"
              rows={5}
              className="patient-select"
              style={{ width: '100%', marginTop: 4, resize: 'vertical' }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('feedbackContentPlaceholder')}
              disabled={submitting}
            />
            {error ? <p className="muted small" style={{ color: '#c53030', marginTop: 8 }}>{error}</p> : null}
          </>
        )}

        <div className="role-actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn ghost" onClick={resetAndClose} disabled={submitting}>
            {done ? t('close') : t('cancel')}
          </button>
          {!done ? (
            <button type="button" className="btn primary" onClick={() => void submit()} disabled={submitting}>
              {submitting ? t('loading') : t('feedbackSubmitAction')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
