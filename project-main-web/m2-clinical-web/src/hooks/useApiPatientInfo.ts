import { useEffect, useState } from 'react'
import { patientApiService } from '../services/patientApiService'

/**
 * Returns real patient name + isApiPatient flag.
 * When patientId is numeric (API-style), looks up the name from patientApiService.
 * When patientId is a legacy mock ID like "p-001", returns isApiPatient=false.
 */
export function useApiPatientInfo(patientId: string) {
  const numericId = Number(patientId)
  const isApiPatient = !isNaN(numericId) && numericId > 0

  const [name, setName] = useState<string>(isApiPatient ? `Patient #${patientId}` : '')

  useEffect(() => {
    if (!isApiPatient) { setName(''); return }
    patientApiService
      .listPatients()
      .then((list) => {
        const found = list.find((p) => p.id === numericId)
        setName(found?.name ?? `Patient #${patientId}`)
      })
      .catch(() => setName(`Patient #${patientId}`))
  }, [isApiPatient, numericId, patientId])

  return { isApiPatient, apiPatientName: name }
}
