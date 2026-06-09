/**
 * Announcements API — POST/GET/PATCH/DELETE /announcements (V2).
 */

import type {
  AnnouncementStatus,
  ApiAnnouncement,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '../types/api'
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
  if (res.status === 204) return null as T
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

function normalizeAnnouncement(raw: unknown): ApiAnnouncement | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = Number(o.id)
  const createdBy = Number(o.created_by ?? o.createdBy)
  const status = String(o.status ?? '') as AnnouncementStatus
  if (!Number.isFinite(id) || !Number.isFinite(createdBy)) return null
  if (status !== 'draft' && status !== 'published') return null
  return {
    id,
    title: String(o.title ?? ''),
    content: String(o.content ?? ''),
    status,
    created_by: createdBy,
    created_at: String(o.created_at ?? ''),
    updated_at: o.updated_at == null ? null : String(o.updated_at),
    created_by_name:
      typeof o.created_by_name === 'string'
        ? o.created_by_name
        : typeof o.createdByName === 'string'
          ? o.createdByName
          : undefined,
  }
}

export const announcementsApiService = {
  async createAnnouncement(input: CreateAnnouncementInput): Promise<ApiAnnouncement> {
    const raw = await apiFetch<unknown>('/announcements', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        content: input.content,
        createdBy: input.createdBy,
      }),
    })
    const row = normalizeAnnouncement(raw)
    if (!row) throw new Error('[API] POST /announcements returned invalid payload')
    return row
  },

  async listAnnouncements(status?: AnnouncementStatus): Promise<ApiAnnouncement[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    const raw = await apiFetch<unknown>(`/announcements${qs}`)
    return asList(raw)
      .map(normalizeAnnouncement)
      .filter((x): x is ApiAnnouncement => x != null)
  },

  async getAnnouncement(id: number): Promise<ApiAnnouncement> {
    const raw = await apiFetch<unknown>(`/announcements/${id}`)
    const row = normalizeAnnouncement(raw)
    if (!row) throw new Error(`[API] GET /announcements/${id} returned invalid payload`)
    return row
  },

  async updateAnnouncement(id: number, input: UpdateAnnouncementInput): Promise<ApiAnnouncement> {
    const raw = await apiFetch<unknown>(`/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    const row = normalizeAnnouncement(raw)
    if (!row) throw new Error(`[API] PATCH /announcements/${id} returned invalid payload`)
    return row
  },

  async deleteAnnouncement(id: number): Promise<void> {
    await apiFetch<null>(`/announcements/${id}`, { method: 'DELETE' })
  },
}
