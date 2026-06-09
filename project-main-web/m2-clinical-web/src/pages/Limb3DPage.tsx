import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LimbScene } from '../components/limb/LimbScene'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { LoadingBlock } from '../components/common/LoadingBlock'
import { useI18n } from '../i18n/I18nContext'
import { clinicalApi } from '../services/clinicalApi'
import type { LimbModelState } from '../types/clinical'

export function Limb3DPage() {
  const { patientId = 'p-001' } = useParams<{ patientId: string }>()
  const { t, locale } = useI18n()
  const [state, setState] = useState<LimbModelState | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  const load = useCallback(async () => {
    void locale
    setLoading(true); setErr(null)
    try { setState(await clinicalApi.getLimbOverlay(patientId)); setKey((k) => k + 1) }
    catch (e) { setErr(e instanceof Error ? e.message : 'load failed') }
    finally { setLoading(false) }
  }, [patientId, locale])
  useEffect(() => { void load() }, [load])

  return (
    <div className="page doctor-workspace-page">
      <header className="page-header">
        <div><h1>{t('navLimb')}</h1><p className="muted">{t('limbDesc')}</p></div>
        <button type="button" className="btn ghost" onClick={() => void load()}>{t('refreshOverlay')}</button>
      </header>
      {err ? <ErrorBanner message={err} onRetry={() => void load()} /> : null}
      {loading && !state ? <LoadingBlock label={t('loadingLimb')} /> : state ? (
        <>
          <section className="card limb-card">
            <div className="limb-meta">
              <p>{state.caption}</p>
              <p className="small"><span className="muted">{t('dataMix')}</span>{state.dataMixNote}</p>
              <p className="small muted">{t('updatedAt')} {new Date(state.updatedAt).toLocaleString(locale)}</p>
              <ul className="segment-legend">{state.segments.map((s) => (
                <li key={s.id}><span className="seg-swatch" style={{ background: 'linear-gradient(90deg, #38bdf8, #f97316)', opacity: 0.35 + s.heat * 0.65 }} />{s.label}{s.angleDeg !== undefined ? ` · ${s.angleDeg}°` : ''}<span className="muted">({t('heat')} {Math.round(s.heat * 100)}%)</span></li>
              ))}</ul>
            </div>
            <div className="limb-canvas-host" key={key}><LimbScene state={state} /></div>
          </section>
          <p className="muted small">{t('limbFoot')}</p>
        </>
      ) : null}
    </div>
  )
}
