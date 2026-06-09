import { useCallback, useEffect, useState } from 'react'
import { usePatient } from '../../context/PatientContext'
import { useI18n } from '../../i18n/I18nContext'
import { patientApiService } from '../../services/patientApiService'
import type { ApiScheduleItem } from '../../types/api'
import { LoadingBlock } from '../common/LoadingBlock'

export function PatientPrescriptionPanel() {
  const { patientId } = usePatient()
  const { t } = useI18n()
  const uid = Number(patientId)
  const isApiPatient = !isNaN(uid) && uid > 0

  const [schedule, setSchedule] = useState<ApiScheduleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [exercise, setExercise] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [duration, setDuration] = useState('30')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const loadSchedule = useCallback(async () => {
    if (!isApiPatient) {
      setSchedule([])
      return
    }
    setLoading(true)
    try {
      const sched = await patientApiService.listSchedule(uid)
      setSchedule(sched)
    } catch {
      setSchedule([])
    } finally {
      setLoading(false)
    }
  }, [isApiPatient, uid])

  useEffect(() => {
    void loadSchedule()
  }, [loadSchedule])

  function statusLabel(s: ApiScheduleItem['status']) {
    if (s === 'pending') return t('statusPending')
    if (s === 'completed') return t('statusCompleted')
    if (s === 'skipped') return t('statusSkipped')
    return s
  }

  function statusClass(s: ApiScheduleItem['status']) {
    if (s === 'completed') return 'pass'
    if (s === 'skipped') return 'fail'
    return 'idle'
  }

  async function submitSchedule(e: React.FormEvent) {
    e.preventDefault()
    if (!isApiPatient) return
    if (!exercise.trim()) {
      setSubmitMsg({ text: t('sessionPrescriptionRequired'), ok: false })
      return
    }
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      await patientApiService.createScheduleItem({
        userId: uid,
        exercise,
        date,
        duration: Number(duration) || 30,
        notes,
      })
      await loadSchedule()
      setExercise('')
      setNotes('')
      setSubmitMsg({ text: t('sessionPrescriptionAdded'), ok: true })
    } catch (e) {
      setSubmitMsg({ text: e instanceof Error ? e.message : t('loadFailed'), ok: false })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isApiPatient) {
    return (
      <section className="card prescription-card">
        <h3 className="card-title">{t('patientDashboardPrescription')}</h3>
        <p className="muted small">{t('sessionsInvalidId')}</p>
      </section>
    )
  }

  return (
    <section className="card prescription-card">
      <h3 className="card-title">{t('patientDashboardPrescription')}</h3>

      <form className="prescription-form" onSubmit={(e) => void submitSchedule(e)}>
        <div className="prescription-field prescription-field--full">
          <label className="muted small">
            {t('sessionExercisePh')} *
            <input
              className="patient-select"
              placeholder={t('sessionExercisePh')}
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="prescription-field">
          <label className="muted small">
            {t('sessionDate')}
            <input
              type="date"
              className="patient-select"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>

        <div className="prescription-field">
          <label className="muted small">
            {t('sessionDuration')}
            <input
              type="number"
              className="patient-select"
              value={duration}
              min="1"
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>
        </div>

        <div className="prescription-field prescription-field--full">
          <label className="muted small">
            {t('sessionNotes')}
            <textarea
              className="patient-select"
              placeholder={t('sessionNotesPh')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </label>
        </div>

        <div className="prescription-actions prescription-field--full">
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? t('sessionSaving') : t('sessionAddPrescription')}
          </button>
          {submitMsg ? (
            <span className="small" style={{ color: submitMsg.ok ? '#22c55e' : '#ef4444' }}>
              {submitMsg.text}
            </span>
          ) : null}
        </div>
      </form>

      {loading ? (
        <LoadingBlock label={t('loading')} />
      ) : schedule.length > 0 ? (
        <div className="task-list prescription-list">
          {schedule.map((item) => (
            <div key={item.id} className="task-row">
              <div className="task-main">
                <p className="task-title">{item.exercise}</p>
                <p className="muted small">
                  {item.date} · {item.duration} min
                  {item.notes ? ` · ${item.notes}` : ''}
                </p>
              </div>
              <span className={`check-state ${statusClass(item.status)}`}>
                {statusLabel(item.status)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
