import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { createId, createInitialData, normaliseData } from './data.js'
import { convertImageToJpeg } from './image.js'
import { loadData, saveData } from './storage.js'

const DAYS = ['きょう', 'きのう', '7月16日', '7月14日', '7月10日']
const SAVE_ERROR = '保存容量がいっぱいです。写真を減らしてください'
const EDITOR_WIDTH = 340
const DEFAULT_OVERLAY_SIZE = (24 / EDITOR_WIDTH) * 100
const MIN_OVERLAY_SIZE = (12 / EDITOR_WIDTH) * 100
const MAX_OVERLAY_SIZE = (72 / EDITOR_WIDTH) * 100
const TEXT_COLORS = [
  '#FFFFFF', '#FAF6F2', '#F4E7E4', '#D8A5A2', '#FF6B6B', '#FF9F43', '#FFD93D',
  '#6BCB77', '#4D96FF', '#845EC2', '#E86AA3', '#A4B6A0', '#4A3A32', '#111111',
]

function PhotoArt({ photo, className = '' }) {
  const rotation = photo.rotation ?? 0
  const sideways = Math.abs(rotation % 180) === 90

  return (
    <div className={`photo-art ${className}`} style={{ backgroundColor: photo.tone }}>
      <div
        className="photo-media"
        style={{
          width: sideways ? '133.34%' : '100%',
          height: sideways ? '75%' : '100%',
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        }}
      >
        {photo.image ? (
          <img src={photo.image} alt={photo.label} />
        ) : (
          <>
            <span className="photo-emoji">{photo.emoji}</span>
            <span className="photo-label">{photo.label}</span>
          </>
        )}
      </div>
    </div>
  )
}

function PageHeader({ title, en }) {
  return (
    <header className="page-header">
      <p>{en}</p>
      <h1>{title}</h1>
    </header>
  )
}

function BackHeader({ title, onBack }) {
  return (
    <header className="back-header">
      <button type="button" aria-label="戻る" onClick={onBack}>
        ‹
      </button>
      <h1>{title}</h1>
      <span aria-hidden="true" />
    </header>
  )
}

function StoryScreen({ data, onOpenPicker, onEdit, onBulk }) {
  const [selectingDay, setSelectingDay] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const usageFor = (photoId) => data.albums.filter((album) => album.playlist.includes(photoId))
  const stopSelecting = () => {
    setSelectingDay(null)
    setSelectedIds([])
  }
  const toggleSelected = (photoId) => {
    setSelectedIds((current) =>
      current.includes(photoId) ? current.filter((id) => id !== photoId) : [...current, photoId],
    )
  }

  return (
    <div className="screen padded has-nav">
      <PageHeader title="ストーリー" en="story" />
      <button type="button" className="upload-hero" onClick={onOpenPicker}>
        <span aria-hidden="true">⌁</span>
        <span>写真をとって あげる</span>
      </button>
      <p className="intro">
        あげた写真は日付ごとにたまります。
        <br />
        アルバムはここから見せたい写真をえらんでつくります。
      </p>

      <div className="day-list">
        {DAYS.map((day) => {
          const photos = data.photos.filter((photo) => photo.day === day)
          return (
            <article className="day-block" key={day}>
              <div className="day-title">
                <div>
                  <h2>{day}</h2>
                  <span>{photos.length}枚</span>
                </div>
                <div className="day-actions">
                  {photos.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        selectingDay === day
                          ? stopSelecting()
                          : (setSelectingDay(day), setSelectedIds([]))
                      }
                    >
                      {selectingDay === day ? 'やめる' : 'まとめて編集'}
                    </button>
                  )}
                  <button type="button" onClick={() => {}}>
                    この日をみる <b aria-hidden="true">›</b>
                  </button>
                </div>
              </div>
              {photos.length ? (
                <div className="story-grid">
                  {photos.map((photo) => {
                    const selected = selectingDay === day && selectedIds.includes(photo.id)
                    return (
                      <button
                        type="button"
                        key={photo.id}
                        className={selected ? 'selecting' : ''}
                        onClick={() => (selectingDay === day ? toggleSelected(photo.id) : onEdit(photo))}
                      >
                        <PhotoArt photo={photo} />
                        {selectingDay === day ? (
                          <span className="pick-mark">
                            {selected ? selectedIds.indexOf(photo.id) + 1 : ''}
                          </span>
                        ) : (
                          <span className="usage-badges">
                            {usageFor(photo.id)
                              .slice(0, 2)
                              .map((album) => (
                                <small key={album.id}>
                                  {album.name.length > 6 ? 'アルバム' : album.name}
                                </small>
                              ))}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : (
                day === 'きょう' && (
                  <div className="empty-today">
                    <span aria-hidden="true">☕</span>
                    <p>
                      きょうはまだあげていません。
                      <br />
                      「写真をとって あげる」から
                    </p>
                  </div>
                )
              )}
            </article>
          )
        })}
      </div>
      {selectingDay && (
        <div className="bulk-bar">
          <button type="button" className="btn ghost" onClick={stopSelecting}>
            やめる
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!selectedIds.length}
            onClick={() => {
              if (selectedIds.length) onBulk(selectedIds)
              stopSelecting()
            }}
          >
            {selectedIds.length}枚をまとめて編集
          </button>
        </div>
      )}
    </div>
  )
}

function PickerScreen({ data, onBack, onNext, notify }) {
  const libraryInput = useRef(null)
  const cameraInput = useRef(null)
  const [temporaryPhotos, setTemporaryPhotos] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [busy, setBusy] = useState(false)
  const availablePhotos = useMemo(
    () => [...temporaryPhotos, ...data.photos],
    [temporaryPhotos, data.photos],
  )

  const toggle = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    )
  }

  const importFiles = async (event, camera = false) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) {
      if (camera) notify('撮影はキャンセルされました')
      return
    }

    setBusy(true)
    const converted = await Promise.allSettled(
      files.map(async (file) => ({
        id: createId('photo'),
        image: await convertImageToJpeg(file),
        tone: '#8D796A',
        emoji: '📷',
        label: file.name,
        day: 'きょう',
        createdAt: new Date().toISOString(),
        caption: '',
        overlays: [],
        rotation: 0,
      })),
    )

    const successful = converted.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
    if (successful.length) {
      setTemporaryPhotos((current) => [...successful, ...current])
      setSelectedIds((current) => [...current, ...successful.map((photo) => photo.id)])
      if (camera) notify('写真を撮影しました')
    }
    if (successful.length !== converted.length) notify('写真をえらび直してください')
    setBusy(false)
  }

  const cancel = () => {
    setTemporaryPhotos([])
    setSelectedIds([])
    onBack()
  }

  const next = () => {
    const available = new Map(availablePhotos.map((photo) => [photo.id, photo]))
    const photos = selectedIds.flatMap((id) => (available.has(id) ? [structuredClone(available.get(id))] : []))
    if (!photos.length) {
      notify('写真をえらび直してください')
      return
    }
    onNext(photos)
  }

  return (
    <div className="screen picker-screen">
      <BackHeader title="写真をえらぶ" onBack={cancel} />
      <div className="library-row">
        <div>
          <b>端末の写真</b>
          <small>複数えらべます</small>
        </div>
        <button type="button" disabled={busy} onClick={() => libraryInput.current?.click()}>
          写真をひらく
        </button>
      </div>
      <input
        ref={libraryInput}
        hidden
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => importFiles(event)}
      />
      <input
        ref={cameraInput}
        hidden
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => importFiles(event, true)}
        onCancel={() => notify('撮影はキャンセルされました')}
      />

      <div className="picker-grid">
        <button type="button" className="cam-card" disabled={busy} onClick={() => cameraInput.current?.click()}>
          <i className="cam-badge" aria-hidden="true">◉</i>
          <span className="cam-card-body">
            <span className="cam-ico" aria-hidden="true">⌁</span>
            <small>その場でとる</small>
          </span>
        </button>
        {availablePhotos.map((photo) => {
          const selectedIndex = selectedIds.indexOf(photo.id)
          return (
            <button
              type="button"
              key={photo.id}
              className={selectedIndex >= 0 ? 'selected' : ''}
              onClick={() => toggle(photo.id)}
            >
              <PhotoArt photo={photo} />
              <i>{selectedIndex >= 0 ? selectedIndex + 1 : ''}</i>
            </button>
          )
        })}
      </div>

      <div className="fixed-actions">
        <button type="button" className="btn ghost" onClick={cancel}>
          やめる
        </button>
        <button type="button" className="btn primary" disabled={!selectedIds.length || busy} onClick={next}>
          {selectedIds.length ? `${selectedIds.length}枚を次へ` : '次へ'}
        </button>
      </div>
    </div>
  )
}

function EditorScreen({ photo, setPhoto, isExisting, batchIndex, batchTotal, onBack, onSave, onDelete, notify }) {
  const [selectedOverlayId, setSelectedOverlayId] = useState(photo.overlays[0]?.id || '')
  const workRef = useRef(null)
  const [workWidth, setWorkWidth] = useState(EDITOR_WIDTH)
  const pointers = useRef(new Map())
  const gesture = useRef({ distance: 0, size: 0, angle: 0, rotation: 0, px: 0, py: 0, sx: 0, sy: 0 })
  const selectedOverlay = photo.overlays.find((overlay) => overlay.id === selectedOverlayId)

  useEffect(() => {
    const work = workRef.current
    if (!work) return undefined
    const update = () => setWorkWidth(work.getBoundingClientRect().width || EDITOR_WIDTH)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(work)
    return () => observer.disconnect()
  }, [])

  const updateOverlay = (id, patch) => {
    setPhoto((current) => ({
      ...current,
      overlays: current.overlays.map((overlay) => (overlay.id === id ? { ...overlay, ...patch } : overlay)),
    }))
  }

  const beginGesture = (event, overlay) => {
    event.preventDefault()
    setSelectedOverlayId(overlay.id)
    if (pointers.current.size === 0) {
      gesture.current.px = event.clientX
      gesture.current.py = event.clientY
      gesture.current.sx = overlay.x
      gesture.current.sy = overlay.y
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)
    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()]
      gesture.current.distance = Math.hypot(second.x - first.x, second.y - first.y)
      gesture.current.size = overlay.size
      gesture.current.angle = Math.atan2(second.y - first.y, second.x - first.x) * 180 / Math.PI
      gesture.current.rotation = overlay.rotation
    }
  }

  const moveGesture = (event, overlay) => {
    if (!pointers.current.has(event.pointerId)) return
    event.preventDefault()
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointers.current.size >= 2) {
      const [first, second] = [...pointers.current.values()]
      const distance = Math.hypot(second.x - first.x, second.y - first.y)
      const angle = Math.atan2(second.y - first.y, second.x - first.x) * 180 / Math.PI
      if (gesture.current.distance > 0) {
        const rotation = ((gesture.current.rotation + angle - gesture.current.angle + 180) % 360 + 360) % 360 - 180
        updateOverlay(overlay.id, {
          size: Math.max(MIN_OVERLAY_SIZE, Math.min(MAX_OVERLAY_SIZE, gesture.current.size * distance / gesture.current.distance)),
          rotation: Math.round(rotation),
        })
      }
      return
    }

    const bounds = workRef.current?.getBoundingClientRect()
    if (bounds) {
      updateOverlay(overlay.id, {
        x: Math.max(5, Math.min(95, gesture.current.sx + (event.clientX - gesture.current.px) / bounds.width * 100)),
        y: Math.max(5, Math.min(95, gesture.current.sy + (event.clientY - gesture.current.py) / bounds.height * 100)),
      })
    }
  }

  const endGesture = (event) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) gesture.current.distance = 0
    if (pointers.current.size === 1) {
      const [remaining] = [...pointers.current.values()]
      gesture.current.px = remaining.x
      gesture.current.py = remaining.y
      if (selectedOverlay) {
        gesture.current.sx = selectedOverlay.x
        gesture.current.sy = selectedOverlay.y
      }
    }
  }

  const addOverlay = () => {
    const overlay = {
      id: createId('overlay'),
      text: '文字を入力',
      x: 50,
      y: 38,
      size: DEFAULT_OVERLAY_SIZE,
      rotation: 0,
      color: '#FAF6F2',
    }
    setPhoto((current) => ({ ...current, overlays: [...current.overlays, overlay] }))
    setSelectedOverlayId(overlay.id)
  }

  const toolItems = [
    ['Aa', 'テキスト', addOverlay],
    ['↻', '写真を回転', () => setPhoto((current) => ({ ...current, rotation: ((current.rotation ?? 0) + 90) % 360 }))],
    ['☺', 'スタンプ'], ['♫', '音楽'], ['✦', 'エフェクト'], ['∞', 'Boomerang'],
    ['@', 'メンション'], ['✎', '落書き'],
    ['⇩', 'ダウンロード', () => notify('端末への保存を想定した機能です')],
  ]

  const saveLabel = isExisting
    ? '変更を保存'
    : batchTotal > 1 && batchIndex < batchTotal - 1
      ? `次の写真へ（${batchIndex + 1}/${batchTotal}）`
      : batchTotal > 1
        ? `${batchTotal}枚をストーリーにあげる`
        : 'ストーリーにあげる'

  return (
    <div className="screen editor-screen">
      <div className="editor-top">
        <button type="button" aria-label="戻る" onClick={onBack}>‹</button>
        <span>{isExisting ? '写真を編集' : batchTotal > 1 ? `ストーリー編集 ${batchIndex + 1}/ ${batchTotal}` : 'ストーリー編集'}</span>
        <button type="button" aria-label="もっと見る" onClick={() => notify('この機能は開発予定です')}>•••</button>
      </div>
      <div
        ref={workRef}
        className="editor-work"
        onPointerDown={(event) => selectedOverlay && !event.target.closest('.editable-overlay') && beginGesture(event, selectedOverlay)}
        onPointerMove={(event) => selectedOverlay && !event.target.closest('.editable-overlay') && moveGesture(event, selectedOverlay)}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        <PhotoArt photo={photo} className="editor-photo" />
        {photo.overlays.map((overlay) => (
          <button
            type="button"
            key={overlay.id}
            className={`editable-overlay ${selectedOverlayId === overlay.id ? 'chosen' : ''}`}
            style={{
              left: `${overlay.x}%`, top: `${overlay.y}%`, fontSize: overlay.size / 100 * workWidth,
              color: overlay.color, transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg)`,
            }}
            onPointerDown={(event) => beginGesture(event, overlay)}
            onPointerMove={(event) => moveGesture(event, overlay)}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
          >
            {overlay.text}
          </button>
        ))}
      </div>
      <div className="editor-tools">
        {toolItems.map(([icon, label, action]) => (
          <button type="button" aria-label={label} key={label} onClick={action || (() => notify('この機能は開発予定です'))}>
            <i>{icon}</i><small>{label}</small>
          </button>
        ))}
      </div>
      {selectedOverlay && (
        <div className="text-controls">
          <input
            aria-label="文字内容"
            value={selectedOverlay.text}
            onChange={(event) => updateOverlay(selectedOverlay.id, { text: event.target.value })}
          />
          <div className="control-row">
            <div className="color-picks">
              {TEXT_COLORS.map((color) => (
                <button
                  type="button"
                  aria-label={`文字色 ${color}`}
                  key={color}
                  className={selectedOverlay.color === color ? 'on' : ''}
                  style={{ background: color }}
                  onClick={() => updateOverlay(selectedOverlay.id, { color })}
                />
              ))}
            </div>
            <span className="gesture-hint">選択中は写真のどこでも：1本指で移動・2本指で拡大／回転</span>
            <div className="text-panel-actions">
              <button
                type="button"
                className="text-delete"
                onClick={() => {
                  setPhoto((current) => ({ ...current, overlays: current.overlays.filter((overlay) => overlay.id !== selectedOverlayId) }))
                  setSelectedOverlayId('')
                }}
              >削除</button>
              <button type="button" className="text-done" onClick={() => setSelectedOverlayId('')}>完了</button>
            </div>
          </div>
        </div>
      )}
      <div className="caption-bar">
        <input
          placeholder="キャプションを追加..."
          value={photo.caption}
          onChange={(event) => setPhoto({ ...photo, caption: event.target.value })}
        />
        <button type="button" className="post-btn" onClick={onSave}>{saveLabel}</button>
      </div>
      {isExisting && <button type="button" className="delete-photo" onClick={onDelete}>写真を削除</button>}
    </div>
  )
}

function ConfirmDialog({ text, onCancel, onConfirm }) {
  return (
    <div className="dialog-back">
      <div className="dialog" role="dialog" aria-modal="true">
        <h2>確認</h2>
        <p>{text}</p>
        <div>
          <button type="button" className="btn ghost" onClick={onCancel}>やめる</button>
          <button type="button" className="btn danger" onClick={onConfirm}>実行する</button>
        </div>
      </div>
    </div>
  )
}

function BottomNav({ screen, onChange }) {
  const items = [
    ['story', '⌂', 'ストーリー'],
    ['albums', '▣', 'アルバム'],
    ['settings', '⚙', '設定'],
  ]

  return (
    <nav className="bottom-nav" aria-label="メインメニュー">
      {items.map(([id, icon, label]) => (
        <button type="button" key={id} className={screen === id ? 'active' : ''} onClick={() => onChange(id)}>
          <span aria-hidden="true">{icon}</span>
          <small>{label}</small>
        </button>
      ))}
    </nav>
  )
}

function App() {
  const [data, setData] = useState(null)
  const [screen, setScreen] = useState('story')
  const [toast, setToast] = useState('')
  const [editSession, setEditSession] = useState([])
  const [editIndex, setEditIndex] = useState(0)
  const [editPhoto, setEditPhoto] = useState(null)
  const [editReturnScreen, setEditReturnScreen] = useState('story')
  const [confirmation, setConfirmation] = useState(null)
  const screenRef = useRef(screen)

  useEffect(() => {
    screenRef.current = screen
  }, [screen])

  useEffect(() => {
    let active = true
    async function initialise() {
      try {
        const stored = await loadData()
        if (!active) return
        if (stored) {
          setData(normaliseData(stored))
          return
        }
        const initial = createInitialData()
        await saveData(initial)
        if (active) setData(initial)
      } catch {
        if (active) {
          setData(createInitialData())
          setToast(SAVE_ERROR)
        }
      }
    }
    initialise()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    history.replaceState({ teaRose: 1 }, '')
    history.pushState({ teaRose: 2 }, '')
    const handlePopState = () => {
      history.pushState({ teaRose: 2 }, '')
      if (screenRef.current === 'editor') {
        setEditSession([])
        setEditPhoto(null)
        setEditIndex(0)
        setScreen(editReturnScreen)
      } else if (screenRef.current === 'picker') {
        setScreen('story')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [editReturnScreen])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const openPicker = () => {
    setScreen('picker')
    window.scrollTo(0, 0)
  }

  const startEditing = (photos, returnScreen = screen) => {
    if (!photos.length) {
      setToast('写真をえらんでください')
      return
    }
    const session = photos.map((photo) => structuredClone(photo))
    setEditSession(session)
    setEditIndex(0)
    setEditPhoto(session[0])
    setEditReturnScreen(returnScreen)
    setScreen('editor')
    window.scrollTo(0, 0)
  }

  const cancelEditing = () => {
    setEditSession([])
    setEditPhoto(null)
    setEditIndex(0)
    setScreen(editReturnScreen)
  }

  const saveEditing = async () => {
    if (!editPhoto) return
    const session = editSession.map((photo, index) => (index === editIndex ? editPhoto : photo))
    if (editIndex < session.length - 1) {
      const nextIndex = editIndex + 1
      setEditSession(session)
      setEditIndex(nextIndex)
      setEditPhoto(session[nextIndex])
      return
    }

    const existingIds = new Set(data.photos.map((photo) => photo.id))
    const replacements = new Map(session.filter((photo) => existingIds.has(photo.id)).map((photo) => [photo.id, photo]))
    const additions = session.filter((photo) => !existingIds.has(photo.id))
    const nextData = {
      ...data,
      photos: [...additions, ...data.photos.map((photo) => replacements.get(photo.id) || photo)],
    }
    try {
      await saveData(nextData)
      setData(nextData)
      setEditSession([])
      setEditPhoto(null)
      setEditIndex(0)
      setScreen(editReturnScreen)
      setToast(
        replacements.size
          ? session.length === 1 ? '保存しました' : `${session.length}枚を保存しました`
          : session.length === 1 ? 'ストーリーにあげました' : `${session.length}枚をストーリーにあげました`,
      )
    } catch {
      setToast(SAVE_ERROR)
    }
  }

  const requestPhotoDelete = () => {
    if (!editPhoto) return
    const albumCount = data.albums.filter((album) => album.playlist.includes(editPhoto.id)).length
    const text = albumCount
      ? `${albumCount}個のアルバムでも使われています。\nそこからも消えます。\nこの操作はもどせません。`
      : 'この写真をストーリーから削除します。\nこの操作はもどせません。'
    setConfirmation({
      text,
      action: async () => {
        const nextData = {
          ...data,
          photos: data.photos.filter((photo) => photo.id !== editPhoto.id),
          albums: data.albums.map((album) => ({
            ...album,
            playlist: album.playlist.filter((id) => id !== editPhoto.id),
            cover: album.cover === editPhoto.id ? '' : album.cover,
          })),
        }
        try {
          await saveData(nextData)
          setData(nextData)
          setConfirmation(null)
          setEditSession([])
          setEditPhoto(null)
          setScreen('story')
          setToast('写真を削除しました')
        } catch {
          setConfirmation(null)
          setToast(SAVE_ERROR)
        }
      },
    })
  }

  return (
    <main className="stage">
      <div className="phone-shell">
        {!data ? (
          <div className="screen" />
        ) : screen === 'picker' ? (
          <PickerScreen
            data={data}
            onBack={() => setScreen('story')}
            onNext={(photos) => startEditing(photos, 'story')}
            notify={setToast}
          />
        ) : screen === 'editor' && editPhoto ? (
          <EditorScreen
            key={editPhoto.id}
            photo={editPhoto}
            setPhoto={setEditPhoto}
            isExisting={data.photos.some((photo) => photo.id === editPhoto.id)}
            batchIndex={editIndex}
            batchTotal={editSession.length}
            onBack={cancelEditing}
            onSave={saveEditing}
            onDelete={requestPhotoDelete}
            notify={setToast}
          />
        ) : screen === 'story' ? (
          <StoryScreen
            data={data}
            onOpenPicker={openPicker}
            onEdit={(photo) => startEditing([photo], 'story')}
            onBulk={(ids) => startEditing(ids.flatMap((id) => data.photos.find((photo) => photo.id === id) || []), 'story')}
          />
        ) : (
          <div className="screen has-nav" />
        )}

        {data && !['picker', 'editor'].includes(screen) && <BottomNav screen={screen} onChange={setScreen} />}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
        {confirmation && (
          <ConfirmDialog
            text={confirmation.text}
            onCancel={() => setConfirmation(null)}
            onConfirm={confirmation.action}
          />
        )}
      </div>
    </main>
  )
}

export default App
