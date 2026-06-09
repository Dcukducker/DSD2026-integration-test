import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type RoleTheme = 'doctor' | 'admin'
export type UiVersion = 'v1' | 'v2'

type ThemeContextValue = {
  roleTheme: RoleTheme
  uiVersion: UiVersion
  setRoleTheme: (roleTheme: RoleTheme) => void
  setUiVersion: (uiVersion: UiVersion) => void
}

const ROLE_KEY = 'm2.role-theme'
const VERSION_KEY = 'm2.ui-version'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function isRoleTheme(value: string | null): value is RoleTheme {
  return value === 'doctor' || value === 'admin'
}

function isUiVersion(value: string | null): value is UiVersion {
  return value === 'v1' || value === 'v2'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [roleTheme, setRoleThemeState] = useState<RoleTheme>(() => {
    if (typeof window === 'undefined') return 'doctor'
    const saved = window.localStorage.getItem(ROLE_KEY)
    return isRoleTheme(saved) ? saved : 'doctor'
  })

  const [uiVersion, setUiVersionState] = useState<UiVersion>(() => {
    if (typeof window === 'undefined') return 'v1'
    const saved = window.localStorage.getItem(VERSION_KEY)
    return isUiVersion(saved) ? saved : 'v1'
  })

  const setRoleTheme = useCallback((next: RoleTheme) => {
    setRoleThemeState(next)
  }, [])

  const setUiVersion = useCallback((next: UiVersion) => {
    setUiVersionState(next)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(ROLE_KEY, roleTheme)
    document.documentElement.dataset.roleTheme = roleTheme
  }, [roleTheme])

  useEffect(() => {
    window.localStorage.setItem(VERSION_KEY, uiVersion)
    document.documentElement.dataset.uiVersion = uiVersion
  }, [uiVersion])

  const value = useMemo(
    () => ({
      roleTheme,
      uiVersion,
      setRoleTheme,
      setUiVersion,
    }),
    [roleTheme, setRoleTheme, setUiVersion, uiVersion],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }
  return ctx
}
