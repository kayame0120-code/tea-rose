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
const ALBUM_ICONS = ['📖', '🎬', '🎮', '🎤', '🎧', '📷', '✈', '🗻', '🌊', '🌸', '🍁', '⛄', '⭐', '🌙', '☕', '🍰', '🍞', '🍜', '🍚', '🍣', '🎁', '💄', '🐱', '🐾']

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

function BackHeader({ title, onBack, action }) {
  return (
    <header className="back-header">
      <button type="button" aria-label="戻る" onClick={onBack}>
        ‹
      </button>
      <h1>{title}</h1>
      {action || <span aria-hidden="true" />}
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

function useLongPressSort({ count, onMove, onFinish }) {
  const [activeId, setActiveId] = useState('')
  const activeRef = useRef('')
  const timerRef = useRef(null)
  const pointerRef = useRef(null)
  const suppressUntil = useRef(0)

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }
  const finish = (element, pointerId) => {
    clearTimer()
    if (activeRef.current) {
      suppressUntil.current = performance.now() + 500
      activeRef.current = ''
      setActiveId('')
      document.body.classList.remove('pointer-sorting')
      onFinish()
    }
    if (element?.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId)
    pointerRef.current = null
  }
  useEffect(() => () => {
    clearTimer()
    document.body.classList.remove('pointer-sorting')
  }, [])

  return {
    activeId,
    suppressClick: () => performance.now() < suppressUntil.current,
    bind: (id) => ({
      onPointerDown: (event) => {
        if (count <= 1 || event.button !== 0 || event.target.closest('[data-no-sort]')) return
        clearTimer()
        pointerRef.current = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, element: event.currentTarget }
        timerRef.current = window.setTimeout(() => {
          if (!pointerRef.current || pointerRef.current.pointerId !== event.pointerId) return
          activeRef.current = id
          setActiveId(id)
          document.body.classList.add('pointer-sorting')
          try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* no-op */ }
        }, 300)
      },
      onPointerMove: (event) => {
        const pointer = pointerRef.current
        if (!pointer || pointer.pointerId !== event.pointerId) return
        if (!activeRef.current) {
          if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8) {
            clearTimer(); pointerRef.current = null
          }
          return
        }
        event.preventDefault()
        const targetId = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-sort-id]')?.dataset.sortId
        if (targetId && targetId !== activeRef.current) onMove(activeRef.current, targetId)
        if (event.clientY < 72) window.scrollBy(0, -14)
        else if (event.clientY > window.innerHeight - 72) window.scrollBy(0, 14)
      },
      onPointerUp: (event) => finish(event.currentTarget, event.pointerId),
      onPointerCancel: (event) => finish(event.currentTarget, event.pointerId),
    }),
  }
}

function moveItem(items, fromId, toId) {
  const next = [...items]
  const from = next.findIndex((item) => (typeof item === 'string' ? item : item.id) === fromId)
  const to = next.findIndex((item) => (typeof item === 'string' ? item : item.id) === toId)
  if (from < 0 || to < 0 || from === to) return items
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function AlbumListScreen({ data, photoMap, onNew, onEdit, onOpen, onCommit, notify }) {
  const [albums, setAlbums] = useState(data.albums)
  useEffect(() => setAlbums(data.albums), [data.albums])
  const sorter = useLongPressSort({
    count: albums.length,
    onMove: (from, to) => setAlbums((current) => moveItem(current, from, to)),
    onFinish: async () => {
      if (await onCommit({ ...data, albums })) notify('並び替えました')
      else setAlbums(data.albums)
    },
  })
  return (
    <div className="screen padded has-nav">
      <PageHeader title="わたしのアルバム" en="my albums" />
      <div className="album-grid">
        {albums.map((album) => {
          const cover = album.cover ? photoMap.get(album.cover) : null
          return (
            <article
              key={album.id}
              data-sort-id={album.id}
              className={`album-sort-item ${sorter.activeId === album.id ? 'sorting' : ''}`}
              {...sorter.bind(album.id)}
            >
              <button type="button" className="album-card" onClick={(event) => {
                if (sorter.suppressClick()) { event.preventDefault(); return }
                onOpen(album)
              }}>
                {cover ? <PhotoArt photo={cover} /> : <div className="album-empty icon-cover">{album.icon || '📖'}</div>}
                <span className="album-tape" />
              </button>
              <div className="album-info">
                <button type="button" onClick={() => onOpen(album)}><b>{album.name}</b><small>{album.playlist.length}ページ</small></button>
                <button type="button" className="album-edit-button" data-no-sort aria-label={`${album.name}を編集`} onClick={() => onEdit(album.id)}>編集</button>
              </div>
            </article>
          )
        })}
      </div>
      <button type="button" className="new-album-btn" onClick={onNew}>＋ 新しいアルバムをつくる</button>
    </div>
  )
}

function NewAlbumScreen({ onBack, onCreate }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📖')
  return (
    <div className="screen padded">
      <BackHeader title="新しいアルバム" onBack={onBack} />
      <p className="intro left">名前とアイコンを決めればOK。<br />ページはストーリーにあげた写真からえらんで入れます。<br />表紙はあとから写真にも変えられます。</p>
      <div className="form-card">
        <label>アルバム名<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>アイコン</label>
        <div className="icon-picks">{ALBUM_ICONS.map((item) => <button type="button" key={item} className={icon === item ? 'on' : ''} onClick={() => setIcon(item)}>{item}</button>)}</div>
      </div>
      <div className="fixed-actions"><button type="button" className="btn ghost" onClick={onBack}>やめる</button><button type="button" className="btn primary" onClick={() => onCreate(name.trim() || 'あたらしいアルバム', icon)}>つくる</button></div>
    </div>
  )
}

function AlbumEditScreen({ album, photos, photoMap, initialTab, onBack, onSettings, onEditPhoto, onCommit, onOpen, notify }) {
  const [tab, setTab] = useState(initialTab)
  const [selected, setSelected] = useState([])
  const [playlist, setPlaylist] = useState(album.playlist)
  useEffect(() => setPlaylist(album.playlist), [album.playlist])
  const commitPlaylist = async (next, toast) => {
    const ok = await onCommit((data) => ({ ...data, albums: data.albums.map((item) => item.id === album.id ? { ...item, playlist: next, cover: next.includes(item.cover) ? item.cover : '' } : item) }))
    if (ok) {
      setPlaylist(next)
      if (toast) notify(toast)
    } else setPlaylist(album.playlist)
  }
  const sorter = useLongPressSort({ count: playlist.length, onMove: (from, to) => setPlaylist((current) => moveItem(current, from, to)), onFinish: () => commitPlaylist(playlist) })
  const addSelected = async () => {
    if (!selected.length) { notify('写真をえらんでください'); return }
    await commitPlaylist([...playlist, ...selected.filter((id) => !playlist.includes(id))], 'リストに追加しました')
    setSelected([])
  }
  return (
    <div className="screen album-edit-screen">
      <BackHeader title={album.name} onBack={onBack} action={<button type="button" aria-label="アルバム設定" onClick={onSettings}>⚙</button>} />
      <div className="tabs"><button type="button" className={tab === 'playlist' ? 'active' : ''} onClick={() => setTab('playlist')}>再生リスト（{playlist.length}）</button><button type="button" className={tab === 'choose' ? 'active' : ''} onClick={() => setTab('choose')}>ストーリーからえらぶ（{photos.length}）</button></div>
      {tab === 'playlist' ? (
        <>
          <p className="tab-help">ここに入れた写真だけが「ひらく」で再生されます。<br />つまみで並び替え、×で外せます。ストーリーからは消えません。</p>
          {playlist.length ? <div className="playlist">{playlist.map((id, index) => {
            const photo = photoMap.get(id); if (!photo) return null
            return <div key={id} data-sort-id={id} className={`playlist-row ${sorter.activeId === id ? 'sorting' : ''}`} {...sorter.bind(id)}><span className="handle">≡</span><button type="button" data-no-sort onClick={() => onEditPhoto(photo)}><PhotoArt photo={photo} /></button><b>{index + 1}</b><p>{photo.caption}</p><button type="button" data-no-sort aria-label="リストから外す" onClick={() => commitPlaylist(playlist.filter((item) => item !== id), 'リストから外しました')}>×</button></div>
          })}</div> : <div className="large-empty"><span>☕</span><p>まだ空です。<br />「ストーリーからえらぶ」で<br />見せたい写真を入れましょう。</p></div>}
          <div className="fixed-actions single"><button type="button" className="btn primary" onClick={() => playlist.length ? onOpen(playlist, album.name) : notify('まだ写真がありません')}>ひらく</button></div>
        </>
      ) : (
        <>
          <p className="tab-help">ストーリーにあげた写真の全部がここに出ます。<br />丸をタップで選んで、下のボタンでこのアルバムへ追加します。</p>
          <div className="choose-days">{DAYS.map((day) => <section key={day}><h2>{day}</h2><div className="choose-grid">{photos.filter((photo) => photo.day === day).map((photo) => {
            const inList = playlist.includes(photo.id); const chosen = selected.includes(photo.id)
            return <button type="button" key={photo.id} className={chosen ? 'selected' : ''} onClick={() => inList ? commitPlaylist(playlist.filter((id) => id !== photo.id), 'リストから外しました') : setSelected((current) => chosen ? current.filter((id) => id !== photo.id) : [...current, photo.id])}><PhotoArt photo={photo} />{inList ? <span className="in-list">リスト内 ×</span> : <i>{chosen ? '✓' : ''}</i>}</button>
          })}</div></section>)}</div>
          <div className="fixed-actions single"><button type="button" className="btn primary" onClick={addSelected}>{selected.length ? `${selected.length}件をリストに追加` : 'リストに追加'}</button></div>
        </>
      )}
    </div>
  )
}

function AlbumSettingsScreen({ album, onBack, onSaveName, onCover, onDelete }) {
  const [name, setName] = useState(album.name)
  return <div className="screen padded"><BackHeader title="アルバム設定" onBack={onBack} /><div className="settings-stack"><section><h2>アルバム名変更</h2><input value={name} onChange={(event) => setName(event.target.value)} /><button type="button" className="btn primary" onClick={() => onSaveName(name.trim() || album.name)}>名前を保存する</button></section><section><h2>表紙設定</h2><p>アイコンか、再生リストの写真をえらべます。</p><button type="button" className="btn soft" onClick={onCover}>表紙をえらぶ</button></section><section className="danger-zone"><h2>アルバム削除</h2><p>写真はストーリーに残ります。</p><button type="button" className="btn danger" onClick={onDelete}>このアルバムを削除</button></section></div></div>
}

function CoverScreen({ album, photoMap, onBack, onChoose }) {
  return <div className="screen padded"><BackHeader title="表紙をえらぶ" onBack={onBack} /><p className="intro left">アイコンか、再生リストの写真をえらべます。</p><h2 className="cover-h">アイコン</h2><div className="cover-grid">{ALBUM_ICONS.map((icon) => <button type="button" key={icon} className={!album.cover && album.icon === icon ? 'chosen' : ''} aria-label={`アイコン ${icon}`} onClick={() => onChoose('', icon)}><div className="auto-cover icon-cover">{icon}</div></button>)}</div><h2 className="cover-h">写真</h2>{album.playlist.length ? <div className="cover-grid">{album.playlist.map((id) => { const photo = photoMap.get(id); return photo ? <button type="button" key={id} className={album.cover === id ? 'chosen' : ''} onClick={() => onChoose(id)}><PhotoArt photo={photo} /><b>{photo.label}</b></button> : null })}</div> : <p className="intro left">再生リストに写真が入ると、ここからえらべます。</p>}</div>
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
  const [selectedAlbumId, setSelectedAlbumId] = useState('a1')
  const [albumTab, setAlbumTab] = useState('playlist')
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

  const commitData = async (nextOrUpdater) => {
    const nextData = typeof nextOrUpdater === 'function' ? nextOrUpdater(data) : nextOrUpdater
    try {
      await saveData(nextData)
      setData(nextData)
      return true
    } catch {
      setToast(SAVE_ERROR)
      return false
    }
  }

  const photoMap = useMemo(() => new Map((data?.photos || []).map((photo) => [photo.id, photo])), [data?.photos])
  const selectedAlbum = data?.albums.find((album) => album.id === selectedAlbumId)

  const createAlbum = async (name, icon) => {
    const album = { id: createId('album'), name, playlist: [], cover: '', icon }
    if (await commitData({ ...data, albums: [...data.albums, album] })) {
      setSelectedAlbumId(album.id)
      setAlbumTab('choose')
      setScreen('album-edit')
      setToast('アルバムをつくりました')
    }
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
        ) : screen === 'albums' ? (
          <AlbumListScreen
            data={data}
            photoMap={photoMap}
            onNew={() => setScreen('album-new')}
            onEdit={(id) => { setSelectedAlbumId(id); setAlbumTab('playlist'); setScreen('album-edit') }}
            onOpen={(album) => album.playlist.length ? undefined : setToast('まだ写真がありません')}
            onCommit={commitData}
            notify={setToast}
          />
        ) : screen === 'album-new' ? (
          <NewAlbumScreen onBack={() => setScreen('albums')} onCreate={createAlbum} />
        ) : screen === 'album-edit' && selectedAlbum ? (
          <AlbumEditScreen
            album={selectedAlbum}
            photos={data.photos}
            photoMap={photoMap}
            initialTab={albumTab}
            onBack={() => setScreen('albums')}
            onSettings={() => setScreen('album-settings')}
            onEditPhoto={(photo) => startEditing([photo], 'album-edit')}
            onCommit={commitData}
            onOpen={() => {}}
            notify={setToast}
          />
        ) : screen === 'album-settings' && selectedAlbum ? (
          <AlbumSettingsScreen
            album={selectedAlbum}
            onBack={() => setScreen('album-edit')}
            onSaveName={async (name) => {
              if (await commitData((current) => ({ ...current, albums: current.albums.map((album) => album.id === selectedAlbum.id ? { ...album, name } : album) }))) setToast('名前を変えました')
            }}
            onCover={() => setScreen('cover')}
            onDelete={() => setConfirmation({
              text: 'このアルバムだけが消えます。\n中の写真はストーリーに残ります。',
              action: async () => {
                if (await commitData((current) => ({ ...current, albums: current.albums.filter((album) => album.id !== selectedAlbum.id) }))) {
                  setConfirmation(null); setScreen('albums'); setToast('アルバムを削除しました')
                }
              },
            })}
          />
        ) : screen === 'cover' && selectedAlbum ? (
          <CoverScreen
            album={selectedAlbum}
            photoMap={photoMap}
            onBack={() => setScreen('album-settings')}
            onChoose={async (cover, icon) => {
              if (await commitData((current) => ({ ...current, albums: current.albums.map((album) => album.id === selectedAlbum.id ? { ...album, cover, icon: icon || album.icon } : album) }))) setToast('表紙をえらびました')
            }}
          />
        ) : (
          <div className="screen has-nav" />
        )}

        {data && ['story', 'albums', 'settings'].includes(screen) && <BottomNav screen={screen} onChange={setScreen} />}
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
