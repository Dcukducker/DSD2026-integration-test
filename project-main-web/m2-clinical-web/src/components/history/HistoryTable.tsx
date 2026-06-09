import type { HistoryRecord } from '../../types/clinical'
import { useI18n } from '../../i18n/I18nContext'
import { DataSourceBadge } from '../common/DataSourceBadge'

export function HistoryTable({ rows, selectedIds, onToggle }: { rows: HistoryRecord[]; selectedIds: Set<string>; onToggle: (id: string, checked: boolean) => void }) {
  const { t } = useI18n()
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr><th className="th-check">{t('colCompare')}</th><th>{t('colTime')}</th><th>{t('colType')}</th><th>{t('colTitle')}</th><th>{t('colSummary')}</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            <td><input type="checkbox" checked={selectedIds.has(r.id)} onChange={(e) => onToggle(r.id, e.target.checked)} aria-label={t('ariaChooseForCompare').replace('{title}', r.title)} /></td>
            <td>{r.t.replace('T', ' ').slice(0, 16)}</td>
            <td><span className={r.type === 'assessment' ? 'tag tag-blue' : 'tag tag-gray'}>{r.type === 'assessment' ? t('typeAssessment') : t('typeTraining')}</span></td>
            <td>{r.title}</td><td className="td-summary">{r.summary}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export function HistoryMetricsPreview({ record }: { record: HistoryRecord }) {
  return <ul className="metric-inline-list">{Object.entries(record.metrics).map(([k, m]) => <li key={k}><span className="muted">{k}</span> <b>{m.value}{m.unit}</b> <DataSourceBadge source={m.source} /></li>)}</ul>
}
