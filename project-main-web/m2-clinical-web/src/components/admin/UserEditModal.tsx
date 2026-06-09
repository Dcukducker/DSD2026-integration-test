import { useEffect, useState } from 'react'
import { adminApiService } from '../../services/adminApiService'
import type { ApiPatient, ApiUserRole, ApiUserStatus } from '../../types/api'
import { useI18n } from '../../i18n/I18nContext'

type Props = {
  open: boolean
  user: ApiPatient | null
  onClose: () => void
  onSaved: () => void
}

const ROLES: ApiUserRole[] = ['patient', 'clinician', 'admin']
const STATUSES: ApiUserStatus[] = ['active', 'pending', 'rejected', 'disabled']

export function UserEditModal({ open, user, onClose, onSaved }: Props) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [role, setRole] = useState<ApiUserRole>('patient')
  const [status, setStatus] = useState<ApiUserStatus>('active')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !user) return
    setName(user.name)
    setAge(user.age == null ? '' : String(user.age))
    setRole(user.role)
    setStatus(user.status)
    setError(null)
  }, [open, user])

  if (!open || !user) return null

  const resetAndClose = () => {
    setError(null)
    onClose()
  }

  const submit = async () => {
    const nameText = name.trim()
    if (!nameText) {
      setError(t('adminUserNameRequired'))
      return
    }
    let ageValue: number | null = null
    if (age.trim() !== '') {
      const n = Number(age)
      if (!Number.isFinite(n) || n < 0) {
        setError(t('adminUserAgeInvalid'))
        return
      }
      ageValue = Math.floor(n)
    }
    setSubmitting(true)
    setError(null)
    try {
      await adminApiService.updateUser(user.id, {
        name: nameText,
        age: ageValue,
        role,
        status,
      })
      onSaved()
      resetAndClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('adminUserUpdateErr'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="entry-modal-mask" role="dialog" aria-modal="true" onClick={resetAndClose}>
      <div className="entry-modal feedback-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, color: '#0f2a4e' }}>{t('adminEditUserTitle')}</h3>
        <p className="muted small" style={{ marginTop: 6 }}>
          #{user.id} · {user.email}
        </p>
        <label className="muted small" htmlFor="user-edit-name" style={{ display: 'block', marginTop: 12 }}>
          {t('adminUserNameLabel')}
        </label>
        <input
          id="user-edit-name"
          className="patient-select"
          style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
        />
        <label className="muted small" htmlFor="user-edit-age" style={{ display: 'block', marginTop: 10 }}>
          {t('adminUserAgeLabel')}
        </label>
        <input
          id="user-edit-age"
          type="number"
          min={0}
          className="patient-select"
          style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
          value={age}
          placeholder={t('adminUserAgePlaceholder')}
          onChange={(e) => setAge(e.target.value)}
          disabled={submitting}
        />
        <label className="muted small" htmlFor="user-edit-role" style={{ display: 'block', marginTop: 10 }}>
          {t('adminUserRoleLabel')}
        </label>
        <select
          id="user-edit-role"
          className="patient-select"
          style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
          value={role}
          onChange={(e) => setRole(e.target.value as ApiUserRole)}
          disabled={submitting}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r === 'patient'
                ? t('adminRolePatient')
                : r === 'clinician'
                  ? t('adminRoleDoctor')
                  : t('adminRoleAdminLabel')}
            </option>
          ))}
        </select>
        <label className="muted small" htmlFor="user-edit-status" style={{ display: 'block', marginTop: 10 }}>
          {t('adminUserStatusLabel')}
        </label>
        <select
          id="user-edit-status"
          className="patient-select"
          style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
          value={status}
          onChange={(e) => setStatus(e.target.value as ApiUserStatus)}
          disabled={submitting}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'active'
                ? t('adminStatusActive')
                : s === 'pending'
                  ? t('adminStatusPending')
                  : s === 'rejected'
                    ? t('adminStatusRejected')
                    : t('adminStatusDisabled')}
            </option>
          ))}
        </select>
        {error ? (
          <p className="muted small" style={{ color: '#c53030', marginTop: 8 }}>{error}</p>
        ) : null}
        <div className="role-actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn ghost" onClick={resetAndClose} disabled={submitting}>
            {t('cancel')}
          </button>
          <button type="button" className="btn primary" onClick={() => void submit()} disabled={submitting}>
            {submitting ? t('loading') : t('adminUserSave')}
          </button>
        </div>
      </div>
    </div>
  )
}
