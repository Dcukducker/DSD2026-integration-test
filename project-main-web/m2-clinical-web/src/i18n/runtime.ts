import type { Locale } from './I18nContext'

let runtimeLocale: Locale = 'zh-CN'

export function setRuntimeLocale(locale: Locale) {
  runtimeLocale = locale
}

export function getRuntimeLocale(): Locale {
  return runtimeLocale
}
