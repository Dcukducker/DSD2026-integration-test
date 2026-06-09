import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { PatientProvider, usePatient } from './context/PatientContext'
import { LoadingBlock } from './components/common/LoadingBlock'
import { AdminPortalPage } from './pages/AdminPortalPage'
import { RoleHomePage } from './pages/RoleHomePage'
import { I18nProvider, useI18n } from './i18n/I18nContext'
import { ThemeProvider, useTheme } from './theme/ThemeContext'
import { AuthGatewayPage } from './pages/AuthGatewayPage'
import { DoctorAppShell } from './components/layout/DoctorAppShell'
import { DoctorClinicalPage } from './pages/DoctorClinicalPage'
import { DoctorTrendsPage } from './pages/DoctorTrendsPage'
import { DoctorHistoryPage } from './pages/DoctorHistoryPage'
import { PatientListPage } from './pages/PatientListPage'
import { SessionsListPage } from './pages/SessionsListPage'
import { SessionDetailPage } from './pages/SessionDetailPage'

const Limb3DPage = lazy(async () => {
  const m = await import('./pages/Limb3DPage')
  return { default: m.Limb3DPage }
})

function HomeRedirect() {
  return <Navigate to="/roles" replace />
}

function DoctorHomeRedirect() {
  return <Navigate to="/doctor/patients" replace />
}

function Loading3DFallback() {
  const { t } = useI18n()
  return <LoadingBlock label={t('loading')} />
}

function LayoutWithSync() {
  const { patientId: urlId } = useParams<{ patientId: string }>()
  const { patientId, setPatientId } = usePatient()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (urlId && urlId !== patientId) {
      setPatientId(urlId)
    }
  }, [urlId, patientId, setPatientId])

  const onPatientChange = (id: string) => {
    const path = location.pathname
    const m = path.match(/^\/(?:doctor\/)?p\/[^/]+(\/.*)?$/)
    const tail = m?.[1] && m[1].length > 1 ? m[1] : '/clinical'
    setPatientId(id)
    navigate(`/doctor/p/${id}${tail}`)
  }

  return <DoctorAppShell onPatientChange={onPatientChange} />
}

function RouteThemeSync() {
  const location = useLocation()
  const { setRoleTheme } = useTheme()

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      setRoleTheme('admin')
      return
    }

    setRoleTheme('doctor')
  }, [location.pathname, setRoleTheme])

  return null
}

export default function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <I18nProvider>
          <PatientProvider>
            <RouteThemeSync />
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/roles" element={<RoleHomePage />} />
              <Route path="/auth/:role" element={<AuthGatewayPage />} />
              <Route path="/admin" element={<AdminPortalPage />} />
              <Route path="/doctor" element={<DoctorHomeRedirect />} />
              <Route path="/doctor/patients" element={<PatientListPage />} />
              <Route path="/doctor/p/:patientId" element={<LayoutWithSync />}>
                <Route index element={<Navigate to="sessions" replace />} />
                <Route path="sessions" element={<SessionsListPage />} />
                <Route path="session/:sessionId" element={<SessionDetailPage />} />
                <Route path="clinical" element={<DoctorClinicalPage />} />
                <Route path="trends" element={<DoctorTrendsPage />} />
                <Route path="history" element={<DoctorHistoryPage />} />
                <Route
                  path="limb"
                  element={
                    <Suspense fallback={<Loading3DFallback />}>
                      <Limb3DPage />
                    </Suspense>
                  }
                />
              </Route>
              <Route path="/p/:patientId" element={<LayoutWithSync />}>
                <Route index element={<Navigate to="clinical" replace />} />
                <Route path="sessions" element={<SessionsListPage />} />
                <Route path="session/:sessionId" element={<SessionDetailPage />} />
                <Route path="clinical" element={<DoctorClinicalPage />} />
                <Route path="trends" element={<DoctorTrendsPage />} />
                <Route path="history" element={<DoctorHistoryPage />} />
                <Route
                  path="limb"
                  element={
                    <Suspense fallback={<Loading3DFallback />}>
                      <Limb3DPage />
                    </Suspense>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PatientProvider>
        </I18nProvider>
      </ThemeProvider>
    </HashRouter>
  )
}
