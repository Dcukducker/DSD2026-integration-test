import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import { clinicalApi } from '../services/clinicalApi'
import type { HistoryRecord } from '../types/clinical'

export function useDoctorHistoryViewModel() {
  const { patientId = 'p-001' } = useParams<{ patientId: string }>()
  const { t, locale } = useI18n()
  const [rows, setRows] = useState<HistoryRecord[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    void locale
    setLoading(true)
    setErr(null)
    try {
      setRows(await clinicalApi.getHistory(patientId))
      setSelected(new Set())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [patientId, locale])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const n = new Set(prev)
      if (checked) n.add(id)
      else n.delete(id)
      return n
    })

  const selectedRecords = useMemo(
    () => rows.filter((r) => selected.has(r.id)),
    [rows, selected],
  )

  const compareOption = useMemo(() => {
    const list = selectedRecords.slice().sort((a, b) => a.t.localeCompare(b.t))
    const labels = list.map((x) => x.t.slice(5, 10))
    const romData = list.map((x) => x.metrics.knee_flexion_rom?.value ?? null)
    const mmtData = list.map((x) => x.metrics.quadriceps_mmt?.value ?? null)
    return {
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value' },
      series: [
        { type: 'line', name: 'ROM', data: romData, smooth: true },
        { type: 'line', name: 'MMT', data: mmtData, smooth: true },
      ],
    }
  }, [selectedRecords])

  const compareSummary = useMemo(() => {
    if (selectedRecords.length < 2) return ''
    const list = selectedRecords.slice().sort((a, b) => a.t.localeCompare(b.t))
    const first = list[0]
    const last = list[list.length - 1]
    const romDelta =
      (last.metrics.knee_flexion_rom?.value ?? 0) - (first.metrics.knee_flexion_rom?.value ?? 0)
    const mmtDelta =
      (last.metrics.quadriceps_mmt?.value ?? 0) - (first.metrics.quadriceps_mmt?.value ?? 0)
    const rom = `${romDelta >= 0 ? '+' : ''}${romDelta}`
    const mmt = `${mmtDelta >= 0 ? '+' : ''}${mmtDelta}`
    return t('historyAutoAnalyzeResult', { rom, mmt })
  }, [selectedRecords, t])

  return {
    t,
    rows,
    selected,
    selectedRecords,
    loading,
    err,
    toggle,
    compareOption,
    compareSummary,
    reload: load,
  }
}
