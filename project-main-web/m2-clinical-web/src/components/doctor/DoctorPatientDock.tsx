import { ClinicalNotes } from '../common/ClinicalNotes'
import { PatientPrescriptionPanel } from './PatientPrescriptionPanel'

/** 患者页底部：临床备注 + 下发医嘱并排（各 App Shell 共用） */
export function DoctorPatientDock() {
  return (
    <div className="doctor-patient-dock">
      <ClinicalNotes />
      <PatientPrescriptionPanel />
    </div>
  )
}
