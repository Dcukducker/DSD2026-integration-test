import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { patientApiService } from '../services/patientApiService'
import type { ApiMeasurement, ApiSession } from '../types/api'
import { LoadingBlock } from '../components/common/LoadingBlock'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { useI18n } from '../i18n/I18nContext'
import { extractJointAnglesFromMeasurement } from '../utils/measurementJointAngles'

const COLLECTOR_EXE_URL = `${import.meta.env.BASE_URL}downloads/DSD-Collector.exe`

function extractDataZoomPercent(e: unknown): { start: number; end: number } | null {
  if (!e || typeof e !== 'object') return null
  const o = e as Record<string, unknown>
  if (Array.isArray(o.batch) && o.batch.length > 0) {
    const b = o.batch[0] as Record<string, unknown>
    if (typeof b.start === 'number' && typeof b.end === 'number') return { start: b.start, end: b.end }
  }
  if (typeof o.start === 'number' && typeof o.end === 'number') return { start: o.start, end: o.end }
  return null
}

export function SessionsListPage() {
  const { patientId = '1' } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const uid = Number(patientId)

  // ── data ──────────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [allMeasurements, setAllMeasurements] = useState<ApiMeasurement[][]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // ── session filter ─────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const startPickerRef = useRef<HTMLInputElement | null>(null)
  const endPickerRef = useRef<HTMLInputElement | null>(null)

  const [trendZoom, setTrendZoom] = useState({ start: 0, end: 100 })
  const [sessionsListOpen, setSessionsListOpen] = useState(false)

  const load = useCallback(async () => {
    if (isNaN(uid)) { setSessions([]); setLoading(false); return }
    setLoading(true)
    setErr(null)
    try {
      const sess = await patientApiService.listSessions(uid)
      const filtered = sess.filter((s) => {
        const d = s.started_at.slice(0, 10)
        if (startDate && d < startDate) return false
        if (endDate && d > endDate) return false
        return true
      })
      const sorted = [...filtered].sort(
        (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
      )
      setSessions(sorted)
      const ms = await Promise.all(
        sorted.map((s) => patientApiService.listMeasurements(s.id, { startDate, endDate })),
      )
      // Defensive: backend may return non-array; never allow undefined to crash charts.
      setAllMeasurements(ms.map((x) => (Array.isArray(x) ? x : [])))
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [uid, t, startDate, endDate])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    setTrendZoom({ start: 0, end: 100 })
  }, [uid, startDate, endDate])

  useEffect(() => {
    setSessionsListOpen(false)
  }, [uid])

  // ── trend chart across sessions ───────────────────────────────────────────
  const trendOption = useMemo(() => {
    if (sessions.length === 0 || allMeasurements.length === 0) return null

    const jointIds = new Set<string>()
    allMeasurements.forEach((ms) => {
      if (!Array.isArray(ms)) return
      ms.forEach((m) => {
        extractJointAnglesFromMeasurement(m).forEach((j) => {
          if (j.angleID) jointIds.add(j.angleID)
        })
      })
    })
    if (jointIds.size === 0) return null

    // X labels: "Session #N\nYYYY-MM-DD" — keep all categories for lines; sparse axis ticks when many sessions.
    const xLabels = sessions.map((s, i) => `Session #${i + 1}\n${s.started_at.slice(0, 10)}`)
    const sessionCount = sessions.length
    const spanPct = Math.max(0, Math.min(100, trendZoom.end) - Math.max(0, Math.min(100, trendZoom.start)))
    const visibleSessions = Math.max(1, Math.round((spanPct / 100) * sessionCount))
    const xAxisLabelInterval =
      visibleSessions <= 10 ? 0 : Math.max(0, Math.ceil(visibleSessions / 8) - 1)

    const series = [...jointIds].map((joint) => ({
      type: 'line',
      name: joint,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: allMeasurements.map((ms) => {
        if (!Array.isArray(ms)) return null
        const angles = ms.flatMap((m) =>
          extractJointAnglesFromMeasurement(m)
            .filter((j) => j.angleID === joint)
            .map((j) => j.angle),
        )
        return angles.length
          ? parseFloat((angles.reduce((a, b) => a + b, 0) / angles.length).toFixed(1))
          : null
      }),
    }))

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: [...jointIds], top: 4 },
      grid: { top: 36, bottom: 80, left: 50, right: 20, containLabel: true },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLabel: {
          fontSize: 11,
          lineHeight: 16,
          interval: xAxisLabelInterval,
          hideOverlap: true,
        },
      },
      yAxis: { type: 'value', name: 'Avg (°)', nameTextStyle: { fontSize: 11 } },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          start: trendZoom.start,
          end: trendZoom.end,
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          height: 22,
          bottom: 22,
          filterMode: 'none',
          start: trendZoom.start,
          end: trendZoom.end,
        },
      ],
      series,
    }
  }, [sessions, allMeasurements, trendZoom])

  const onTrendDataZoom = useCallback((e: unknown) => {
    const r = extractDataZoomPercent(e)
    if (r && Number.isFinite(r.start) && Number.isFinite(r.end)) {
      setTrendZoom({ start: r.start, end: r.end })
    }
  }, [])

  // Sessions list should show newest on top, but keep chart order (old→new).
  const sessionsForList = useMemo(() => {
    return sessions
      .map((s, idx) => ({ s, seq: idx + 1 }))
      .slice()
      .reverse()
  }, [sessions])

  // ── helpers ───────────────────────────────────────────────────────────────
  function formatDuration(start: string, end: string | null): string {
    if (!end) return t('sessionsOngoing')
    const ms = new Date(end).getTime() - new Date(start).getTime()
    return `${Math.round(ms / 60_000)} min`
  }

  function formatSessionStartedAt(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="page doctor-workspace-page">
      <header className="page-header">
        <div>
          <h1>{t('sessionsTitle')}</h1>
          <p className="muted">{t('sessionsDesc', { patientId })}</p>
        </div>
      </header>

      {err ? <ErrorBanner message={err} onRetry={() => void load()} /> : null}

      {loading ? (
        <LoadingBlock label={t('sessionsLoading')} />
      ) : isNaN(uid) ? (
        <section className="card">
          <p className="muted">{t('sessionsInvalidId')}</p>
        </section>
      ) : (
        <>
          {/* ── Date range filter ── */}
          <section className="card" style={{ marginBottom: '1rem' }}>
            <div className="role-actions" style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <label className="muted small">
                {t('dateFilterStart')}
                <span style={{ position: 'relative', display: 'inline-block', marginLeft: 8 }}>
                  {/* Visible input (prevents locale placeholder like yyyy/mm/日) */}
                  <input
                    type="text"
                    readOnly
                    className="patient-select"
                    value={startDate}
                    placeholder="YYYY-MM-DD"
                    onClick={() => (startPickerRef.current as any)?.showPicker?.() ?? startPickerRef.current?.focus()}
                    style={{ width: 160 }}
                  />
                  {/* Hidden native date picker */}
                  <input
                    ref={startPickerRef}
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' }}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </span>
              </label>
              <label className="muted small">
                {t('dateFilterEnd')}
                <span style={{ position: 'relative', display: 'inline-block', marginLeft: 8 }}>
                  <input
                    type="text"
                    readOnly
                    className="patient-select"
                    value={endDate}
                    placeholder="YYYY-MM-DD"
                    onClick={() => (endPickerRef.current as any)?.showPicker?.() ?? endPickerRef.current?.focus()}
                    style={{ width: 160 }}
                  />
                  <input
                    ref={endPickerRef}
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' }}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </span>
              </label>
              <button type="button" className="btn ghost" onClick={() => { setStartDate(''); setEndDate('') }}>
                {t('dateFilterClear')}
              </button>
              <button type="button" className="btn primary" onClick={() => void load()}>
                {t('dateFilterApply')}
              </button>
            </div>
          </section>

          {/* ── Cross-session Trend Chart ── */}
          {trendOption ? (
            <section className="card" style={{ marginBottom: '1rem' }}>
              <h2 className="card-title">{t('patientDashboardTrend')}</h2>
              <ReactECharts
                option={trendOption}
                style={{ height: 380 }}
                onEvents={{ dataZoom: onTrendDataZoom }}
              />
            </section>
          ) : null}

          {/* ── Sessions List (collapsible) ── */}
          <section className="card collapsible-card" style={{ marginBottom: '1rem' }}>
            <div className="collapsible-head">
              <h2 className="card-title">{t('patientDashboardSessions')}</h2>
              <div className="collapsible-actions">
                <a
                  href={COLLECTOR_EXE_URL}
                  download="DSD-Collector.exe"
                  className="btn primary"
                >
                  {t('downloadCollectorTool')}
                </a>
                {sessions.length > 0 ? (
                  <button
                    type="button"
                    className="btn ghost collapsible-toggle"
                    aria-expanded={sessionsListOpen}
                    aria-controls="sessions-list-panel"
                    onClick={() => setSessionsListOpen((open) => !open)}
                  >
                    <span>{sessionsListOpen ? t('sessionsCollapse') : t('sessionsExpand')}</span>
                    <span className="collapsible-chevron" aria-hidden>
                      {sessionsListOpen ? '▴' : '▾'}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
            {!sessionsListOpen && sessions.length > 0 ? (
              <p className="muted small collapsible-summary">
                {t('sessionsCollapsedSummary', { count: String(sessions.length) })}
              </p>
            ) : null}
            {sessionsListOpen || sessions.length === 0 ? (
              <div id="sessions-list-panel" className="collapsible-body">
                {sessions.length === 0 ? (
                  <p className="muted">{t('sessionsEmpty')}</p>
                ) : (
                  <div className="task-list">
                    {sessionsForList.map(({ s, seq }) => (
                      <article
                        key={s.id}
                        className="task-row"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/doctor/p/${patientId}/session/${s.id}`)}
                      >
                        <div className="task-main">
                          <p className="task-title">Session #{seq}</p>
                          <p className="muted small">
                            {formatSessionStartedAt(s.started_at)}
                            {' · '}
                            {formatDuration(s.started_at, s.ended_at)}
                            {' · '}
                            {s.measurement_count} {t('sessionMeasurements').toLowerCase()}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/doctor/p/${patientId}/session/${s.id}`)
                          }}
                        >
                          {t('sessionsView')}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  )
}
