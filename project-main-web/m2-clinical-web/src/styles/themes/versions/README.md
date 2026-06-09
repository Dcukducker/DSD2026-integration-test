# Design Version Archive

Use this folder to archive each UI design version as independent theme packs.

## Naming Rules

- Folder name format: `<role>-<version>`
- Examples:
  - `doctor-v1`
  - `doctor-v2`
  - `patient-v1`
  - `admin-v1`

## Recommended File Set Per Version

Each version folder should contain:

- `tokens.css` (required): color, spacing, radius, font tokens
- `components.css` (optional): component-level overrides
- `notes.md` (required): source design link, change summary, date, owner

## How to Apply a New Version

1. Add or update token values in `themes/role-themes.css` and `themes/version-themes.css`.
2. If a one-off style is needed for a specific version, place it in that version folder.
3. Keep business code unchanged; only update style files.

## Why this exists

This ensures design versions are:

- clearly separated,
- easy to review and rollback,
- independent from business logic changes.
