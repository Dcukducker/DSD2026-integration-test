/** 数据来源：实测设备 / AI 推断 */
export type DataSource = 'measured' | 'ai_inferred'

export type TimeRangePreset = 'week' | 'month' | 'all'

export interface MetricDefinition {
  key: string
  label: string
  unit: string
  /** 临床正常参考区间（展示用，非诊断结论） */
  referenceRange?: { min: number; max: number }
}

export interface TrendPoint {
  t: string // ISO date
  value: number
  source: DataSource
  /** 后端或规则标定的可疑点 */
  isAnomaly?: boolean
  anomalyNote?: string
}

export interface TrendSeries {
  metricKey: string
  points: TrendPoint[]
}

export interface ClinicalEvent {
  id: string
  t: string
  label: string
  type: 'surgery' | 'assessment' | 'milestone' | 'other'
  description?: string
}

export type SessionType = 'training' | 'assessment'

export interface HistoryRecord {
  id: string
  t: string
  type: SessionType
  title: string
  summary: string
  metrics: Record<string, { value: number; unit: string; source: DataSource }>
}

export interface LimbSegment {
  id: string
  label: string
  /** 热力强度 0–1 */
  heat: number
  /** 相对父段的关节角度（度），展示用 */
  angleDeg?: number
}

export interface LimbModelState {
  patientId: string
  updatedAt: string
  segments: LimbSegment[]
  caption: string
  dataMixNote: string
}

export interface PatientSummary {
  id: string
  displayName: string
  limbSide: 'left' | 'right'
  diagnosisShort: string
}
