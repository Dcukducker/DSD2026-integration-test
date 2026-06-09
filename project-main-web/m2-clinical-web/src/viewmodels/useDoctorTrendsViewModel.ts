import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import { clinicalApi } from '../services/clinicalApi'
import type { ClinicalEvent, TimeRangePreset, TrendSeries } from '../types/clinical'

export function useDoctorTrendsViewModel() {
  const { patientId = 'p-001' } = useParams<{ patientId: string }>()
  const { t, locale } = useI18n()
  const [range, setRange] = useState<TimeRangePreset>('month')
  const [series, setSeries] = useState<TrendSeries[]>([])
  const [events, setEvents] = useState<ClinicalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    void locale
    setLoading(true)
    setErr(null)
    try {
      const [ts, ev] = await Promise.all([
        clinicalApi.getTrends(patientId, range),
        clinicalApi.getClinicalEvents(patientId, range),
      ])
      setSeries(ts)
      setEvents(ev)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [patientId, range, locale])

  useEffect(() => {
    void load()
  }, [load])

  return {
    t,
    range,
    setRange,
    series,
    events,
    loading,
    err,
    reload: load,
  }
}
