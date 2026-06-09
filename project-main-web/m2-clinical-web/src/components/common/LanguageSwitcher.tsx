import type { Locale } from '../../i18n/I18nContext'
import { useI18n } from '../../i18n/I18nContext'

// Language names are always shown in their own language (autonyms), never translated.
const LANG_LABELS: Record<Locale, string> = {
  'zh-CN': '中文',
  'en':    'English',
  'pt-BR': 'Português',
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const options: { value: Locale; label: string }[] = [
    { value: 'zh-CN', label: LANG_LABELS['zh-CN'] },
    { value: 'en',    label: LANG_LABELS['en']    },
    { value: 'pt-BR', label: LANG_LABELS['pt-BR'] },
  ]
  return (
    <label className="lang-switch small global-lang-switcher">
      <span className="muted">Language</span>
      <select
        className="patient-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {options.map((x) => (
          <option key={x.value} value={x.value}>
            {x.label}
          </option>
        ))}
      </select>
    </label>
  )
}
