# M2 Clinical Web Workstation

A rehabilitation web app with multi-portal entry: clinician, patient, and developer. Tech stack: **React 19**, **TypeScript**, **Vite**, **ECharts**, and **Three.js** (**@react-three/fiber** + **drei**).

## Quick Start

```bash
cd m2-clinical-web
npm install
npm run dev
```

Open the local URL shown in the terminal (default: `http://localhost:5173`). The app uses **Hash routing** (for example: `#/doctor/p/p-001/trends`), which is convenient for static hosting.

- `npm run build`: production build  
- `npm run preview`: preview production build output  

## Portals and Routes

| Portal | Route | Description |
|------|------|------|
| **Role Home** | `#/roles` | Multi-portal landing page |
| **Clinician** | `#/doctor/p/:patientId/trends` | Full clinical workstation (trend/history/3D) |
| **Patient** | `#/patient` | Simplified progress/tasks view |
| **Developer** | `#/developer` | Env and integration panel |

### Patient Portal Routes

- `#/patient/home`
- `#/patient/training`
- `#/patient/training/:taskId`
- `#/patient/recovery`
- `#/patient/follow-up`
- `#/patient/limb-3d`
- `#/patient/profile`

## Feature Overview

| Module | Description |
|------|------|
| **Long-term Recovery Trends** | Multi-metric time series, Week/Month/All filtering, event markers (surgery/assessment), measured vs AI-inferred series, anomaly markers with tooltip notes |
| **History & Comparison** | Chronological training/assessment records, multi-selection comparison table, clear delta and direction (improved/declined/flat) |
| **3D Limb Reconstruction** | Rotate/zoom/pan controls, segment heat overlay and angle annotations, canvas remount on patient switch/refresh to help release GPU resources |
| **Patient Portal** | Weekly tasks, account info, and links back to clinical charts |
| **Developer Portal** | Runtime env table and deployment/debug checklist |
| **REST Integration** | Currently backed by **Mock** data (`USE_MOCK` in `src/services/clinicalApi.ts`); data contracts are defined in `src/types/clinical.ts` |

## Project Structure

```
src/
  components/     # layout, charts, 3D, shared UI
  context/        # global state (e.g., current patient)
  theme/          # role theme + UI version state management
  styles/
    foundations/  # tokens and reset/base rules
    themes/       # role and version theme overrides
    legacy.css    # compatibility bridge for existing styles
  pages/          # feature pages
  services/       # API layer and mock providers
  types/          # domain types
```

## UI Style Architecture (for Design Iterations)

- **Theme state isolation**: `src/theme/ThemeContext.tsx` manages two independent dimensions:
  - `roleTheme`: `doctor | patient | admin`
  - `uiVersion`: `v1 | v2`
- **Automatic role mapping by route**:
  - `/patient` -> `patient`
  - `/developer` -> `admin`
  - others -> `doctor`
- **Style loading order** (`src/styles/index.css`):
  1. `foundations/tokens.css`
  2. `foundations/base.css`
  3. `themes/role-themes.css`
  4. `themes/version-themes.css`
  5. `themes/adapters.css`
  6. `legacy.css` (current class-based styles, backward compatible)

### Recommended Design Workflow

1. Keep business logic in `pages/`, `components/`, `services/`; do not place role/version logic there.
2. Add new visual variants by extending only `src/styles/themes/`.
3. For large visual refactors, migrate class-by-class from `legacy.css` into dedicated style files under `styles/`.
4. Keep semantic tokens stable (e.g. `--color-primary`), and swap values per role/version instead of editing component logic.

### Version Separation and Archiving

- Archive location: `src/styles/themes/versions/`
- Naming convention: `<role>-<version>` (for example: `doctor-v2`, `patient-v3`)
- Each archived version should include:
  - `tokens.css` (token values),
  - optional `components.css` (component overrides),
  - `notes.md` (design source, owner, date, key changes)
- Prefer style-only commits for design updates, so visual changes remain independent from business logic history.

## Connect to a Real Backend

1. Set `USE_MOCK` to `false` in `src/services/clinicalApi.ts` (or switch it to an environment flag).  
2. Implement real `fetch` calls with the same method signatures; recommended base URL source: `import.meta.env.VITE_API_BASE`.  
3. Suggested response fields include `source: "measured" | "ai_inferred"`; trend points can optionally include `isAnomaly` and `anomalyNote`.

## Clinical Notes and View Sharing

- **Notes**: stored per patient in browser `localStorage` (not an official medical record).  
- **Share**: top bar action copies the full current URL (including hash route), so teammates can open the same view directly.

## Performance Notes

- Charts use **LTTB sampling** (`sampling: 'lttb'`) and **dataZoom** for long sequences.  
- The 3D page remounts canvas via **`key`** and clears cache on unmount (`THREE.Cache.clear()`); this helps reduce long-lived memory usage. A future optimization is a single persistent canvas with incremental geometry/material updates.

## License

This is a demo project. Add your license and compliance notes as needed (including patient data governance and medical-device-related regulations).
