/** API data types matching the backend at dsd2026-teamv2-production.up.railway.app */

export type ApiUserRole = 'patient' | 'clinician' | 'admin'
export type ApiUserStatus = 'active' | 'pending' | 'rejected' | 'disabled'

export type ApiPatient = {
  id: number
  name: string
  email: string
  role: ApiUserRole
  age: number | null
  status: ApiUserStatus
  created_at: string
}

export type UpdateUserInput = {
  name?: string
  age?: number | null
  role?: ApiUserRole
  status?: ApiUserStatus
}

export type ApiSession = {
  id: number
  user_id: number
  started_at: string
  ended_at: string | null
  user_name: string
  measurement_count: number
}

export type ApiJointAngle = {
  timestamp: string
  angleID: string
  angle: number
}

/** Normalized shape used in the app after GET /measurements/:sessionId (backend may send snake_case). */
export type ApiMeasurement = {
  id: number
  sessionId: number
  /** Per-sample row time from the API when present */
  timestamp?: string
  /**
   * Canonical joint samples. Wire payloads may use `joint_angles` or `targetAngles`;
   * use `extractJointAnglesFromMeasurement` or `patientApiService.listMeasurements` so both work.
   */
  targetAngles: ApiJointAngle[]
  errors: unknown[]
  sensorData: unknown[]
  isCorrect?: boolean
}

export type ApiSessionRecommendation = {
  id: number
  session_id: number
  movement: string
  confidence: number
  created_at: string
  notes?: string
}

export type ApiEngineSuggestion = {
  joint: string
  accuracy_percent: number
  total_measurements: number
  priority: 'high' | 'medium' | 'low'
  suggestion: string
}

export type ApiEngineRecommendation = {
  userId: number
  sessions_analysed: number
  generated_at: string
  suggestions: ApiEngineSuggestion[]
}

export type ApiScheduleItem = {
  id: number
  user_id: number
  exercise: string
  date: string
  duration: number
  notes: string
  status: 'pending' | 'completed' | 'skipped'
  created_at?: string
}

export type CreateScheduleInput = {
  userId: number
  exercise: string
  date: string
  duration: number
  notes: string
}

export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved'

export type ApiFeedback = {
  id: number
  user_id: number
  content: string
  status: FeedbackStatus
  response: string | null
  created_at: string
  updated_at: string | null
  user_name?: string
  user_email?: string
}

export type CreateFeedbackInput = {
  userId: number
  content: string
}

export type UpdateFeedbackInput = {
  status?: FeedbackStatus
  response?: string
}

export type AnnouncementStatus = 'draft' | 'published'

export type ApiAnnouncement = {
  id: number
  title: string
  content: string
  status: AnnouncementStatus
  created_by: number
  created_at: string
  updated_at: string | null
  created_by_name?: string
}

export type CreateAnnouncementInput = {
  title: string
  content: string
  createdBy: number
}

export type UpdateAnnouncementInput = {
  title?: string
  content?: string
  status?: AnnouncementStatus
}

export type AuditLogQuery = {
  userId?: number
  action?: string
  targetType?: string
}

export type ApiAuditLog = {
  id: number
  user_id: number | null
  action: string
  target_type: string
  target_id: number | null
  details: string | null
  created_at: string
  user_name: string | null
}
