Hey, no need to wait — the API is live right now.

Base URL: https://dsd2026-teamv2-production.up.railway.app

You can confirm it's up by hitting:
GET /health → returns status ok

Main endpoints available:

Auth

POST /auth/register — { name, email, password, role } → returns JWT token + user
POST /auth/login — { email, password } → returns JWT token + user
GET /auth/me — requires Authorization: Bearer <token>
PATCH /auth/approve/:userId — admin: approve clinician
Users

POST /users — { name, email, role } (no password, legacy endpoint)
GET /users/:id
GET /users

GET /patients — all users with role=patient
GET /patients/:id
Sessions

POST /sessions — { userId }
GET /sessions/:id
PATCH /sessions/:id/end
DELETE /sessions/:id
Measurements

POST /measurements — { sessionId, jointAngles, isCorrect }
POST /measurements/batch
GET /measurements/:sessionId
Recommendations

POST /recommendations — { sessionId, movement, confidence }
GET /recommendations/session/:sessionId
GET /recommendations/engine/:userId — auto-generates suggestions from past sessions
Schedule
PATCH /recommendations/:id

POST /schedule — { userId, exercise, date, duration, notes }
GET /schedule/:userId
PATCH /schedule/:id — { status } (pending / completed / skipped)
DELETE /schedule/:id

Push Tokens

POST /push/register — { userId, token, platform }
GET /push/tokens/:userId
All responses are JSON. Dates are ISO 8601. Let me know if you need anything adjusted on our end.


Hi,

All changes are now done. Here is a summary:

3 bugs fixed:

GET /recommendations/engine/:userId — userId now returned as integer instead of string.
POST /push/register — response field corrected to user_id (snake_case), consistent with the rest of the API.
All *_at date fields (created_at, started_at, ended_at) now return ISO 8601 format. A centralised normalisation layer was added in db/helpers.js that handles both existing and new records automatically.
5 M2 features added:

Doctor registration via POST /auth/register (multipart/form-data, optional license file). Clinicians get status: "pending" and no token until approved. Login blocked with 403 while pending. New endpoints: GET /auth/status and PATCH /auth/approve/:userId.
Patient registration and all existing flows are unchanged.
POST /recommendations now accepts optional notes field.
GET /patients and GET /patients/:id added. Optional age field added to users.

GET /measurements/:sessionId now accepts ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD for date range filtering.
npm install required — one new package was added: multer (v2.x) for handling the clinician license file upload. Anyone pulling this branch needs to run npm install before starting the server.

Schema changes are backward-compatible — existing databases are automatically migrated on server start.

Cheers,
Sergio