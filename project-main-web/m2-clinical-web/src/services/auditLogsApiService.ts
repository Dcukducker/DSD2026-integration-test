/**
 * Audit logs API — GET /audit-logs, GET /audit-logs/:id (V2).
 */

import type { ApiAuditLog, AuditLogQuery } from '../types/api'
import { authStore } from './authStore'
import { API_BASE_URL } from '../config/apiConfig'

const BASE_URL = API_BASE_URL

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

function asList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const v = (raw as Record<string, unknown>).value
    if (Array.isArray(v)) return v
  }
  return []
}

function normalizeAuditLog(raw: unknown): ApiAuditLog | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = Number(o.id)
  if (!Number.isFinite(id)) return null
  const userIdRaw = o.user_id ?? o.userId
  const userId =
    userIdRaw == null || userIdRaw === ''
      ? null
      : Number.isFinite(Number(userIdRaw))
        ? Number(userIdRaw)
        : null
  const targetIdRaw = o.target_id ?? o.targetId
  const target_id =
    targetIdRaw == null || targetIdRaw === ''
      ? null
      : Number.isFinite(Number(targetIdRaw))
        ? Number(targetIdRaw)
        : null
  return {
    id,
    user_id: userId,
    action: String(o.action ?? ''),
    target_type: String(o.target_type ?? o.targetType ?? ''),
    target_id,
    details: o.details == null ? null : String(o.details),
    created_at: String(o.created_at ?? ''),
    user_name:
      typeof o.user_name === 'string'
        ? o.user_name
        : typeof o.userName === 'string'
          ? o.userName
          : null,
  }
}

function buildQuery(query?: AuditLogQuery): string {
  if (!query) return ''
  const params = new URLSearchParams()
  if (query.userId != null) params.set('userId', String(query.userId))
  if (query.action) params.set('action', query.action)
  if (query.targetType) params.set('targetType', query.targetType)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const auditLogsApiService = {
  async listAuditLogs(query?: AuditLogQuery): Promise<ApiAuditLog[]> {
    const raw = await apiFetch<unknown>(`/audit-logs${buildQuery(query)}`)
    return asList(raw)
      .map(normalizeAuditLog)
      .filter((x): x is ApiAuditLog => x != null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  async getAuditLog(id: number): Promise<ApiAuditLog> {
    const raw = await apiFetch<unknown>(`/audit-logs/${id}`)
    const row = normalizeAuditLog(raw)
    if (!row) throw new Error(`[API] GET /audit-logs/${id} returned invalid payload`)
    return row
  },
}
