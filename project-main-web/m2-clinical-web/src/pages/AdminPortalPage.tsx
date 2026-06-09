import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/devops-console.css'
import { useI18n } from '../i18n/I18nContext'
import { LanguageSwitcher } from '../components/common/LanguageSwitcher'
import { LogoutConfirmModal } from '../components/common/LogoutConfirmModal'
import { adminApiService } from '../services/adminApiService'
import { feedbackApiService } from '../services/feedbackApiService'
import { announcementsApiService } from '../services/announcementsApiService'
import { auditLogsApiService } from '../services/auditLogsApiService'
import { AnnouncementFormModal } from '../components/admin/AnnouncementFormModal'
import { UserEditModal } from '../components/admin/UserEditModal'
import {
  auditLogActor,
  auditLogTarget,
  formatAuditLogDetails,
} from '../utils/formatAuditLog'
import type {
  AnnouncementStatus,
  ApiAnnouncement,
  ApiAuditLog,
  ApiFeedback,
  ApiPatient,
  ApiSession,
  ApiUserRole,
  ApiUserStatus,
  FeedbackStatus,
} from '../types/api'
import { authStore } from '../services/authStore'

type AdminTab = 'registration' | 'accounts' | 'reports' | 'feedback' | 'announcements'
type FeedbackFilter = 'all' | FeedbackStatus
type AnnouncementFilter = 'all' | AnnouncementStatus

export function AdminPortalPage() {
  const { t } = useI18n()
  const navigate = useNavigate()

  const [logoutOpen, setLogoutOpen] = useState(false)

  function logout() {
    authStore.clearToken()
    navigate('/roles')
  }

  const [activeTab, setActiveTab] = useState<AdminTab>('registration')
  const [apiPending, setApiPending] = useState<ApiPatient[]>([])
  const [apiPendingLoading, setApiPendingLoading] = useState(false)
  const [apiPendingErr, setApiPendingErr] = useState('')
  const [stats, setStats] = useState<{ activeDoctors: number; patientsTracked: number; activeSessions: number }>({
    activeDoctors: 0,
    patientsTracked: 0,
    activeSessions: 0,
  })
  const [apiUsers, setApiUsers] = useState<ApiPatient[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersErr, setUsersErr] = useState('')
  const [editingUser, setEditingUser] = useState<ApiPatient | null>(null)
  const [userEditOpen, setUserEditOpen] = useState(false)
  const [feedbackList, setFeedbackList] = useState<ApiFeedback[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackErr, setFeedbackErr] = useState('')
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>('all')
  const [announcementList, setAnnouncementList] = useState<ApiAnnouncement[]>([])
  const [announcementLoading, setAnnouncementLoading] = useState(false)
  const [announcementErr, setAnnouncementErr] = useState('')
  const [announcementFilter, setAnnouncementFilter] = useState<AnnouncementFilter>('all')
  const [announcementFormOpen, setAnnouncementFormOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<ApiAnnouncement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [licenseViewer, setLicenseViewer] = useState<{
    name: string
    account: string
    images: string[]
  } | null>(null)
  const [licenseObjectUrls, setLicenseObjectUrls] = useState<string[]>([])
  const [apiAuditLogs, setApiAuditLogs] = useState<ApiAuditLog[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditErr, setAuditErr] = useState('')

  const loadFeedback = useCallback(async () => {
    setFeedbackLoading(true)
    setFeedbackErr('')
    try {
      const list =
        feedbackFilter === 'all'
          ? await feedbackApiService.listFeedback()
          : await feedbackApiService.listFeedback(feedbackFilter)
      const sorted = [...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      setFeedbackList(sorted)
    } catch (err: unknown) {
      setFeedbackErr(err instanceof Error ? err.message : t('adminFeedbackLoadErr'))
    } finally {
      setFeedbackLoading(false)
    }
  }, [feedbackFilter, t])

  useEffect(() => {
    void loadFeedback()
  }, [loadFeedback])

  const loadAnnouncements = useCallback(async () => {
    setAnnouncementLoading(true)
    setAnnouncementErr('')
    try {
      const list =
        announcementFilter === 'all'
          ? await announcementsApiService.listAnnouncements()
          : await announcementsApiService.listAnnouncements(announcementFilter)
      setAnnouncementList(
        [...list].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      )
    } catch (err: unknown) {
      setAnnouncementErr(err instanceof Error ? err.message : t('adminAnnouncementLoadErr'))
    } finally {
      setAnnouncementLoading(false)
    }
  }, [announcementFilter, t])

  useEffect(() => {
    if (activeTab === 'announcements') void loadAnnouncements()
  }, [activeTab, loadAnnouncements])

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true)
    setAuditErr('')
    try {
      setApiAuditLogs(await auditLogsApiService.listAuditLogs())
    } catch (err: unknown) {
      setAuditErr(err instanceof Error ? err.message : t('adminAuditLoadErr'))
    } finally {
      setAuditLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (activeTab === 'reports') void loadAuditLogs()
  }, [activeTab, loadAuditLogs])

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    setUsersErr('')
    try {
      setApiUsers(await adminApiService.listAllUsers())
    } catch (err: unknown) {
      setUsersErr(err instanceof Error ? err.message : t('adminUsersLoadErr'))
    } finally {
      setUsersLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (activeTab === 'accounts') void loadUsers()
  }, [activeTab, loadUsers])

  function exportAuditReport() {
    const blob = new Blob([JSON.stringify(apiAuditLogs, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Load API-side pending clinicians on first render
  useEffect(() => {
    setApiPendingLoading(true)
    Promise.all([
      adminApiService.listPendingClinicians(),
      adminApiService.listAllUsers(),
      adminApiService.listPatients(),
      adminApiService.listAllSessions(),
    ])
      .then(([pending, users, patients, sessions]) => {
        setApiPending(pending)
        setApiPendingErr('')
        const activeDoctors = users.filter((u) => u.role === 'clinician' && u.status === 'active').length
        const activeSessions = (sessions as ApiSession[]).filter((s) => s.ended_at == null).length
        setStats({
          activeDoctors,
          patientsTracked: patients.length,
          activeSessions,
        })
      })
      .catch((err: unknown) => setApiPendingErr(err instanceof Error ? err.message : String(err)))
      .finally(() => setApiPendingLoading(false))
  }, [])

  async function approveApiClinician(user: ApiPatient) {
    try {
      await adminApiService.approveClinician(user.id)
      setApiPending(prev => prev.filter(u => u.id !== user.id))
      void loadUsers()
      void loadAuditLogs()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    }
  }

  async function rejectApiClinician(user: ApiPatient) {
    try {
      await adminApiService.rejectClinician(user.id)
      setApiPending(prev => prev.filter(u => u.id !== user.id))
      void loadUsers()
      void loadAuditLogs()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    }
  }

  async function viewApiLicense(user: ApiPatient) {
    try {
      // clear old blob urls
      licenseObjectUrls.forEach((u) => URL.revokeObjectURL(u))
      setLicenseObjectUrls([])

      const res = await adminApiService.getUserLicense(user.id)
      if (res.status === 404) {
        window.alert(t('adminLicenseNoFile'))
        return
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`[API] GET /users/${user.id}/license → ${res.status}: ${body}`)
      }

      const ct = res.headers.get('content-type') ?? ''
      if (ct.includes('application/pdf')) {
        window.alert(t('adminLicensePdf'))
        return
      }
      if (!ct.startsWith('image/')) {
        window.alert(t('adminLicenseUnsupported', { type: ct || 'unknown' }))
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setLicenseObjectUrls([url])
      setLicenseViewer({ name: user.name, account: user.email, images: [url] })
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    }
  }

  function userRoleLabel(role: ApiUserRole): string {
    if (role === 'patient') return t('adminRolePatient')
    if (role === 'clinician') return t('adminRoleDoctor')
    return t('adminRoleAdminLabel')
  }

  function userStatusLabel(status: ApiUserStatus): string {
    if (status === 'active') return t('adminStatusActive')
    if (status === 'pending') return t('adminStatusPending')
    if (status === 'rejected') return t('adminStatusRejected')
    return t('adminStatusDisabled')
  }

  function userStatusClass(status: ApiUserStatus): string {
    if (status === 'active') return 'pass'
    if (status === 'pending') return 'idle'
    return 'fail'
  }

  function feedbackStatusLabel(status: FeedbackStatus): string {
    if (status === 'pending') return t('adminFeedbackStatusPending')
    if (status === 'reviewed') return t('adminFeedbackStatusReviewed')
    return t('adminFeedbackStatusResolved')
  }

  function announcementStatusLabel(status: AnnouncementStatus): string {
    return status === 'published'
      ? t('adminAnnouncementStatusPublished')
      : t('adminAnnouncementStatusDraft')
  }

  async function toggleAnnouncementStatus(row: ApiAnnouncement) {
    const next: AnnouncementStatus = row.status === 'published' ? 'draft' : 'published'
    try {
      await announcementsApiService.updateAnnouncement(row.id, { status: next })
      await loadAnnouncements()
      void loadAuditLogs()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    }
  }

  async function deleteAnnouncement(row: ApiAnnouncement) {
    if (!window.confirm(t('adminAnnouncementDeleteConfirm'))) return
    try {
      await announcementsApiService.deleteAnnouncement(row.id)
      await loadAnnouncements()
      void loadAuditLogs()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    }
  }

  async function updateFeedbackStatus(id: number, status: FeedbackStatus) {
    try {
      await feedbackApiService.updateFeedback(id, { status })
      await loadFeedback()
      void loadAuditLogs()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    }
  }

  const filteredUsers = apiUsers.filter((u) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.includes(q) ||
      userRoleLabel(u.role).toLowerCase().includes(q) ||
      userStatusLabel(u.status).toLowerCase().includes(q)
    )
  })

  const pendingCount = apiPending.length
  const pendingFeedbackCount = feedbackList.filter((f) => f.status === 'pending').length

  const tabs: Array<{ key: AdminTab; label: string; badge?: number }> = [
    { key: 'registration', label: t('adminTabRegistration'), badge: pendingCount },
    { key: 'accounts', label: t('adminTabAccounts') },
    { key: 'reports', label: t('adminTabReports') },
    { key: 'feedback', label: t('adminTabFeedback'), badge: pendingFeedbackCount },
    { key: 'announcements', label: t('adminTabAnnouncements') },
  ]

  return (
    <div className="role-page portal-page developer-portal devops-console">
      <header className="portal-hero dev-hero devops-hero">
        <div className="hero-main">
          <p className="hero-kicker">{t('adminHeroKicker')}</p>
          <h1>{t('adminHeroTitle')}</h1>
          <p className="hero-desc">{t('adminHeroDesc')}</p>
          <div className="hero-chips">
            <span className="hero-chip">{t('adminChipPending', { count: pendingCount })}</span>
            <span className="hero-chip">{t('adminChipDoctors', { count: stats.activeDoctors })}</span>
            <span className="hero-chip">{t('adminFeedbackPendingChip')} {pendingFeedbackCount}</span>
          </div>
        </div>
        <div className="hero-side">
          <p className="muted small">{t('adminPatientsTracked')}</p>
          <p className="hero-id">{stats.patientsTracked}</p>
          <p className="muted small">{t('adminActiveSessions')}: {stats.activeSessions}</p>
          <div className="role-actions" style={{ marginTop: '0.6rem' }}>
            <button type="button" className="btn ghost role-link" onClick={() => setLogoutOpen(true)}>{t('logout')}</button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <section className="card devops-tabbar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`btn ${activeTab === tab.key ? 'primary' : 'ghost'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0
              ? <span style={{ marginLeft: '0.35rem', background: '#e53e3e', color: '#fff', borderRadius: '999px', padding: '0 0.4rem', fontSize: '0.72rem', fontWeight: 700 }}>{tab.badge}</span>
              : null}
          </button>
        ))}
      </section>

      {/* ── Registration Review ── */}
      {activeTab === 'registration' ? (
        <section className="card">
          <h2 className="card-title">{t('adminRegTitle')}</h2>
          <p className="muted small">{t('adminRegDesc')}</p>
          {/* ── API-side pending clinicians ── */}
          <div style={{ marginTop: '1rem' }}>
            <p className="small muted" style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
              {t('adminPendingRegistrations')}
            </p>
            {apiPendingLoading ? (
              <p className="muted small">{t('loading')}</p>
            ) : apiPendingErr ? (
              <p className="muted small" style={{ color: '#c53030' }}>{apiPendingErr}</p>
            ) : apiPending.length === 0 ? (
              <p className="muted small">{t('adminNoPendingApi')}</p>
            ) : (
              <div className="task-list">
                {apiPending.map(user => (
                  <article key={user.id} className="task-row precheck-row">
                    <div className="task-main">
                      <p className="task-title applicant-name">{user.name}</p>
                      <p className="muted small">{user.email} · ID #{user.id} · {t('adminJoined')} {user.created_at.slice(0, 10)}</p>
                    </div>
                    <div className="role-actions">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => void viewApiLicense(user)}
                      >
                        {t('adminViewLicense')}
                      </button>
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => void approveApiClinician(user)}
                      >
                        {t('adminApprove')}
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => void rejectApiClinician(user)}
                      >
                        {t('adminReject')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {licenseViewer ? (
        <div className="entry-modal-mask" role="dialog" aria-modal="true">
          <div className="entry-modal" style={{ width: 'min(95vw, 860px)' }}>
            <h3 style={{ margin: 0, color: '#0f2a4e' }}>
              {t('adminLicenseTitle')}
            </h3>
            <p className="muted small" style={{ marginTop: 6 }}>
              {licenseViewer.name} · {licenseViewer.account}
            </p>
            {licenseViewer.images.length === 0 ? (
              <p className="muted">{t('adminNoLicenseImages')}</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 10 }}>
                {licenseViewer.images.map((src, idx) => (
                  <a key={`${idx}-${src.slice(0, 18)}`} href={src} target="_blank" rel="noreferrer">
                    <img
                      src={src}
                      alt={t('adminLicenseImageAlt')}
                      style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 12, border: '1px solid #d2def0' }}
                    />
                  </a>
                ))}
              </div>
            )}
            <div className="role-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  licenseObjectUrls.forEach((u) => URL.revokeObjectURL(u))
                  setLicenseObjectUrls([])
                  setLicenseViewer(null)
                }}
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Accounts & Roles ── */}
      {activeTab === 'accounts' ? (
        <section className="card">
          <h2 className="card-title">{t('adminAccountsTitle')}</h2>
          <div className="role-actions" style={{ marginBottom: '0.8rem', flexWrap: 'wrap' }}>
            <input
              className="patient-select"
              style={{ flex: 1, minWidth: 200, maxWidth: 420 }}
              placeholder={t('adminSearchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className="btn ghost"
              onClick={() => void loadUsers()}
              disabled={usersLoading}
            >
              {t('refresh')}
            </button>
          </div>
          {usersLoading ? (
            <p className="muted small">{t('loading')}</p>
          ) : usersErr ? (
            <p className="muted small" style={{ color: '#c53030' }}>{usersErr}</p>
          ) : filteredUsers.length === 0 ? (
            <p className="muted small">{t('adminUsersEmpty')}</p>
          ) : (
            <div className="task-list">
              {filteredUsers.map((u) => (
                <article key={u.id} className="task-row">
                  <div className="task-main">
                    <p className="task-title">
                      {u.name}
                      <span className="muted small" style={{ marginLeft: '0.5rem' }}>
                        [{userRoleLabel(u.role)}]
                      </span>
                    </p>
                    <p className="muted small">
                      {u.email} · ID #{u.id}
                      {u.age != null ? ` · ${t('adminUserAgeLabel')} ${u.age}` : ''}
                      {' · '}
                      {t('adminJoined')} {u.created_at.slice(0, 10)}
                    </p>
                  </div>
                  <div className="role-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <span className={`check-state ${userStatusClass(u.status)}`}>
                      {userStatusLabel(u.status)}
                    </span>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        setEditingUser(u)
                        setUserEditOpen(true)
                      }}
                    >
                      {t('adminEditUser')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* ── Reports & Audit ── */}
      {activeTab === 'reports' ? (
        <>
          <section className="portal-kpi-grid premium-grid">
            {([
              { label: t('adminStatActiveDoctors'), value: stats.activeDoctors, foot: t('adminStatRealtime') },
              { label: t('adminStatActiveSessions'), value: stats.activeSessions, foot: t('adminStatRealtime') },
              { label: t('adminStatPatientsTracked'), value: stats.patientsTracked, foot: t('adminStatRealtime') },
            ] as const).map(stat => (
              <article key={stat.label} className="card portal-stat">
                <p className="stat-label">{stat.label}</p>
                <p className="stat-value">{stat.value}</p>
                <p className="stat-foot muted">{stat.foot}</p>
              </article>
            ))}
          </section>

          <section className="card">
            <h2 className="card-title">{t('adminAuditTitle')}</h2>
            <p className="muted small" style={{ marginBottom: '0.6rem' }}>
              {t('adminAuditDesc')}
            </p>
            <div className="role-actions" style={{ marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => void loadAuditLogs()}
                disabled={auditLoading}
              >
                {t('refresh')}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={exportAuditReport}
                disabled={apiAuditLogs.length === 0}
              >
                {t('adminExportAudit')}
              </button>
            </div>
            {auditLoading ? (
              <p className="muted small">{t('loading')}</p>
            ) : auditErr ? (
              <p className="muted small" style={{ color: '#c53030' }}>{auditErr}</p>
            ) : apiAuditLogs.length === 0 ? (
              <p className="muted small">{t('adminAuditEmpty')}</p>
            ) : (
              <div className="task-list audit-log-list">
                {apiAuditLogs.map((log) => {
                  const detailText = formatAuditLogDetails(log.details)
                  return (
                    <article key={log.id} className="task-row">
                      <div className="task-main" style={{ flex: 1 }}>
                        <p className="task-title" style={{ margin: 0, fontSize: '0.92rem' }}>
                          {log.action}
                        </p>
                        <p className="muted small">
                          #{log.id}
                          {' · '}
                          {new Date(log.created_at).toLocaleString()}
                          {' · '}
                          {auditLogActor(log)}
                          {' · '}
                          {auditLogTarget(log)}
                        </p>
                        {detailText ? (
                          <p className="small muted" style={{ marginTop: '0.3rem' }}>
                            {detailText}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </>
      ) : null}

      {/* ── User Feedback (UC-M2-ADMIN-06) ── */}
      {activeTab === 'feedback' ? (
        <section className="card">
          <h2 className="card-title">{t('adminFeedbackTitle')}</h2>
          <div className="role-actions" style={{ marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {(['all', 'pending', 'reviewed', 'resolved'] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={`btn ${feedbackFilter === key ? 'primary' : 'ghost'}`}
                onClick={() => setFeedbackFilter(key)}
              >
                {key === 'all'
                  ? t('adminFeedbackFilterAll')
                  : key === 'pending'
                    ? t('adminFeedbackFilterPending')
                    : key === 'reviewed'
                      ? t('adminFeedbackFilterReviewed')
                      : t('adminFeedbackFilterResolved')}
              </button>
            ))}
            <button type="button" className="btn ghost" onClick={() => void loadFeedback()} disabled={feedbackLoading}>
              {t('refresh')}
            </button>
          </div>
          {feedbackLoading ? (
            <p className="muted small">{t('loading')}</p>
          ) : feedbackErr ? (
            <p className="muted small" style={{ color: '#c53030' }}>{feedbackErr}</p>
          ) : feedbackList.length === 0 ? (
            <p className="muted small">{t('adminFeedbackEmpty')}</p>
          ) : (
            <div className="task-list">
              {feedbackList.map((fb) => (
                <article
                  key={fb.id}
                  className={`task-row feedback-row ${fb.status === 'pending' ? 'precheck-row' : ''}`}
                >
                  <div className="task-main" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <p className="task-title" style={{ margin: 0 }}>#{fb.id}</p>
                      <span className={`check-state ${fb.status === 'resolved' ? 'pass' : fb.status === 'reviewed' ? 'idle' : 'fail'}`}>
                        {feedbackStatusLabel(fb.status)}
                      </span>
                    </div>
                    <p className="muted small">
                      {t('adminFeedbackFrom')}: {fb.user_name ?? `#${fb.user_id}`}
                      {fb.user_email ? ` · ${fb.user_email}` : ''}
                      {' · '}
                      {new Date(fb.created_at).toLocaleString()}
                    </p>
                    <p className="small" style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap' }}>{fb.content}</p>
                  </div>
                  {fb.status !== 'resolved' ? (
                    <div className="role-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      {fb.status === 'pending' ? (
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => void updateFeedbackStatus(fb.id, 'reviewed')}
                        >
                          {t('adminFeedbackMarkReviewed')}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => void updateFeedbackStatus(fb.id, 'resolved')}
                      >
                        {t('adminFeedbackMarkResolved')}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'announcements' ? (
        <section className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>{t('adminAnnouncementsTitle')}</h2>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setEditingAnnouncement(null)
                setAnnouncementFormOpen(true)
              }}
            >
              {t('adminAnnouncementAdd')}
            </button>
          </div>
          <div className="role-actions" style={{ marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {(['all', 'draft', 'published'] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={`btn ${announcementFilter === key ? 'primary' : 'ghost'}`}
                onClick={() => setAnnouncementFilter(key)}
              >
                {key === 'all'
                  ? t('adminAnnouncementFilterAll')
                  : key === 'draft'
                    ? t('adminAnnouncementFilterDraft')
                    : t('adminAnnouncementFilterPublished')}
              </button>
            ))}
            <button
              type="button"
              className="btn ghost"
              onClick={() => void loadAnnouncements()}
              disabled={announcementLoading}
            >
              {t('refresh')}
            </button>
          </div>
          {announcementLoading ? (
            <p className="muted small">{t('loading')}</p>
          ) : announcementErr ? (
            <p className="muted small" style={{ color: '#c53030' }}>{announcementErr}</p>
          ) : announcementList.length === 0 ? (
            <p className="muted small">{t('adminAnnouncementEmpty')}</p>
          ) : (
            <div className="task-list">
              {announcementList.map((ann) => (
                <article
                  key={ann.id}
                  className={`task-row ${ann.status === 'draft' ? 'precheck-row' : ''}`}
                >
                  <div className="task-main" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <p className="task-title" style={{ margin: 0 }}>{ann.title}</p>
                      <span className={`check-state ${ann.status === 'published' ? 'pass' : 'idle'}`}>
                        {announcementStatusLabel(ann.status)}
                      </span>
                    </div>
                    <p className="muted small">
                      #{ann.id}
                      {ann.created_by_name ? ` · ${ann.created_by_name}` : ''}
                      {' · '}
                      {new Date(ann.created_at).toLocaleString()}
                    </p>
                    <p className="small" style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap' }}>
                      {ann.content}
                    </p>
                  </div>
                  <div className="role-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        setEditingAnnouncement(ann)
                        setAnnouncementFormOpen(true)
                      }}
                    >
                      {t('adminAnnouncementEdit')}
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => void toggleAnnouncementStatus(ann)}
                    >
                      {ann.status === 'published'
                        ? t('adminAnnouncementUnpublish')
                        : t('adminAnnouncementPublish')}
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ color: '#c53030' }}
                      onClick={() => void deleteAnnouncement(ann)}
                    >
                      {t('adminAnnouncementDelete')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <LogoutConfirmModal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={logout}
      />
      <AnnouncementFormModal
        open={announcementFormOpen}
        editing={editingAnnouncement}
        onClose={() => {
          setAnnouncementFormOpen(false)
          setEditingAnnouncement(null)
        }}
        onSaved={() => {
          void loadAnnouncements()
          void loadAuditLogs()
        }}
      />
      <UserEditModal
        open={userEditOpen}
        user={editingUser}
        onClose={() => {
          setUserEditOpen(false)
          setEditingUser(null)
        }}
        onSaved={() => {
          void loadUsers()
          void loadAuditLogs()
          void adminApiService.listPendingClinicians().then(setApiPending).catch(() => {})
        }}
      />
    </div>
  )
}
