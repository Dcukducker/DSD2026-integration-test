/**
 * patientApiService — all HTTP-related operations for the doctor portal.
 * Every exported function maps 1-to-1 with a backend endpoint in docs/apis.md.
 */

import type {
  ApiPatient,
  ApiSession,
  ApiMeasurement,
  ApiSessionRecommendation,
  ApiEngineRecommendation,
  ApiScheduleItem,
  CreateScheduleInput,
} from '../types/api'
import type { HistoryRecord, TrendSeries } from '../types/clinical'
import { authStore } from './authStore'
import { extractJointAnglesFromMeasurement } from '../utils/measurementJointAngles'
import { API_BASE_URL } from '../config/apiConfig'

// ─── config ──────────────────────────────────────────────────────────────────
const BASE_URL = API_BASE_URL

// ─── helpers ─────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...authStore.getAuthHeaders(),
    },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[API] ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${body}`)
  }
  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (null as T)
}

const SCHEDULE_STATUSES = ['pending', 'completed', 'skipped'] as const
type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number]

function normalizeScheduleStatus(raw: unknown): ScheduleStatus | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim().toLowerCase()
  return (SCHEDULE_STATUSES as readonly string[]).includes(s) ? (s as ScheduleStatus) : null
}

function normalizeApiScheduleItem(raw: unknown): ApiScheduleItem | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = Number(o.id)
  if (!Number.isFinite(id)) return null
  const userId = Number(o.user_id ?? o.userId)
  const status = normalizeScheduleStatus(o.status)
  if (!status) return null
  const createdAt = typeof o.created_at === 'string' ? o.created_at : undefined
  return {
    id,
    user_id: Number.isFinite(userId) ? userId : 0,
    exercise: String(o.exercise ?? ''),
    date: String(o.date ?? ''),
    duration: Number(o.duration) || 0,
    notes: String(o.notes ?? ''),
    status,
    ...(createdAt ? { created_at: createdAt } : {}),
  }
}

function normalizeApiMeasurement(raw: unknown): ApiMeasurement | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Record<string, unknown>
  const id = Number(m.id)
  if (!Number.isFinite(id)) return null
  const sid = Number(m.sessionId ?? m.session_id)
  const rowTs = typeof m.timestamp === 'string' ? m.timestamp : undefined
  const sensorRaw = m.sensorData ?? m.sensor_data
  const errorsRaw = m.errors
  const isCorrect = typeof m.is_correct === 'boolean' ? m.is_correct : typeof m.isCorrect === 'boolean' ? m.isCorrect : undefined
  return {
    id,
    sessionId: Number.isFinite(sid) ? sid : 0,
    timestamp: rowTs,
    targetAngles: extractJointAnglesFromMeasurement(m),
    errors: Array.isArray(errorsRaw) ? errorsRaw : [],
    sensorData: Array.isArray(sensorRaw) ? sensorRaw : [],
    isCorrect,
  }
}

// ─── service ─────────────────────────────────────────────────────────────────
export const patientApiService = {
  // GET /patients
  async listPatients(): Promise<ApiPatient[]> {
    return apiFetch<ApiPatient[]>('/patients')
  },

  // GET /sessions?userId=X
  async listSessions(userId: number): Promise<ApiSession[]> {
    return apiFetch<ApiSession[]>(`/sessions?userId=${userId}`)
  },

  // GET /measurements/:sessionId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  async listMeasurements(sessionId: number, range?: { startDate?: string; endDate?: string }): Promise<ApiMeasurement[]> {
    const qs = new URLSearchParams()
    if (range?.startDate) qs.set('startDate', range.startDate)
    if (range?.endDate) qs.set('endDate', range.endDate)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    const raw = await apiFetch<unknown>(`/measurements/${sessionId}${suffix}`)
    if (!Array.isArray(raw)) return []
    return raw.map(normalizeApiMeasurement).filter((x): x is ApiMeasurement => x != null)
  },

  // GET /recommendations/session/:sessionId
  async getSessionRecommendations(sessionId: number): Promise<ApiSessionRecommendation[]> {
    const res = await apiFetch<ApiSessionRecommendation[] | null>(`/recommendations/session/${sessionId}`)
    return res ?? []
  },

  // GET /recommendations/engine/:userId
  async getEngineRecommendations(userId: number): Promise<ApiEngineRecommendation> {
    return apiFetch<ApiEngineRecommendation>(`/recommendations/engine/${userId}`)
  },

  // POST /schedule
  async createScheduleItem(input: CreateScheduleInput): Promise<ApiScheduleItem> {
    const raw = await apiFetch<unknown>('/schedule', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    const item = normalizeApiScheduleItem(raw)
    if (!item) {
      throw new Error('[API] POST /schedule returned invalid or missing status')
    }
    return item
  },

  // GET /schedule/:userId
  async listSchedule(userId: number): Promise<ApiScheduleItem[]> {
    const raw = await apiFetch<unknown>(`/schedule/${userId}`)
    if (!Array.isArray(raw)) return []
    return raw.map(normalizeApiScheduleItem).filter((x): x is ApiScheduleItem => x != null)
  },

  /**
   * Aggregate sessions + measurements into TrendSeries for the TrendsPage.
   * Each session date becomes an x-axis point; y is the average angle per joint.
   */
  async getTrendsFromSessions(userId: number): Promise<TrendSeries[]> {
    const sessions = await patientApiService.listSessions(userId)
    const allMeasurements = await Promise.all(
      sessions.map((s) => patientApiService.listMeasurements(s.id)),
    )

    // Collect all joint IDs
    const jointIds = new Set<string>()
    allMeasurements.forEach((ms) =>
      ms.forEach((m) => extractJointAnglesFromMeasurement(m).forEach((j) => jointIds.add(j.angleID))),
    )

    // Build series: one per joint, points indexed by session order
    return [...jointIds].map((joint) => ({
      metricKey: joint,
      points: sessions.map((session, idx) => {
        const ms = allMeasurements[idx]
        const angles = ms.flatMap((m) =>
          extractJointAnglesFromMeasurement(m).filter((j) => j.angleID === joint).map((j) => j.angle),
        )
        const avg = angles.length ? angles.reduce((a, b) => a + b, 0) / angles.length : 0
        return {
          t: session.started_at.slice(0, 10),
          value: parseFloat(avg.toFixed(1)),
          source: 'measured' as const,
        }
      }),
    }))
  },

  /**
   * Convert sessions into HistoryRecord[] for the HistoryPage.
   */
  async getSessionsAsHistory(userId: number): Promise<HistoryRecord[]> {
    const sessions = await patientApiService.listSessions(userId)
    const allMeasurements = await Promise.all(
      sessions.map((s) => patientApiService.listMeasurements(s.id)),
    )

    return sessions.map((session, idx) => {
      const ms = allMeasurements[idx]
      const metrics: HistoryRecord['metrics'] = {}

      // Compute average for each joint across this session's measurements
      const jointMap = new Map<string, number[]>()
      ms.forEach((m) =>
        extractJointAnglesFromMeasurement(m).forEach((j) => {
          if (!jointMap.has(j.angleID)) jointMap.set(j.angleID, [])
          jointMap.get(j.angleID)!.push(j.angle)
        }),
      )
      jointMap.forEach((angles, joint) => {
        const avg = angles.reduce((a, b) => a + b, 0) / angles.length
        metrics[joint] = { value: parseFloat(avg.toFixed(1)), unit: '°', source: 'measured' }
      })

      return {
        id: String(session.id),
        t: session.started_at.slice(0, 10),
        type: 'training',
        title: `Session #${session.id}`,
        summary: `${ms.length} measurements`,
        metrics,
      }
    })
  },
}

