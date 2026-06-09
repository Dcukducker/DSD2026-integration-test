import { useI18n } from '../../i18n/I18nContext'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function LogoutConfirmModal({ open, onClose, onConfirm }: Props) {
  const { t } = useI18n()

  if (!open) return null

  const confirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="entry-modal-mask" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="entry-modal feedback-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0, color: '#0f2a4e' }}>{t('logoutConfirmTitle')}</h3>
        <p className="muted small" style={{ marginTop: 8 }}>{t('logoutConfirmMessage')}</p>
        <div className="role-actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className="btn primary" onClick={confirm}>
            {t('logout')}
          </button>
        </div>
      </div>
    </div>
  )
}
