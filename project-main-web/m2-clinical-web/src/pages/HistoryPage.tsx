import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { ComparisonPanel } from '../components/history/ComparisonPanel'
import { HistoryMetricsPreview, HistoryTable } from '../components/history/HistoryTable'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { LoadingBlock } from '../components/common/LoadingBlock'
import { useI18n } from '../i18n/I18nContext'
import { clinicalApi } from '../services/clinicalApi'
import { patientApiService } from '../services/patientApiService'
import type { HistoryRecord } from '../types/clinical'

export function HistoryPage() {
  const { patientId = 'p-001' } = useParams<{ patientId: string }>()
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const [rows, setRows] = useState<HistoryRecord[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // Numeric patientId → use real session data from patientApiService
  const numericId = Number(patientId)
  const isApiPatient = !isNaN(numericId) && numericId > 0

  const load = useCallback(async () => {
    void locale
    setLoading(true)
    setErr(null)
    try {
      if (isApiPatient) {
        setRows(await patientApiService.getSessionsAsHistory(numericId))
      } else {
        setRows(await clinicalApi.getHistory(patientId))
      }
      setSelected(new Set())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [patientId, locale, isApiPatient, numericId])

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

  // Build compare chart based on whatever metric keys are common across selected records
  const compareOption = useMemo(() => {
    const list = selectedRecords.slice().sort((a, b) => a.t.localeCompare(b.t))
    const labels = list.map((x) => (isApiPatient ? `#${x.id}` : x.t.slice(5, 10)))

    if (isApiPatient) {
      // For session-based data: collect all joint keys present
      const jointKeys = new Set<string>()
      list.forEach((r) => Object.keys(r.metrics).forEach((k) => jointKeys.add(k)))
      const series = [...jointKeys]
        .filter((k) => k !== 'accuracy')
        .map((joint) => ({
          type: 'line',
          name: joint,
          smooth: true,
          data: list.map((x) => x.metrics[joint]?.value ?? null),
        }))
      // Add accuracy series
      series.push({
        type: 'line',
        name: 'accuracy (%)',
        smooth: true,
        data: list.map((x) => x.metrics['accuracy']?.value ?? null),
      })
      return {
        tooltip: { trigger: 'axis' },
        legend: {},
        xAxis: { type: 'category', data: labels },
        yAxis: { type: 'value' },
        series,
      }
    }

    // Legacy mock data
    const romData = list.map((x) => x.metrics.knee_flexion_rom?.value ?? null)
    const mmtData = list.map((x) => x.metrics.quadriceps_mmt?.value ?? null)
    return {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value' },
      series: [
        { type: 'line', name: 'ROM', data: romData, smooth: true },
        { type: 'line', name: 'MMT', data: mmtData, smooth: true },
      ],
    }
  }, [selectedRecords, isApiPatient])

  const compareSummary = useMemo(() => {
    if (selectedRecords.length < 2) return ''
    const list = selectedRecords.slice().sort((a, b) => a.t.localeCompare(b.t))
    const first = list[0]
    const last = list[list.length - 1]

    if (isApiPatient) {
      const lines: string[] = []
      const allKeys = new Set(
        list.flatMap((r) => Object.keys(r.metrics).filter((k) => k !== 'accuracy')),
      )
      allKeys.forEach((joint) => {
        const firstVal = first.metrics[joint]?.value ?? 0
        const lastVal = last.metrics[joint]?.value ?? 0
        const delta = lastVal - firstVal
        lines.push(`${joint}: ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}°`)
      })
      const accFirst = first.metrics['accuracy']?.value ?? 0
      const accLast = last.metrics['accuracy']?.value ?? 0
      const accDelta = accLast - accFirst
      lines.push(`accuracy: ${accDelta >= 0 ? '+' : ''}${accDelta.toFixed(0)}%`)
      return lines.join('  ·  ')
    }

    const romDelta =
      (last.metrics.knee_flexion_rom?.value ?? 0) - (first.metrics.knee_flexion_rom?.value ?? 0)
    const mmtDelta =
      (last.metrics.quadriceps_mmt?.value ?? 0) - (first.metrics.quadriceps_mmt?.value ?? 0)
    const rom = `${romDelta >= 0 ? '+' : ''}${romDelta}`
    const mmt = `${mmtDelta >= 0 ? '+' : ''}${mmtDelta}`
    return t('historyAutoAnalyzeResult', { rom, mmt })
  }, [selectedRecords, t, isApiPatient])

  return (
    <div className="page doctor-workspace-page">
      <header className="page-header">
        <div>
          <h1>{t('navHistory')}</h1>
          <p className="muted">
            {isApiPatient ? t('historyApiDesc') : t('historyDesc')}
          </p>
        </div>
        {isApiPatient && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => navigate(`/doctor/p/${patientId}/sessions`)}
          >
            {t('allSessions')}
          </button>
        )}
      </header>

      {err ? <ErrorBanner message={err} onRetry={() => void load()} /> : null}

      {loading ? (
        <LoadingBlock label={t('loadingHistory')} />
      ) : (
        <>
          <section className="card">
            <HistoryTable rows={rows} selectedIds={selected} onToggle={toggle} />
          </section>

          <section className="card">
            <h2 className="card-title">{t('metricCompare')}</h2>
            <ComparisonPanel records={selectedRecords} />
          </section>

          <section className="card">
            <p className="muted small">{t('historyAutoAnalyzePrompt')}</p>
            {selectedRecords.length >= 2 ? (
              <>
                <ReactECharts option={compareOption} style={{ height: 260 }} />
                <p className="small">{compareSummary}</p>
              </>
            ) : null}
          </section>

          {selectedRecords.length > 0 && (
            <section className="card">
              <h2 className="card-title">{t('selectedSummary')}</h2>
              <ul className="selected-records">
                {selectedRecords.map((r) => (
                  <li key={r.id}>
                    <div className="sel-head">
                      <strong>{r.title}</strong>
                      <span className="muted small">{r.t}</span>
                    </div>
                    <HistoryMetricsPreview record={r} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
