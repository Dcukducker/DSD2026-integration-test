import type { ApiJointAngle } from '../types/api'

function coerceIsoTimestamp(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v).toISOString()
  return null
}

/**
 * Joint samples may live under `joint_angles` (API), `targetAngles` (legacy / mocks),
 * or `target_angles`. If multiple keys exist, the first **non-empty** array wins so
 * renames on either side keep working without duplicate rows.
 */
function pickAnglesArray(raw: Record<string, unknown>): unknown[] {
  const keys = ['joint_angles', 'targetAngles', 'target_angles'] as const
  for (const k of keys) {
    const v = raw[k]
    if (Array.isArray(v) && v.length > 0) return v
  }
  for (const k of keys) {
    const v = raw[k]
    if (Array.isArray(v)) return v
  }
  return []
}

/** Normalized joint rows from one measurement object (any supported field names). */
export function extractJointAnglesFromMeasurement(raw: unknown): ApiJointAngle[] {
  if (!raw || typeof raw !== 'object') return []
  const o = raw as Record<string, unknown>
  const arr = pickAnglesArray(o)
  const out: ApiJointAngle[] = []
  for (const j of arr) {
    if (!j || typeof j !== 'object') continue
    const row = j as Record<string, unknown>
    const ts = coerceIsoTimestamp(row.timestamp)
    const idRaw = row.angleID ?? row.angle_id
    const angle = Number(row.angle)
    if (ts == null) continue
    if (idRaw == null || (typeof idRaw !== 'string' && typeof idRaw !== 'number')) continue
    if (!Number.isFinite(angle)) continue
    out.push({ timestamp: ts, angleID: String(idRaw), angle })
  }
  return out
}
