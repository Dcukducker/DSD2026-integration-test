export type DiseaseType = 'acl' | 'rotator_cuff'

export type DoctorClinicalDecision = {
  phase: string
  cobb: string
  mmt: number
  rom: number
  updatedAt: string
}

export type DoctorOrder = {
  riskLevel: 'Green' | 'Yellow' | 'Red' | 'Orange'
  weightBearing: string
  scarOrder: string
  advice: string
  updatedAt: string
}

const eventName = 'm2:doctor-sync'

function keyDecision(patientId: string) {
  return `m2_doctor_decision_${patientId}`
}
function keyOrder(patientId: string) {
  return `m2_doctor_order_${patientId}`
}

export function getDiseaseType(diagnosisShort?: string): DiseaseType {
  const text = (diagnosisShort || '').toLowerCase()
  if (text.includes('肩袖') || text.includes('rotator')) return 'rotator_cuff'
  return 'acl'
}

export function loadDecision(patientId: string): DoctorClinicalDecision | null {
  try {
    const raw = localStorage.getItem(keyDecision(patientId))
    return raw ? (JSON.parse(raw) as DoctorClinicalDecision) : null
  } catch {
    return null
  }
}

export function saveDecision(patientId: string, decision: DoctorClinicalDecision) {
  try {
    localStorage.setItem(keyDecision(patientId), JSON.stringify(decision))
    window.dispatchEvent(new CustomEvent(eventName))
  } catch {
    // ignore
  }
}

export function loadDoctorOrder(patientId: string): DoctorOrder | null {
  try {
    const raw = localStorage.getItem(keyOrder(patientId))
    return raw ? (JSON.parse(raw) as DoctorOrder) : null
  } catch {
    return null
  }
}

export function saveDoctorOrder(patientId: string, order: DoctorOrder) {
  try {
    localStorage.setItem(keyOrder(patientId), JSON.stringify(order))
    window.dispatchEvent(new CustomEvent(eventName))
  } catch {
    // ignore
  }
}

export function subscribeDoctorSync(cb: () => void) {
  const handler = () => cb()
  window.addEventListener(eventName, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(eventName, handler)
    window.removeEventListener('storage', handler)
  }
}
