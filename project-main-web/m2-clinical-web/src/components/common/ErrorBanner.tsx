import { useI18n } from '../../i18n/I18nContext'

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="btn-text" onClick={onRetry}>
          {t('retry')}
        </button>
      ) : null}
    </div>
  )
}
