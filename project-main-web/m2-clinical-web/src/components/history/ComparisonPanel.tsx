import { useMemo } from 'react'
import type { HistoryRecord } from '../../types/clinical'
import { useI18n } from '../../i18n/I18nContext'
import { DataSourceBadge } from '../common/DataSourceBadge'

export function ComparisonPanel({ records }: { records: HistoryRecord[] }) {
  const { t } = useI18n()
  const analysis = useMemo(() => {
    if (records.length < 2) return null
    const sorted = [...records].sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime())
    const keys = new Set<string>(); sorted.forEach((r) => Object.keys(r.metrics).forEach((k) => keys.add(k)))
    const rows: { key: string; cells: (HistoryRecord['metrics'][string] | null)[]; delta: number; dir: string }[] = []
    for (const k of keys) {
      const series = sorted.map((r) => r.metrics[k] ?? null)
      const defined = series.filter(Boolean) as HistoryRecord['metrics'][string][]
      if (defined.length < 2) continue
      const delta = defined[defined.length - 1].value - defined[0].value
      rows.push({ key: k, cells: series, delta, dir: delta > 0 ? t('dirUp') : delta < 0 ? t('dirDown') : t('dirFlat') })
    }
    return { sorted, rows }
  }, [records, t])

  if (!analysis) return <p className="muted">{t('compareSelectHint')}</p>

  return (
    <div className="comparison-panel">
      <p className="small muted">{t('compareSelectedPrefix')} {analysis.sorted.length} {t('compareSelectedSuffix')}</p>
      <div className="table-wrap">
        <table className="data-table cmp-table">
          <thead><tr><th>{t('colMetric')}</th>{analysis.sorted.map((r) => <th key={r.id}>{r.t.slice(0, 10)}</th>)}<th>{t('colDelta')}</th><th>{t('colDirection')}</th></tr></thead>
          <tbody>{analysis.rows.map((row) => (
            <tr key={row.key}>
              <td>{row.key}</td>
              {row.cells.map((c, i) => <td key={i}>{c ? <>{c.value}{c.unit} <DataSourceBadge source={c.source} /></> : '—'}</td>)}
              <td><span className={row.delta > 0 ? 'delta-pos' : row.delta < 0 ? 'delta-neg' : ''}>{row.delta > 0 ? '+' : ''}{row.delta}</span></td>
              <td><span className={row.dir === t('dirUp') ? 'cmp-up' : row.dir === t('dirDown') ? 'cmp-down' : 'cmp-flat'}>{row.dir}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
