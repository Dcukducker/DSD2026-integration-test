/**
 * Centralized API configuration for M2 Clinical Web.
 *
 * Reads VITE_API_BASE from environment (Vite .env file) with
 * a default fallback to localhost:3000 for integration testing.
 *
 * Usage:
 *   import { API_BASE_URL } from '../config/apiConfig'
 *   const res = await fetch(`${API_BASE_URL}/patients`)
 *
 * To point to a different backend, create a .env file:
 *   VITE_API_BASE=http://113.44.220.94:3000
 */
export const API_BASE_URL: string =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env as Record<string, string>).VITE_API_BASE) ||
  'http://localhost:3000'
