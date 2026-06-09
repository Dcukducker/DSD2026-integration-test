import { NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nContext'

export function Sidebar({ patientId }: { patientId: string }) {
  const { t } = useI18n()

  // Patient sub-pages shown in the sidebar (3D is hidden per design)
  const patientItems = [
    { to: `sessions`,  label: t('navSessions') },
    // clinical / trends / history temporarily hidden per request
  ] as const

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">M2</span>
        <div>
          <div className="brand-title">{t('appTitle')}</div>
          <div className="brand-sub muted small">{t('appSubtitle')}</div>
        </div>
      </div>
      <nav className="nav" aria-label={t('navMain')}>
        {/* Patient list — always first */}
        <NavLink
          to="/doctor/patients"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          {t('navPatientList')}
        </NavLink>

        {/* Per-patient pages */}
        {patientItems.map((it) => (
          <NavLink
            key={it.to}
            to={`/doctor/p/${patientId}/${it.to}`}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {it.label}
          </NavLink>
        ))}
      </nav>
      <footer className="sidebar-foot muted small">
        {t('sidebarFooter')} <code>src/services/</code>
      </footer>
    </aside>
  )
}
