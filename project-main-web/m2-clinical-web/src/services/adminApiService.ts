/**
 * adminApiService — admin-only API operations.
 * Requires a valid admin JWT (stored via authStore).
 */

import type { ApiPatient, ApiSession, ApiUserRole, ApiUserStatus, UpdateUserInput } from '../types/api'
import { authStore } from './authStore'
import { API_BASE_URL } from '../config/apiConfig'

const BASE_URL = API_BASE_URL

function asList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const v = (raw as Record<string, unknown>).value
    if (Array.isArray(v)) return v
  }
  return []
}

function normalizeUser(raw: unknown): ApiPatient | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = Number(o.id)
  if (!Number.isFinite(id)) return null
  const role = String(o.role ?? '') as ApiUserRole
  if (role !== 'patient' && role !== 'clinician' && role !== 'admin') return null
  const status = String(o.status ?? '') as ApiUserStatus
  if (status !== 'active' && status !== 'pending' && status !== 'rejected' && status !== 'disabled') {
    return null
  }
  const ageRaw = o.age
  const age =
    ageRaw == null || ageRaw === ''
      ? null
      : Number.isFinite(Number(ageRaw))
        ? Number(ageRaw)
        : null
  return {
    id,
    name: String(o.name ?? ''),
    email: String(o.email ?? ''),
    role,
    age,
    status,
    created_at: String(o.created_at ?? ''),
  }
}

async function adminFetch<T>(path: string, opts?: RequestInit): Promise<T> {
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
    throw new Error(`[Admin API] ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${body}`)
  }
  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (null as T)
}

export const adminApiService = {
  /** GET /users — all users */
  async listAllUsers(): Promise<ApiPatient[]> {
    const raw = await adminFetch<unknown>('/users')
    return asList(raw)
      .map(normalizeUser)
      .filter((x): x is ApiPatient => x != null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  /** PATCH /users/:id — update name, age, role, status */
  async updateUser(id: number, input: UpdateUserInput): Promise<ApiPatient> {
    const raw = await adminFetch<unknown>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    const row = normalizeUser(raw)
    if (!row) throw new Error(`[Admin API] PATCH /users/${id} returned invalid payload`)
    return row
  },

  /** GET /users/:id — single user (may include license fields) */
  async getUserById(id: number): Promise<unknown> {
    return adminFetch<unknown>(`/users/${id}`)
  },

  /** GET /users/:id/license — returns binary download (404 if none) */
  async getUserLicense(id: number): Promise<Response> {
    return fetch(`${BASE_URL}/users/${id}/license`, {
      headers: {
        Accept: '*/*',
        ...authStore.getAuthHeaders(),
      },
    })
  },

  /** GET /users filtered to clinicians with status=pending */
  async listPendingClinicians(): Promise<ApiPatient[]> {
    const users = await adminApiService.listAllUsers()
    return users.filter((u) => u.role === 'clinician' && u.status === 'pending')
  },

  /** GET /patients — all users with role=patient */
  async listPatients(): Promise<ApiPatient[]> {
    return adminFetch<ApiPatient[]>('/patients')
  },

  /** GET /sessions — list all sessions (admin) */
  async listAllSessions(): Promise<ApiSession[]> {
    return adminFetch<ApiSession[]>('/sessions')
  },

  /** PATCH /auth/approve/:userId */
  async approveClinician(userId: number): Promise<void> {
    return adminFetch<void>(`/auth/approve/${userId}`, { method: 'PATCH' })
  },

  /** PATCH /users/:id — reject clinician */
  async rejectClinician(userId: number): Promise<void> {
    return adminFetch<void>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected' }),
    })
  },
}
