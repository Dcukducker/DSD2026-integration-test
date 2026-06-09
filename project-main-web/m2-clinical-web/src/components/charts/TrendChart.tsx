import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import { useI18n } from '../../i18n/I18nContext'
import type { ClinicalEvent, TrendPoint, TrendSeries } from '../../types/clinical'

function splitBySource(points: TrendPoint[]) {
  const measured: [string, number][] = []; const ai: [string, number][] = []
  for (const p of points) { const pair: [string, number] = [p.t, p.value]; if (p.source === 'measured') measured.push(pair); else ai.push(pair) }
  return { measured, ai }
}
const dimColor = (hex: string, alpha: number) => echarts.color.modifyAlpha(hex, alpha) as string

export function TrendChart({ seriesList, events, height = 420 }: { seriesList: TrendSeries[]; events: ClinicalEvent[]; height?: number }) {
  const { t, locale } = useI18n()
  const option = useMemo(() => {
    const dateFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
    const labels: Record<string, string> = {
      knee_flexion_rom: locale === 'en' ? 'Knee flexion ROM' : locale === 'pt-BR' ? 'ADM flexão de joelho' : '膝关节屈曲 ROM',
      quadriceps_mmt: locale === 'en' ? 'Quadriceps MMT' : locale === 'pt-BR' ? 'MMT quadríceps' : '股四头肌 MMT',
    }
    const series: echarts.LineSeriesOption[] = []; const legendData: string[] = []
    const markLineData = events.map((e) => ({ xAxis: e.t, label: { show: true, formatter: e.label, position: 'end' as const }, lineStyle: { type: 'dashed' as const, opacity: 0.75 } }))
    const baseline = (metricKey: string) => {
      if (metricKey === 'knee_flexion_rom') return [{ yAxis: 120, name: 'ROM达标基线' }]
      if (metricKey === 'quadriceps_mmt') return [{ yAxis: 4, name: '肌力达标阈值' }]
      if (metricKey === 'pain_score') return [{ yAxis: 3, name: 'VAS控制线' }]
      return []
    }
    seriesList.forEach((s, idx) => {
      const { measured, ai } = splitBySource(s.points)
      const colorBase = idx === 0 ? '#2563eb' : '#0d9488'
      const nameM = `${labels[s.metricKey] ?? s.metricKey} (${t('trendMeasured')})`
      const nameA = `${labels[s.metricKey] ?? s.metricKey} (${t('trendAi')})`
      legendData.push(nameM, nameA)
      const anomalyPoints = s.points.filter((p) => p.isAnomaly).map((p) => ({ name: t('anomaly'), coord: [p.t, p.value] as [string, number], value: '!', itemStyle: { color: '#dc2626' }, label: { show: true, formatter: '!', color: '#fff' } }))
      const combinedLines = [...(idx === 0 ? markLineData : []), ...baseline(s.metricKey)]
      series.push({ name: nameM, type: 'line', smooth: true, sampling: 'lttb', showSymbol: measured.length < 48, symbolSize: 6, data: measured, itemStyle: { color: colorBase }, lineStyle: { width: 2 }, markLine: combinedLines.length ? { symbol: 'none', data: combinedLines } : undefined, markPoint: anomalyPoints.length ? { data: anomalyPoints } : undefined })
      series.push({ name: nameA, type: 'line', smooth: true, sampling: 'lttb', showSymbol: ai.length < 48, symbolSize: 5, data: ai, itemStyle: { color: dimColor(colorBase, 0.45) }, lineStyle: { type: 'dashed', width: 1.5 } })
    })
    const anomalyByDate = new Map<string, string>(); for (const s of seriesList) for (const p of s.points) if (p.isAnomaly && p.anomalyNote) anomalyByDate.set(p.t, p.anomalyNote)
    return {
      animationDuration: 400,
      tooltip: { trigger: 'axis', confine: true, formatter: (params: unknown) => { const arr = params as { axisValue: string; marker: string; seriesName: string; value: [string, number] | number }[]; if (!arr?.length) return ''; const date = arr[0].axisValue; const showDate = dateFmt.format(new Date(date)); const lines = [`<div class="ec-tip-title">${showDate}</div>`]; for (const it of arr) { const v = Array.isArray(it.value) ? it.value[1] : it.value; lines.push(`<div>${it.marker} ${it.seriesName}: <b>${v}</b></div>`) } const note = anomalyByDate.get(date); if (note) lines.push(`<div class="ec-tip-warn">${t('anomalyTip')}: ${note}</div>`); return lines.join('') } },
      legend: { data: legendData, type: 'scroll', top: 0 },
      grid: { left: 56, right: 28, top: 48, bottom: 72 },
      xAxis: { type: 'time', axisLabel: { hideOverlap: true, formatter: (value: number) => dateFmt.format(new Date(value)) }, splitLine: { show: false } },
      yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', opacity: 0.35 } } },
      dataZoom: [{ type: 'inside', filterMode: 'weakFilter' }, { type: 'slider', bottom: 16, height: 22, filterMode: 'weakFilter' }],
      series,
    } as echarts.EChartsOption
  }, [seriesList, events, locale, t])

  return (
    <div className="trend-chart-wrap">
      <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate opts={{ renderer: 'canvas' }} />
      {events.length ? <ul className="event-legend muted small">{events.map((e) => <li key={e.id}><span className={`ev-dot ev-${e.type}`} />{e.t} {e.label}</li>)}</ul> : null}
    </div>
  )
}
