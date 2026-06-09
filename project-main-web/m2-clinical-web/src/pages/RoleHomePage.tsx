import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/role-entry.css'
import { useI18n } from '../i18n/I18nContext'
import { LanguageSwitcher } from '../components/common/LanguageSwitcher'

type RoleKey = 'doctor' | 'admin'

type RoleCard = {
  key: RoleKey
  title: string
  subtitle: string
  desc: string
  points: string[]
  route: string
  action: string
}

export function RoleHomePage() {
  const { t } = useI18n()
  const changelogEntries = useMemo(
    () => [
      {
        version: '0.4.0',
        date: t('changelog040Date'),
        items: [
          t('changelog040Item1'),
          t('changelog040Item2'),
          t('changelog040Item3'),
          t('changelog040Item4'),
          t('changelog040Item5'),
        ],
      },
      {
        version: '0.3.0',
        date: t('changelog030Date'),
        items: [t('changelog030Item1'), t('changelog030Item2')],
      },
      {
        version: '0.2.1',
        date: t('changelog021Date'),
        items: [
          t('changelog021Item1'),
          t('changelog021Item2'),
          t('changelog021Item3'),
          t('changelog021Item4'),
        ],
      },
      {
        version: '0.2.0',
        date: t('changelog020Date'),
        items: [
          t('changelog020Item1'),
          t('changelog020Item2'),
          t('changelog020Item3'),
          t('changelog020Item4'),
        ],
      },
      {
        version: '0.1.0',
        date: t('changelog010Date'),
        items: [
          t('changelog010Item1'),
          t('changelog010Item2'),
          t('changelog010Item3'),
          t('changelog010Item4'),
        ],
      },
    ],
    [t],
  )
  const navigate = useNavigate()
  const [activeRole, setActiveRole] = useState<RoleCard | null>(null)
  const roleCards: RoleCard[] = [
    {
      key: 'doctor',
      title: t('roleDoctor'),
      subtitle: t('roleDoctorSubtitle'),
      desc: t('roleDoctorDesc'),
      points: [t('navTrends'), t('metricCompare'), t('navLimb')],
      route: '/auth/doctor',
      action: t('roleDoctorAction'),
    },
    {
      key: 'admin',
      title: t('roleAdmin'),
      subtitle: t('roleAdminSubtitle'),
      desc: t('roleAdminDesc'),
      points: [t('roleAdminKeyword1'), t('roleAdminKeyword2'), t('roleAdminKeyword3')],
      route: '/auth/admin',
      action: t('roleAdminAction'),
    },
  ]

  return (
    <div className="role-page role-entry-page">
      <header className="entry-hero">
        <div className="entry-tools">
          <LanguageSwitcher />
        </div>
        <div className="entry-hero-brand">
          <span className="brand-logo" aria-hidden="true">M2</span>
          <div>
            <h1>{t('roleEntryTitle')}</h1>
            <p className="entry-subtitle">{t('roleEntrySub')}</p>
          </div>
        </div>
        <p className="entry-desc">
          {t('roleEntryDesc')}
        </p>
      </header>

      <section className="role-grid role-entry-grid">
        {roleCards.map((card, idx) => (
          <article key={card.key} className={`card role-entry-card ${card.key}`} style={{ animationDelay: `${idx * 90}ms` }}>
            <div className="role-icon-wrap" aria-hidden="true">
              <span className="role-icon-core">{card.key === 'doctor' ? 'DR' : 'ADM'}</span>
            </div>
            <p className="role-en">{card.subtitle}</p>
            <h2 className="card-title">{card.title}</h2>
            <p className="role-entry-desc">{card.desc}</p>
            <div className="role-keywords">
              {card.points.map((point) => <span key={point}>{point}</span>)}
            </div>
            <button type="button" className="btn role-entry-btn" onClick={() => setActiveRole(card)}>
              {card.action}
            </button>
          </article>
        ))}
      </section>

      <section className="entry-changelog" aria-labelledby="entry-changelog-heading">
        <h2 id="entry-changelog-heading" className="entry-changelog-title">
          {t('roleChangelogTitle')}
        </h2>
        <div className="entry-changelog-body">
          {changelogEntries.length === 0 ? (
            <p className="entry-changelog-empty">{t('roleChangelogEmpty')}</p>
          ) : (
            <ul className="entry-changelog-list">
              {changelogEntries.map((entry) => (
                <li key={entry.version} className="entry-changelog-release">
                  <div className="entry-changelog-release-head">
                    <span className="entry-changelog-version">{entry.version}</span>
                    {entry.date ? <span className="entry-changelog-date">{entry.date}</span> : null}
                  </div>
                  {entry.items.length > 0 ? (
                    <ul className="entry-changelog-items">
                      {entry.items.map((line, i) => (
                        <li key={`${entry.version}-${i}`}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <footer className="entry-footer">
        <p>{t('roleFooterLine1')}</p>
        <p>{t('roleFooterLine2')}</p>
      </footer>

      {activeRole ? (
        <div className="entry-modal-mask" role="dialog" aria-modal="true">
          <div className={`entry-modal ${activeRole.key}`}>
            <h3>{activeRole.title} · {t('roleModalTitleSuffix')}</h3>
            <p>{activeRole.desc}</p>
            <ul>
              {activeRole.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
            <div className="role-actions">
              <button type="button" className="btn ghost" onClick={() => setActiveRole(null)}>
                {t('backSelect')}
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  const target = activeRole.route
                  setActiveRole(null)
                  navigate(target)
                }}
              >
                {t('confirmEnter')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
