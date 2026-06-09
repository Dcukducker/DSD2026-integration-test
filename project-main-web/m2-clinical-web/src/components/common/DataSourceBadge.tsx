import type { DataSource } from '../../types/clinical'
import { useI18n } from '../../i18n/I18nContext'

const styles: Record<DataSource, string> = {
  measured: 'ds-measured',
  ai_inferred: 'ds-ai',
}

export function DataSourceBadge({ source }: { source: DataSource }) {
  const { locale } = useI18n()
  const labels: Record<DataSource, string> =
    locale === 'en'
      ? { measured: 'Measured', ai_inferred: 'AI inferred' }
      : locale === 'pt-BR'
        ? { measured: 'Medido', ai_inferred: 'Inferido por IA' }
        : { measured: '实测', ai_inferred: 'AI 推断' }
  return (
    <span className={`ds-badge ${styles[source]}`} title={labels[source]}>
      {labels[source]}
    </span>
  )
}
