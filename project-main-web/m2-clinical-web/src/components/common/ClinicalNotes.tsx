import { useEffect, useRef, useState } from 'react'
import { usePatient } from '../../context/PatientContext'
import { useI18n } from '../../i18n/I18nContext'

const keyFor = (patientId: string) => `m2_clinical_notes_${patientId}`
const versionKeyFor = (patientId: string) => `m2_clinical_notes_versions_${patientId}`
const readStored = (patientId: string) => {
  try {
    return localStorage.getItem(keyFor(patientId)) || ''
  } catch {
    return ''
  }
}
const readVersions = (patientId: string) => {
  try {
    const raw = localStorage.getItem(versionKeyFor(patientId))
    return raw ? (JSON.parse(raw) as Array<{ at: string; html: string }>) : []
  } catch {
    return []
  }
}

function htmlIsEmpty(html: string) {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
  return text.length === 0
}

function NotesForPatient({ patientId }: { patientId: string }) {
  const { t } = useI18n()
  const [html, setHtml] = useState(() => readStored(patientId))
  const [versions, setVersions] = useState(() => readVersions(patientId))
  const [saved, setSaved] = useState(false)
  const [empty, setEmpty] = useState(() => htmlIsEmpty(readStored(patientId)))
  const editorRef = useRef<HTMLDivElement | null>(null)
  const composingRef = useRef(false)

  const syncFromEditor = () => {
    const next = editorRef.current?.innerHTML ?? ''
    setHtml(next)
    setEmpty(htmlIsEmpty(next))
  }

  useEffect(() => {
    const stored = readStored(patientId)
    setHtml(stored)
    setVersions(readVersions(patientId))
    setEmpty(htmlIsEmpty(stored))
    if (editorRef.current) {
      editorRef.current.innerHTML = stored
    }
  }, [patientId])

  const save = () => {
    const current = editorRef.current?.innerHTML ?? html
    try {
      localStorage.setItem(keyFor(patientId), current)
      const next = [{ at: new Date().toISOString(), html: current }, ...versions].slice(0, 8)
      setVersions(next)
      localStorage.setItem(versionKeyFor(patientId), JSON.stringify(next))
      setHtml(current)
      setEmpty(htmlIsEmpty(current))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const applyCmd = (cmd: 'bold' | 'insertUnorderedList') => {
    document.execCommand(cmd)
    syncFromEditor()
  }

  const addImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const src = String(reader.result || '')
      const img = `<p><img src="${src}" alt="临床备注图片" style="max-width:100%;border-radius:8px;" /></p>`
      const next = (editorRef.current?.innerHTML || '') + img
      if (editorRef.current) editorRef.current.innerHTML = next
      setHtml(next)
      setEmpty(htmlIsEmpty(next))
    }
    reader.readAsDataURL(file)
  }

  return (
    <section className="card notes-card">
      <header className="card-head">
        <h3>{t('notesTitle')}</h3>
        <p className="muted small">{t('notesDesc')}</p>
      </header>
      <div className="notes-toolbar">
        <button type="button" className="btn ghost" onClick={() => applyCmd('bold')}>
          {t('notesBold')}
        </button>
        <button type="button" className="btn ghost" onClick={() => applyCmd('insertUnorderedList')}>
          {t('notesList')}
        </button>
        <label className="btn ghost">
          {t('notesInsertImage')}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) addImage(file)
            }}
          />
        </label>
      </div>
      <div
        className={`notes-rich-wrap${empty ? ' is-empty' : ''}`}
        data-placeholder={t('notesPh')}
      >
        <div
          ref={editorRef}
          className="notes-rich"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={t('notesTitle')}
          onCompositionStart={() => {
            composingRef.current = true
          }}
          onCompositionEnd={() => {
            composingRef.current = false
            syncFromEditor()
          }}
          onInput={() => {
            if (!composingRef.current) syncFromEditor()
          }}
          onBlur={syncFromEditor}
        />
      </div>
      <div className="notes-actions">
        <button type="button" className="btn primary" onClick={save}>
          {t('saveNotes')}
        </button>
        {saved ? <span className="muted small">{t('saved')}</span> : null}
      </div>
      {versions.length ? (
        <div className="notes-versions">
          <p className="small muted">{t('notesHistoryVersions')}</p>
          <div className="role-actions">
            {versions.map((v) => (
              <button
                key={v.at}
                type="button"
                className="btn ghost"
                onClick={() => {
                  setHtml(v.html)
                  setEmpty(htmlIsEmpty(v.html))
                  if (editorRef.current) editorRef.current.innerHTML = v.html
                }}
              >
                {new Date(v.at).toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function ClinicalNotes() {
  const { patientId } = usePatient()
  return <NotesForPatient key={patientId} patientId={patientId} />
}
