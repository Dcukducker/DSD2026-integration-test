import { useI18n } from '../../i18n/I18nContext'

export function LoadingBlock({ label }: { label?: string }) {
  const { t } = useI18n()
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <span className="loading-dot" />
      {label || t('loading')}
    </div>
  )
}
