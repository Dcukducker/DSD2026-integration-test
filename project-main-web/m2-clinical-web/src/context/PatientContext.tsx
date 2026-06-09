import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { clinicalApi } from '../services/clinicalApi'
import { getRuntimeLocale } from '../i18n/runtime'
import type { PatientSummary } from '../types/clinical'

interface PatientContextValue {
  patients: PatientSummary[]
  patientId: string
  setPatientId: (id: string) => void
  currentPatient: PatientSummary | undefined
  loadingList: boolean
  listError: string | null
  reloadPatients: () => Promise<void>
}

const PatientContext = createContext<PatientContextValue | null>(null)

const STORAGE_KEY = 'm2_clinical_patient_id'
const listLoadFailedByLocale = () => {
  const locale = getRuntimeLocale()
  if (locale === 'en') return 'Failed to load patient list'
  if (locale === 'pt-BR') return 'Falha ao carregar a lista de pacientes'
  return '加载患者列表失败'
}

export function PatientProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [patientId, setPatientIdState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'p-001'
    } catch {
      return 'p-001'
    }
  })
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const reloadPatients = useCallback(async () => {
    setLoadingList(true)
    setListError(null)
    try {
      const list = await clinicalApi.listPatients()
      setPatients(list)
    } catch (e) {
      setListError(e instanceof Error ? e.message : listLoadFailedByLocale())
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    void reloadPatients()
  }, [reloadPatients])

  useEffect(() => {
    if (!patients.length) return
    // Numeric IDs belong to the real API patient list — don't reset them
    const isApiPatientId = !isNaN(Number(patientId)) && Number(patientId) > 0
    if (!isApiPatientId && !patients.some((p) => p.id === patientId)) {
      setPatientIdState(patients[0].id)
      try {
        localStorage.setItem(STORAGE_KEY, patients[0].id)
      } catch {
        /* ignore */
      }
    }
  }, [patients, patientId])

  const setPatientId = useCallback((id: string) => {
    setPatientIdState(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  const currentPatient = useMemo(
    () => patients.find((p) => p.id === patientId),
    [patients, patientId],
  )

  const value = useMemo(
    () => ({
      patients,
      patientId,
      setPatientId,
      currentPatient,
      loadingList,
      listError,
      reloadPatients,
    }),
    [
      patients,
      patientId,
      setPatientId,
      currentPatient,
      loadingList,
      listError,
      reloadPatients,
    ],
  )

  return (
    <PatientContext.Provider value={value}>{children}</PatientContext.Provider>
  )
}

// Fast Refresh：与 Provider 同文件导出 hook 为常见模式
// eslint-disable-next-line react-refresh/only-export-components
export function usePatient() {
  const ctx = useContext(PatientContext)
  if (!ctx) throw new Error('usePatient must be used within PatientProvider')
  return ctx
}
