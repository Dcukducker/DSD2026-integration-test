export type DoctorApplicationStatus = 'pending' | 'approved' | 'rejected'

export type DoctorRegistrationApplication = {
  id: string
  doctorName: string
  account: string
  submittedAt: string
  status: DoctorApplicationStatus
  licenseImages: string[]
  reviewNote?: string
}

const STORAGE_KEY = 'm2:doctor-registration-applications:v1'

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function loadAll(): DoctorRegistrationApplication[] {
  if (typeof window === 'undefined') return []
  const data = safeParse<DoctorRegistrationApplication[]>(
    window.localStorage.getItem(STORAGE_KEY),
  )
  return Array.isArray(data) ? data : []
}

function saveAll(apps: DoctorRegistrationApplication[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))
  window.dispatchEvent(new CustomEvent('m2:doctor-registration-sync'))
}

export const doctorRegistrationStore = {
  list(): DoctorRegistrationApplication[] {
    return loadAll().sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
  },

  getById(id: string): DoctorRegistrationApplication | null {
    return loadAll().find((a) => a.id === id) ?? null
  },

  getByAccount(account: string): DoctorRegistrationApplication | null {
    const key = account.trim().toLowerCase()
    if (!key) return null
    return loadAll().find((a) => a.account.trim().toLowerCase() === key) ?? null
  },

  submit(input: {
    doctorName: string
    account: string
    licenseImages: string[]
  }): DoctorRegistrationApplication {
    const apps = loadAll()
    const id = `app-${Date.now()}`
    const submittedAt = new Date().toISOString().slice(0, 10)
    const next: DoctorRegistrationApplication = {
      id,
      doctorName: input.doctorName.trim() || 'Unnamed Doctor',
      account: input.account.trim(),
      submittedAt,
      status: 'pending',
      licenseImages: input.licenseImages,
    }
    const filtered = apps.filter(
      (a) => a.account.trim().toLowerCase() !== next.account.trim().toLowerCase(),
    )
    saveAll([next, ...filtered])
    return next
  },

  review(id: string, status: DoctorApplicationStatus, reviewNote?: string) {
    const apps = loadAll()
    const next = apps.map((a) =>
      a.id === id ? { ...a, status, reviewNote } : a,
    )
    saveAll(next)
  },

  subscribe(cb: () => void) {
    const handler = () => cb()
    window.addEventListener('m2:doctor-registration-sync', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('m2:doctor-registration-sync', handler)
      window.removeEventListener('storage', handler)
    }
  },
}

