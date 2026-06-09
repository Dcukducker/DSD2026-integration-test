import type { ApiAuditLog } from '../types/api'

export function formatAuditLogDetails(details: string | null): string {
  if (!details) return ''
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>
    return Object.entries(parsed)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(' · ')
  } catch {
    return details
  }
}

export function auditLogActor(log: ApiAuditLog): string {
  if (log.user_name) return log.user_name
  if (log.user_id != null) return `#${log.user_id}`
  return '—'
}

export function auditLogTarget(log: ApiAuditLog): string {
  if (log.target_id != null) return `${log.target_type} #${log.target_id}`
  return log.target_type || '—'
}
