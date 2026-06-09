import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { announcementsApiService } from '../../services/announcementsApiService'
import { authStore } from '../../services/authStore'
import type { ApiAnnouncement } from '../../types/api'
import { useI18n } from '../../i18n/I18nContext'

/** Pixels scrolled per second (higher = faster). */
const SCROLL_PX_PER_SEC = 140

function AnnouncementLine({ segments }: { segments: { id: number; text: string }[] }) {
  return (
    <span className="doctor-announcement-line">
      {segments.map((seg) => (
        <span key={seg.id} className="doctor-announcement-item">
          {seg.text}
        </span>
      ))}
    </span>
  )
}

export function AnnouncementTicker() {
  const { t } = useI18n()
  const userId = authStore.getUser()?.id
  const [dismissed, setDismissed] = useState(() =>
    userId != null ? authStore.isAnnouncementBarDismissed(userId) : false,
  )
  const [items, setItems] = useState<ApiAnnouncement[]>([])
  const viewportRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [durationSec, setDurationSec] = useState(18)
  const [loopGapPx, setLoopGapPx] = useState(0)
  const [loopOffsetPx, setLoopOffsetPx] = useState(0)

  useEffect(() => {
    if (userId == null) return
    setDismissed(authStore.isAnnouncementBarDismissed(userId))
  }, [userId])

  useEffect(() => {
    if (dismissed) return
    let cancelled = false
    announcementsApiService
      .listAnnouncements('published')
      .then((list) => {
        if (!cancelled) {
          setItems(
            [...list].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            ),
          )
        }
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [dismissed])

  const segments = useMemo(
    () => items.map((a) => ({ id: a.id, text: `◆${a.title} — ${a.content}` })),
    [items],
  )

  useLayoutEffect(() => {
    if (dismissed) return
    const viewport = viewportRef.current
    const measure = measureRef.current
    if (!viewport || !measure || segments.length === 0) return

    const update = () => {
      const viewportWidth = viewport.clientWidth
      const textWidth = measure.offsetWidth
      if (viewportWidth <= 0 || textWidth <= 0) return

      setLoopGapPx(viewportWidth)
      const offset = textWidth + viewportWidth
      setLoopOffsetPx(offset)
      setDurationSec(Math.max(8, Math.min(36, offset / SCROLL_PX_PER_SEC)))
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(viewport)
    return () => ro.disconnect()
  }, [segments, dismissed])

  function dismiss() {
    if (userId == null) return
    authStore.dismissAnnouncementBar(userId)
    setDismissed(true)
  }

  if (dismissed || segments.length === 0) return null

  return (
    <div
      className="doctor-announcement-bar"
      role="region"
      aria-label={t('announcementTickerLabel')}
    >
      <span className="doctor-announcement-icon" aria-hidden>
        📢
      </span>
      <div className="doctor-announcement-viewport" ref={viewportRef}>
        <span ref={measureRef} className="doctor-announcement-measure" aria-hidden>
          <AnnouncementLine segments={segments} />
        </span>
        <div
          className="doctor-announcement-track"
          style={{
            animationDuration: `${durationSec}s`,
            ['--announcement-loop' as string]: `${loopOffsetPx}px`,
          }}
        >
          <span
            className="doctor-announcement-chunk"
            style={loopGapPx > 0 ? { paddingRight: loopGapPx } : undefined}
          >
            <AnnouncementLine segments={segments} />
          </span>
          <span className="doctor-announcement-chunk" aria-hidden>
            <AnnouncementLine segments={segments} />
          </span>
        </div>
      </div>
      <button
        type="button"
        className="doctor-announcement-dismiss"
        aria-label={t('announcementTickerDismiss')}
        title={t('announcementTickerDismiss')}
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  )
}
