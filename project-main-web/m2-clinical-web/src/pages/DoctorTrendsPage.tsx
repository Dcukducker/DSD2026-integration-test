import { TrendChart } from '../components/charts/TrendChart'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { LoadingBlock } from '../components/common/LoadingBlock'
import { useDoctorTrendsViewModel } from '../viewmodels/useDoctorTrendsViewModel'

export function DoctorTrendsPage() {
  const vm = useDoctorTrendsViewModel()

  return (
    <div className="page doctor-workspace-page">
      <header className="page-header">
        <div>
          <h1>{vm.t('navTrends')}</h1>
          <p className="muted">{vm.t('trendsDesc')}</p>
        </div>
        <div className="range-toggle" role="group" aria-label={vm.t('timeRange')}>
          {([['week', vm.t('week')], ['month', vm.t('month')], ['all', vm.t('all')]] as const).map(
            ([k, lab]) => (
              <button
                key={k}
                type="button"
                className={`btn ${vm.range === k ? 'primary' : 'ghost'}`}
                onClick={() => vm.setRange(k)}
              >
                {lab}
              </button>
            ),
          )}
        </div>
      </header>
      {vm.err ? <ErrorBanner message={vm.err} onRetry={() => void vm.reload()} /> : null}
      {vm.loading ? (
        <LoadingBlock label={vm.t('loadingTrends')} />
      ) : (
        <section className="card">
          <TrendChart seriesList={vm.series} events={vm.events} height={440} />
          <p className="muted small chart-footnote">{vm.t('trendsFoot')}</p>
        </section>
      )}
    </div>
  )
}
