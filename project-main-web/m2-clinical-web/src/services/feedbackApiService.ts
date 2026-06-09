/**
 * Feedback API — POST/GET/PATCH /feedback (V2).
 */

import type { ApiFeedback, CreateFeedbackInput, FeedbackStatus, UpdateFeedbackInput } from '../types/api'
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

function normalizeFeedback(raw: unknown): ApiFeedback | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = Number(o.id)
  const userId = Number(o.user_id ?? o.userId)
  const status = String(o.status ?? '') as FeedbackStatus
  if (!Number.isFinite(id) || !Number.isFinite(userId)) return null
  if (status !== 'pending' && status !== 'reviewed' && status !== 'resolved') return null
  return {
    id,
    user_id: userId,
    content: String(o.content ?? ''),
    status,
    response: o.response == null ? null : String(o.response),
    created_at: String(o.created_at ?? ''),
    updated_at: o.updated_at == null ? null : String(o.updated_at),
    user_name: typeof o.user_name === 'string' ? o.user_name : undefined,
    user_email: typeof o.user_email === 'string' ? o.user_email : undefined,
  }
}

export const feedbackApiService = {
  async createFeedback(input: CreateFeedbackInput): Promise<ApiFeedback> {
    const raw = await apiFetch<unknown>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ userId: input.userId, content: input.content }),
    })
    const row = normalizeFeedback(raw)
    if (!row) throw new Error('[API] POST /feedback returned invalid payload')
    return row
  },

  async listFeedback(status?: FeedbackStatus): Promise<ApiFeedback[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    const raw = await apiFetch<unknown>(`/feedback${qs}`)
    const list = Array.isArray(raw) ? raw : []
    return list.map(normalizeFeedback).filter((x): x is ApiFeedback => x != null)
  },

  async getFeedback(id: number): Promise<ApiFeedback> {
    const raw = await apiFetch<unknown>(`/feedback/${id}`)
    const row = normalizeFeedback(raw)
    if (!row) throw new Error(`[API] GET /feedback/${id} returned invalid payload`)
    return row
  },

  async updateFeedback(id: number, input: UpdateFeedbackInput): Promise<ApiFeedback> {
    const raw = await apiFetch<unknown>(`/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    const row = normalizeFeedback(raw)
    if (!row) throw new Error(`[API] PATCH /feedback/${id} returned invalid payload`)
    return row
  },
}
