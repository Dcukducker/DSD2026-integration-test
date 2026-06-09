import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LanguageSwitcher } from '../components/common/LanguageSwitcher'
import { useI18n } from '../i18n/I18nContext'
import { authStore, type AuthUser } from '../services/authStore'
import { API_BASE_URL } from '../config/apiConfig'

const BASE_URL = API_BASE_URL

/**
 * Hardcoded admin whitelist.
 * Only these emails are permitted to log in through the admin portal.
 * All other accounts (clinicians, patients) are rejected even if the
 * backend returns a valid token, because the backend shares roles.
 */
const ADMIN_EMAILS: ReadonlySet<string> = new Set([
  'admin@v2.dsd',
])

type RoleKey = 'doctor' | 'admin'
type AuthMode = 'login' | 'register'
type MsgState = { key: string; vars?: Record<string, string | number> } | { text: string }

export function AuthGatewayPage() {
  const { t, locale } = useI18n()
  const { role = 'doctor' } = useParams<{ role: RoleKey }>()
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [msg, setMsg] = useState<MsgState | null>(null)
  const [licenseFiles, setLicenseFiles] = useState<File[]>([])
  const [licensePreviews, setLicensePreviews] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const reuploadInputRef = useRef<HTMLInputElement | null>(null)

  // Re-upload license flow for rejected clinicians
  const [reuploadOpen, setReuploadOpen] = useState(false)
  const [reuploadUserId, setReuploadUserId] = useState<number | null>(null)
  const [reuploadFile, setReuploadFile] = useState<File | null>(null)
  const [reuploadPreview, setReuploadPreview] = useState<string>('')

  const safeRole: RoleKey = role === 'admin' ? 'admin' : 'doctor'
  const roleLabel = useMemo(
    () => (safeRole === 'doctor' ? t('roleDoctor') : t('roleAdmin')),
    [safeRole, t],
  )

  const targetPath = safeRole === 'doctor' ? '/doctor' : '/admin'

  const tr = (zh: string, en: string) => (locale === 'zh-CN' ? zh : en)

  function mapAuthErrorMessage(errText: string): MsgState {
    const raw = errText.trim()
    if (!raw) return { text: '' }
    const lower = raw.toLowerCase()
    if (
      lower.includes('invalid credentials') ||
      lower.includes('invalid password') ||
      lower.includes('incorrect password') ||
      lower.includes('bad credentials') ||
      lower.includes('wrong password')
    ) {
      return { key: 'authInvalidCredentials' }
    }
    if (
      lower.includes('pending') ||
      lower.includes('awaiting') ||
      lower.includes('approval') ||
      raw.includes('待') ||
      raw.includes('审核')
    ) {
      return { key: 'authPending' }
    }
    if (lower.includes('rejected') || raw.includes('未通过') || raw.includes('重新上传')) {
      return { key: 'authRejectedReupload' }
    }
    return { text: raw }
  }

  function resolveMsgText(next: MsgState | null): string {
    if (!next) return ''
    if ('key' in next) return t(next.key, next.vars)
    return next.text
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('read file failed'))
      reader.readAsDataURL(file)
    })
  }

  async function addLicenseFiles(files: File[]) {
    const next = [...licenseFiles]
    for (const f of files) {
      const key = `${f.name}-${f.size}-${f.lastModified}`
      const exists = next.some(
        (x) => `${x.name}-${x.size}-${x.lastModified}` === key,
      )
      if (!exists) next.push(f)
      if (next.length >= 6) break
    }
    setLicenseFiles(next)
    const previews = await Promise.all(next.map(async (f) => await fileToDataUrl(f)))
    setLicensePreviews(previews)
  }

  async function resolveReuploadUserId(email: string, fallbackId: number | null): Promise<number | null> {
    if (typeof fallbackId === 'number') return fallbackId
    const normalized = email.trim().toLowerCase()
    if (!normalized) return null
    try {
      const res = await fetch(`${BASE_URL}/users`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const users = await res.json() as Array<{ id?: number; userId?: number; email?: string }>
      const match = users.find((u) => typeof u.email === 'string' && u.email.toLowerCase() === normalized)
      const candidate = match?.id ?? match?.userId
      return typeof candidate === 'number' ? candidate : null
    } catch {
      return null
    }
  }

  function removeLicenseAt(idx: number) {
    const next = licenseFiles.filter((_, i) => i !== idx)
    setLicenseFiles(next)
    setLicensePreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account.trim() || !password.trim()) {
      setMsg({ key: 'authMissingAccountPassword' })
      return
    }

    setBusy(true)
    try {
      // ── Register ─────────────────────────────────────────────────────────
      if (mode === 'register') {
        // admin portal shows login-only; this guard is a safety net
        if (safeRole === 'admin') {
          setMsg({ key: 'authAdminRegisterBlocked' })
          return
        }
        if (!displayName.trim()) {
          setMsg({ key: 'authDisplayNameRequired' })
          return
        }
        if (licenseFiles.length === 0) {
          setMsg({ key: 'authLicenseRequired' })
          return
        }

        const formData = new FormData()
        formData.append('name', displayName)
        formData.append('email', account)
        formData.append('password', password)
        formData.append('role', 'clinician')
        formData.append('license', licenseFiles[0])

        const res = await fetch(`${BASE_URL}/auth/register`, {
          method: 'POST',
          body: formData,
        })
        if (res.ok) {
          setMsg({ key: 'authRegisterSubmitted' })
          setLicenseFiles([])
          setLicensePreviews([])
        } else {
          const body = await res.json().catch(() => ({})) as { error?: string }
          setMsg(body.error ? { text: body.error } : { key: 'authRegisterFailed', vars: { status: res.status } })
        }
        return
      }

      // ── Login ─────────────────────────────────────────────────────────────
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account, password }),
      })

      if (res.ok) {
        const data = await res.json() as { token: string; user: AuthUser }

        // Backend hotfix: if user is rejected but login still succeeds,
        // block client-side login and force re-upload flow.
        if (safeRole === 'doctor' && data.user?.status === 'rejected') {
          authStore.clearToken()
          setMsg({ key: 'authRejectedReupload' })
          const resolvedUserId = await resolveReuploadUserId(
            account,
            typeof data.user.id === 'number' ? data.user.id : null,
          )
          setReuploadUserId(resolvedUserId)
          setReuploadOpen(true)
          return
        }

        // Admin portal: reject anyone not in the whitelist, even with a valid token.
        if (safeRole === 'admin' && !ADMIN_EMAILS.has(data.user.email)) {
          setMsg({ key: 'authAdminNoAccess' })
          return
        }

        authStore.setToken(data.token)
        authStore.setUser(data.user)
        navigate(targetPath)
      } else if (res.status === 403) {
        const body = await res.json().catch(() => ({})) as { error?: string; status?: string; userId?: number; id?: number }
        const status = body.status ?? ''
        const errText = body.error ?? ''
        const isRejected = status === 'rejected' || /rejected/i.test(errText) || errText.includes('未通过') || errText.includes('重新上传')

        if (isRejected && safeRole === 'doctor') {
          setMsg({ key: 'authRejectedReupload' })
          const uid = body.userId ?? body.id ?? null
          const resolvedUserId = await resolveReuploadUserId(account, typeof uid === 'number' ? uid : null)
          setReuploadUserId(resolvedUserId)
          setReuploadOpen(true)
        } else {
          const mapped = mapAuthErrorMessage(errText)
          const next = resolveMsgText(mapped) ? mapped : { key: 'authPending' }
          setMsg(next)
        }
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string }
        const mapped = body.error ? mapAuthErrorMessage(body.error) : null
        const mappedText = resolveMsgText(mapped)
        setMsg(mappedText ? mapped! : { key: 'authLoginFailed', vars: { status: res.status } })
      }
    } catch (err) {
      setMsg(err instanceof Error ? { text: err.message } : { key: 'authNetworkError' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="role-page portal-page">
      <header className="page-header">
        <div>
          <h1>
            {safeRole === 'admin'
              ? tr(`${roleLabel} 登录`, `${roleLabel} Login`)
              : t('authTitle').replace('{role}', roleLabel)}
          </h1>
        </div>
        <div className="role-actions">
          <Link className="btn ghost" to="/roles">{t('backToRoleEntry')}</Link>
          <LanguageSwitcher />
        </div>
      </header>

      <section className="card" style={{ maxWidth: 560 }}>
        {safeRole !== 'admin' ? (
          <div className="role-actions" style={{ marginBottom: 12 }}>
            <button type="button" className={`btn ${mode === 'login' ? 'primary' : 'ghost'}`} onClick={() => setMode('login')}>
              {t('authLoginTab')}
            </button>
            <button type="button" className={`btn ${mode === 'register' ? 'primary' : 'ghost'}`} onClick={() => setMode('register')}>
              {t('authRegisterTab')}
            </button>
          </div>
        ) : null}

        <form onSubmit={onSubmit}>
          {mode === 'register' ? (
            <label className="small muted" style={{ display: 'block', marginBottom: 10 }}>
              {t('authDisplayName')}
              <input className="patient-select" style={{ width: '100%', marginTop: 6 }} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('authDisplayNamePh')} />
            </label>
          ) : null}

          <label className="small muted" style={{ display: 'block', marginBottom: 10 }}>
            {t('authAccount')}
            <input className="patient-select" style={{ width: '100%', marginTop: 6 }} value={account} onChange={(e) => setAccount(e.target.value)} placeholder={t('authAccountPh')} />
          </label>

          <label className="small muted" style={{ display: 'block', marginBottom: 12 }}>
            {t('authPassword')}
            <input type="password" className="patient-select" style={{ width: '100%', marginTop: 6 }} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('authPasswordPh')} />
          </label>

          {safeRole === 'doctor' && mode === 'register' ? (
            <div style={{ marginBottom: 12 }}>
              <label className="small muted" style={{ display: 'block', marginBottom: 8 }}>
                {t('authLicenseUploadLabel')}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? [])
                  await addLicenseFiles(files)
                  // allow selecting the same file again
                  e.currentTarget.value = ''
                }}
              />
              <div className="role-actions" style={{ justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy || licenseFiles.length >= 6}
                >
                  {t('authLicenseAddFiles')}
                </button>
                <span className="muted small">
                  {t('authLicenseMaxFiles', { count: licenseFiles.length })}
                </span>
              </div>
              {licensePreviews.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {licensePreviews.map((src, idx) => (
                    <div
                      key={`${idx}-${src.slice(0, 20)}`}
                      style={{ position: 'relative', width: 86, height: 86 }}
                    >
                      <img
                        src={src}
                        alt={t('authLicensePreview')}
                        style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 10, border: '1px solid #d2def0' }}
                      />
                      <button
                        type="button"
                        className="btn ghost"
                        aria-label={t('authRemove')}
                        onClick={() => removeLicenseAt(idx)}
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          width: 26,
                          height: 26,
                          padding: 0,
                          borderRadius: 999,
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 900,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="role-actions">
            <button type="submit" className="btn primary" disabled={busy}>
              {mode === 'login' ? t('authLoginSubmit') : t('authRegisterSubmit')}
            </button>
          </div>
        </form>

        {resolveMsgText(msg) ? <p className="small muted" style={{ marginTop: 10 }}>{resolveMsgText(msg)}</p> : null}

        {safeRole === 'doctor' && reuploadOpen && mode === 'login' ? (
          <section className="card" style={{ marginTop: 12, border: '1px solid #f1c7c7' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#7f1d1d' }}>
              {t('authReuploadTitle')}
            </h3>
            <p className="muted small" style={{ marginTop: 6 }}>
              {t('authReuploadDesc')}
            </p>
            <input
              ref={reuploadInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const f = e.target.files?.[0] ?? null
                setReuploadFile(f)
                if (f) {
                  try { setReuploadPreview(await fileToDataUrl(f)) } catch { setReuploadPreview('') }
                } else {
                  setReuploadPreview('')
                }
                e.currentTarget.value = ''
              }}
            />
            <div className="role-actions" style={{ marginTop: 8, justifyContent: 'flex-start' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => reuploadInputRef.current?.click()}
                disabled={busy}
              >
                {t('authReuploadSelectFile')}
              </button>
            </div>
            {reuploadPreview ? (
              <div style={{ marginTop: 8 }}>
                <img src={reuploadPreview} alt={t('authLicensePreview')} style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 10, border: '1px solid #f1c7c7' }} />
              </div>
            ) : null}

            <div className="role-actions" style={{ marginTop: 10, justifyContent: 'flex-start' }}>
              <button
                type="button"
                className="btn primary"
                disabled={busy || !reuploadFile || !reuploadUserId}
                onClick={async () => {
                  if (!reuploadFile || !reuploadUserId) return
                  setBusy(true)
                  try {
                    const fd = new FormData()
                    fd.append('license', reuploadFile)
                    const r = await fetch(`${BASE_URL}/users/${reuploadUserId}/license`, { method: 'PATCH', body: fd })
                    const txt = await r.text().catch(() => '')
                    if (!r.ok) throw new Error(txt || `HTTP ${r.status}`)
                    setMsg({ key: 'authReuploadSuccess' })
                    setReuploadOpen(false)
                    setReuploadFile(null)
                    setReuploadPreview('')
                  } catch (err) {
                    setMsg({ text: err instanceof Error ? err.message : String(err) })
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {t('authReuploadSubmit')}
              </button>
              {!reuploadUserId ? (
                <span className="muted small" style={{ color: '#7f1d1d' }}>
                  {t('authNoUserId')}
                </span>
              ) : null}
            </div>
          </section>
        ) : null}
      </section>
    </div>
  )
}

