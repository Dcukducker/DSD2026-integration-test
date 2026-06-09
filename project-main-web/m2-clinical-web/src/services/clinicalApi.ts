import type {
  ClinicalEvent,
  HistoryRecord,
  LimbModelState,
  PatientSummary,
  TimeRangePreset,
  TrendSeries,
} from '../types/clinical'
import { getRuntimeLocale } from '../i18n/runtime'
import {
  mockEventsForPatient,
  mockHistoryForPatient,
  mockLimbState,
  mockTrendsForPatient,
  mockPatients,
} from './mock/clinicalMock'
import { API_BASE_URL } from '../config/apiConfig'
import { authStore } from './authStore'

const MOCK_LATENCY_MS = { min: 280, max: 720 }
const tr = (zh: string, en: string, pt: string) => {
  const locale = getRuntimeLocale()
  if (locale === 'en') return en
  if (locale === 'pt-BR') return pt
  return zh
}

function delay(): Promise<void> {
  const ms =
    MOCK_LATENCY_MS.min +
    Math.random() * (MOCK_LATENCY_MS.max - MOCK_LATENCY_MS.min)
  return new Promise((r) => setTimeout(r, ms))
}

function filterByRange(
  series: TrendSeries[],
  range: TimeRangePreset,
): TrendSeries[] {
  const now = new Date()
  const cutoff = new Date(now)
  if (range === 'week') cutoff.setDate(cutoff.getDate() - 7)
  else if (range === 'month') cutoff.setMonth(cutoff.getMonth() - 1)
  else return series

  const cut = cutoff.toISOString().slice(0, 10)
  return series.map((s) => ({
    ...s,
    points: s.points.filter((p) => p.t >= cut),
  }))
}

/**
 * Read USE_MOCK from Vite env var with fallback to true.
 * Set VITE_USE_MOCK=false in .env to switch to real API mode.
 */
const USE_MOCK: boolean =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env as Record<string, string>).VITE_USE_MOCK) !== 'false'

async function apiFetch<T>(path: string): Promise<T> {
  const token = authStore.getToken()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}${path}`, { headers })
  if (!res.ok) {
    const msg = await res.text().catch(() => 'unknown error')
    throw new Error(`API ${path} failed (${res.status}): ${msg}`)
  }
  return res.json()
}

export const clinicalApi = {
  async listPatients(): Promise<PatientSummary[]> {
    if (USE_MOCK) { await delay(); return mockPatients() }
    const data = await apiFetch<Array<Record<string, unknown>>>('/patients')
    return data.map((p: Record<string, unknown>) => ({
      id: String(p.id ?? ''),
      name: String(p.name ?? ''),
      conditionLabel: (p.condition_label as string) ?? (p.conditionLabel as string) ?? '',
      lastSessionDate: (p.last_session_date as string) ?? '',
      doctorName: (p.doctor_name as string) ?? '',
    }))
  },

  async getTrends(
    patientId: string,
    range: TimeRangePreset,
  ): Promise<TrendSeries[]> {
    if (USE_MOCK) { await delay(); return filterByRange(mockTrendsForPatient(patientId, range), range) }
    const data = await apiFetch<Record<string, unknown>>(`/progress/${patientId}`)
    // Map V2 progress response to TrendSeries
    const series: TrendSeries[] = []
    if (data.rom && (data.rom as Record<string, unknown>).history) {
      const history = (data.rom as Record<string, unknown>).history as Array<Record<string, unknown>>
      series.push({
        name: tr('ROM', 'Range of Motion', 'ADM'),
        unit: '°',
        source: 'measured',
        points: history.map((h: Record<string, unknown>) => ({ t: String(h.date ?? ''), v: Number(h.degrees ?? 0) })),
      })
    }
    return filterByRange(series, range)
  },

  async getClinicalEvents(
    patientId: string,
    range: TimeRangePreset,
  ): Promise<ClinicalEvent[]> {
    if (USE_MOCK) { await delay(); const events = mockEventsForPatient(patientId); if (range === 'all') return events; const now = new Date(); const cutoff = new Date(now); if (range === 'week') cutoff.setDate(cutoff.getDate() - 7); else cutoff.setMonth(cutoff.getMonth() - 1); const cut = cutoff.toISOString().slice(0, 10); return events.filter((e) => e.t >= cut) }
    const data = await apiFetch<Record<string, unknown>>(`/recommendations/engine/${patientId}`)
    return [{
      t: String(data.generated_at ?? new Date().toISOString().slice(0, 10)),
      type: 'ai_recommendation',
      label: tr('AI分析', 'AI Analysis', 'Análise IA'),
      note: String((data as Record<string, unknown>).suggestions ?? ''),
    }]
  },

  async getHistory(patientId: string): Promise<HistoryRecord[]> {
    if (USE_MOCK) { await delay(); return mockHistoryForPatient(patientId) }
    const data = await apiFetch<Array<Record<string, unknown>>>(`/sessions?userId=${patientId}`)
    return data.map((s: Record<string, unknown>) => ({
      id: String(s.id ?? ''),
      date: String(s.started_at ?? s.created_at ?? '').slice(0, 10),
      type: 'session',
      label: tr('康复训练', 'Rehab Session', 'Sessão'),
      notes: `${s.measurement_count ?? 0} measurements`,
    }))
  },

  async getLimbOverlay(patientId: string): Promise<LimbModelState> {
    if (USE_MOCK) { await delay(); return mockLimbState(patientId) }
    // Fetch latest session measurements for 3D overlay
    const sessions = await apiFetch<Array<Record<string, unknown>>>(`/sessions?userId=${patientId}`)
    if (!sessions.length) return { angleId: 'left_knee', angleDeg: 0, segments: [] }
    const latestSession = sessions[sessions.length - 1]
    const measurements = await apiFetch<Array<Record<string, unknown>>>(`/measurements/${latestSession.id}`)
    const last = measurements[measurements.length - 1]
    let angleDeg = 0
    if (last) {
      const angles = (last as Record<string, unknown>).target_angles || (last as Record<string, unknown>).joint_angles
      if (Array.isArray(angles) && angles.length > 0) {
        angleDeg = Number((angles[0] as Record<string, unknown>).angle ?? 0)
      }
    }
    return { angleId: 'left_knee', angleDeg, segments: [] }
  },
}

export type ClinicalApi = typeof clinicalApi
