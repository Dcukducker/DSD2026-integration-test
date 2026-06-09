import { useEffect, useState } from 'react'
import { announcementsApiService } from '../../services/announcementsApiService'
import { authStore } from '../../services/authStore'
import type { ApiAnnouncement } from '../../types/api'
import { useI18n } from '../../i18n/I18nContext'

type Props = {
  open: boolean
  editing: ApiAnnouncement | null
  onClose: () => void
  onSaved: () => void
}

export function AnnouncementFormModal({ open, editing, onClose, onSaved }: Props) {
  const { t } = useI18n()
  const isEdit = editing != null
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [published, setPublished] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.title)
      setContent(editing.content)
      setPublished(editing.status === 'published')
    } else {
      setTitle('')
      setContent('')
      setPublished(true)
    }
    setError(null)
  }, [open, editing])

  if (!open) return null

  const resetAndClose = () => {
    setError(null)
    onClose()
  }

  const submit = async () => {
    const titleText = title.trim()
    const body = content.trim()
    if (!titleText) {
      setError(t('adminAnnouncementTitleRequired'))
      return
    }
    if (!body) {
      setError(t('adminAnnouncementContentRequired'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      if (isEdit && editing) {
        await announcementsApiService.updateAnnouncement(editing.id, {
          title: titleText,
          content: body,
          status: published ? 'published' : 'draft',
        })
      } else {
        const user = authStore.getUser()
        if (!user?.id) {
          setError(t('feedbackLoginRequired'))
          return
        }
        const row = await announcementsApiService.createAnnouncement({
          title: titleText,
          content: body,
          createdBy: user.id,
        })
        if (published) {
          await announcementsApiService.updateAnnouncement(row.id, { status: 'published' })
        }
      }
      onSaved()
      resetAndClose()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isEdit
            ? t('adminAnnouncementUpdateErr')
            : t('adminAnnouncementCreateErr'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="entry-modal-mask" role="dialog" aria-modal="true" onClick={resetAndClose}>
      <div className="entry-modal feedback-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, color: '#0f2a4e' }}>
          {isEdit ? t('adminAnnouncementEdit') : t('adminAnnouncementAdd')}
        </h3>
        <label className="muted small" htmlFor="ann-title" style={{ display: 'block', marginTop: 12 }}>
          {t('adminAnnouncementTitleLabel')}
        </label>
        <input
          id="ann-title"
          className="patient-select"
          style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
        />
        <label className="muted small" htmlFor="ann-content" style={{ display: 'block', marginTop: 10 }}>
          {t('adminAnnouncementContentLabel')}
        </label>
        <textarea
          id="ann-content"
          rows={5}
          className="patient-select"
          style={{ width: '100%', marginTop: 4, resize: 'vertical', boxSizing: 'border-box' }}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={submitting}
        />
        <label className="muted small" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            disabled={submitting}
          />
          {isEdit ? t('adminAnnouncementPublishedLabel') : t('adminAnnouncementPublishNow')}
        </label>
        {error ? (
          <p className="muted small" style={{ color: '#c53030', marginTop: 8 }}>{error}</p>
        ) : null}
        <div className="role-actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn ghost" onClick={resetAndClose} disabled={submitting}>
            {t('cancel')}
          </button>
          <button type="button" className="btn primary" onClick={() => void submit()} disabled={submitting}>
            {submitting ? t('loading') : isEdit ? t('adminAnnouncementSave') : t('adminAnnouncementAdd')}
          </button>
        </div>
      </div>
    </div>
  )
}
