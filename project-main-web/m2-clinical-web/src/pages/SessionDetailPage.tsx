import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { patientApiService } from '../services/patientApiService'
import type {
  ApiMeasurement,
  ApiSession,
  ApiSessionRecommendation,
  ApiEngineRecommendation,
} from '../types/api'
import { LoadingBlock } from '../components/common/LoadingBlock'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { useI18n } from '../i18n/I18nContext'
import { extractJointAnglesFromMeasurement } from '../utils/measurementJointAngles'

const PRIORITY_CLASS: Record<string, string> = {
  high: 'fail',
  medium: 'idle',
  low: 'pass',
}

/** Display API (UTC) timestamps in China standard time for chart axis & tooltips. */
const CHART_DISPLAY_TZ = 'Asia/Shanghai'

/** Axis: wall time in Asia/Shanghai, no date — HH:mm:ss */
function formatChartAxisTime(ms: number, loc: string): string {
  if (!Number.isFinite(ms)) return ''
  return new Date(ms).toLocaleString(loc, {
    timeZone: CHART_DISPLAY_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/** Tooltip: same zone with milliseconds (no calendar date). */
function formatChartTooltipTime(ms: number, loc: string): string {
  if (!Number.isFinite(ms)) return ''
  try {
    return new Intl.DateTimeFormat(loc, {
      timeZone: CHART_DISPLAY_TZ,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
    }).format(new Date(ms))
  } catch {
    return new Date(ms).toLocaleString(loc, {
      timeZone: CHART_DISPLAY_TZ,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }
}

export function SessionDetailPage() {
  const { patientId = '1', sessionId = '1' } = useParams<{
    patientId: string
    sessionId: string
  }>()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const uid = Number(patientId)
  const sid = Number(sessionId)

  // ── measurements ──────────────────────────────────────────────────────────
  const [measurements, setMeasurements] = useState<ApiMeasurement[]>([])
  const [sessionMeta, setSessionMeta] = useState<ApiSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // ── AI recommendations ────────────────────────────────────────────────────
  const [sessionRecs, setSessionRecs] = useState<ApiSessionRecommendation[] | null>(null)
  const [engineRecs, setEngineRecs] = useState<ApiEngineRecommendation | null>(null)
  const [recsLoading, setRecsLoading] = useState(false)
  const [recsErr, setRecsErr] = useState<string | null>(null)

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [ms, sessions] = await Promise.all([
        patientApiService.listMeasurements(sid),
        Number.isFinite(uid) && uid > 0
          ? patientApiService.listSessions(uid)
          : Promise.resolve([] as ApiSession[]),
      ])
      setMeasurements(ms)
      setSessionMeta(sessions.find((s) => s.id === sid) ?? null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [sid, uid, t])

  useEffect(() => { void load() }, [load])

  // ── AI helpers ────────────────────────────────────────────────────────────
  async function fetchSessionRecs() {
    setRecsLoading(true)
    setRecsErr(null)
    try {
      setSessionRecs(await patientApiService.getSessionRecommendations(sid))
    } catch (e) {
      setRecsErr(e instanceof Error ? e.message : t('loadFailed'))
    } finally {
      setRecsLoading(false)
    }
  }

  async function fetchEngineRecs() {
    setRecsLoading(true)
    setRecsErr(null)
    try {
      setEngineRecs(await patientApiService.getEngineRecommendations(uid))
    } catch (e) {
      setRecsErr(e instanceof Error ? e.message : t('loadFailed'))
    } finally {
      setRecsLoading(false)
    }
  }

  // ── chart (time axis: each joint keeps its own sample times; display UTC+8) ─
  const chartOption = useMemo(() => {
    type Pt = { t: number; joint: string; angle: number }
    const points: Pt[] = []
    measurements.forEach((m) => {
      extractJointAnglesFromMeasurement(m).forEach((j) => {
        const t = new Date(j.timestamp).getTime()
        if (!Number.isFinite(t)) return
        points.push({ t, joint: j.angleID, angle: j.angle })
      })
    })

    if (points.length === 0) {
      return {
        tooltip: { trigger: 'axis' },
        legend: { data: [] as string[] },
        xAxis: { type: 'time' },
        yAxis: { type: 'value', name: 'Angle (°)' },
        series: [] as any[],
      }
    }

    const joints = Array.from(new Set(points.map((p) => p.joint)))
    const acc = new Map<string, Map<number, { sum: number; n: number }>>()
    points.forEach((p) => {
      let byT = acc.get(p.joint)
      if (!byT) {
        byT = new Map()
        acc.set(p.joint, byT)
      }
      const cur = byT.get(p.t)
      if (!cur) byT.set(p.t, { sum: p.angle, n: 1 })
      else {
        cur.sum += p.angle
        cur.n += 1
      }
    })

    const series = joints.map((joint) => {
      const byT = acc.get(joint)
      if (!byT) return { type: 'line', name: joint, smooth: true, showSymbol: false, data: [] as [number, number][] }
      const data: [number, number][] = [...byT.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([t, v]) => [t, parseFloat((v.sum / v.n).toFixed(2))])
      return { type: 'line', name: joint, smooth: true, showSymbol: false, data }
    })

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            formatter: (p: { axisDimension?: string; value?: number }) =>
              p.axisDimension === 'x' && p.value != null
                ? formatChartAxisTime(Number(p.value), locale)
                : String(p.value ?? ''),
          },
        },
        formatter: (params: unknown) => {
          const arr = params as {
            axisValue: number
            marker: string
            seriesName: string
            value: [number, number] | number | unknown
            data: [number, number] | unknown
          }[]
          if (!Array.isArray(arr) || arr.length === 0) return ''
          const head = formatChartTooltipTime(Number(arr[0].axisValue), locale)
          const lines = arr
            .map((p) => {
              const raw = Array.isArray(p.value)
                ? p.value
                : Array.isArray(p.data)
                  ? p.data
                  : null
              let y: number = NaN
              if (raw && raw.length >= 2) y = Number(raw[1])
              else if (typeof p.value === 'number') y = p.value
              const yStr = Number.isFinite(y) ? String(y) : '—'
              return `${p.marker}${p.seriesName}: ${yStr}°`
            })
            .join('<br/>')
          return `<div style="font-weight:600;margin-bottom:4px">${head}</div>${lines}`
        },
      },
      legend: { data: joints },
      xAxis: {
        type: 'time',
        axisLabel: {
          fontSize: 11,
          hideOverlap: true,
          formatter: (v: string | number) => formatChartAxisTime(Number(v), locale),
        },
      },
      yAxis: { type: 'value', name: 'Angle (°)' },
      grid: { top: 30, left: 50, right: 20, bottom: 80, containLabel: true },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
        { type: 'slider', xAxisIndex: 0, height: 22, bottom: 22, filterMode: 'none' },
      ],
      series,
    }
  }, [measurements, locale])

  const startedAtTitle = useMemo(() => {
    const raw = sessionMeta?.started_at
    if (!raw) return null
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString(locale, { dateStyle: 'full', timeStyle: 'short' })
  }, [sessionMeta, locale])

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="page doctor-workspace-page">
      <header className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.2rem' }}>
            {startedAtTitle ?? (loading ? '…' : t('sessionDetailTimeUnknown'))}
          </h1>
          <p className="muted">{t('sessionDetailSessionLine', { id: sessionId })}</p>
          <p className="muted">{t('sessionDetailPatientLine', { patientId })}</p>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={() => navigate(`/doctor/p/${patientId}/sessions`)}
        >
          {t('sessionDetailBack')}
        </button>
      </header>

      {err ? <ErrorBanner message={err} onRetry={() => void load()} /> : null}

      {loading ? (
        <LoadingBlock label={t('sessionDetailLoading')} />
      ) : (
        <>
          {/* ── Motion Data Chart ── */}
          <section className="card" style={{ marginBottom: '1rem' }}>
            <h2 className="card-title">{t('sessionChartTitle')}</h2>
            {measurements.length === 0 ? (
              <p className="muted">{t('sessionChartEmpty')}</p>
            ) : (
              <ReactECharts option={chartOption} style={{ height: 300 }} />
            )}
          </section>

          {/* ── AI Recommendations ── */}
          <section className="card">
            <h2 className="card-title">{t('sessionAiTitle')}</h2>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn primary"
                disabled={recsLoading}
                onClick={() => void fetchSessionRecs()}
              >
                {t('sessionAiSessionBtn')} #{sessionId}
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={recsLoading}
                onClick={() => void fetchEngineRecs()}
              >
                {t('sessionAiEngineBtn')} #{patientId}
              </button>
            </div>

            {recsLoading && <LoadingBlock label={t('sessionAiLoading')} />}
            {recsErr && <ErrorBanner message={recsErr} />}

            {sessionRecs != null && (
              <div style={{ marginBottom: engineRecs ? '1rem' : 0 }}>
                <p className="muted small" style={{ marginBottom: '0.5rem' }}>
                  {t('sessionAiSessionLabel')} ({sessionRecs.length})
                </p>
                {sessionRecs.length === 0 ? (
                  <p className="muted">{t('sessionAiSessionEmpty')}</p>
                ) : (
                  <div className="task-list">
                    {sessionRecs.map((r) => (
                      <div key={r.id} className="task-row">
                        <div className="task-main">
                          <p className="task-title" style={{ textTransform: 'capitalize' }}>
                            {r.movement.replaceAll('_', ' ')}
                          </p>
                          <p className="muted small">
                            {new Date(r.created_at).toLocaleString()}
                            {r.notes ? ` · ${r.notes}` : ''}
                          </p>
                        </div>
                        <span className="check-state idle">
                          {(r.confidence * 100).toFixed(0)}% conf
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {engineRecs != null && (
              <div>
                <p className="muted small" style={{ marginBottom: '0.5rem' }}>
                  {t('sessionAiEngineLabel')} · {engineRecs.sessions_analysed} sessions · {new Date(engineRecs.generated_at).toLocaleString()}
                </p>
                <div className="task-list">
                  {engineRecs.suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="task-row"
                      style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{s.joint}</span>
                        <span className={`check-state ${PRIORITY_CLASS[s.priority] ?? 'idle'}`}>{s.priority}</span>
                        <span className="muted small" style={{ marginLeft: 'auto' }}>
                          {s.accuracy_percent}% · {s.total_measurements} {t('sessionMeasurements').toLowerCase()}
                        </span>
                      </div>
                      <p className="muted small">{s.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
