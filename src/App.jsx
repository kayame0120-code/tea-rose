import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { createId, createInitialData } from './data.js'
import { convertImageToJpeg } from './image.js'
import { loadData, saveData } from './storage.js'

const DAYS = ['きょう', 'きのう', '7月16日', '7月14日', '7月10日']
const SAVE_ERROR = '保存容量がいっぱいです。写真を減らしてください'

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

function StoryScreen({ data, onOpenPicker }) {
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
                        onClick={() => (selectingDay === day ? toggleSelected(photo.id) : undefined)}
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
          <button type="button" className="btn primary" disabled={!selectedIds.length} onClick={() => {}}>
            {selectedIds.length}枚をまとめて編集
          </button>
        </div>
      )}
    </div>
  )
}

function PickerScreen({ data, onBack, onSave, notify }) {
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
    const selected = new Set(selectedIds)
    const newPhotos = temporaryPhotos.filter((photo) => selected.has(photo.id))
    onSave(newPhotos)
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

  useEffect(() => {
    let active = true
    async function initialise() {
      try {
        const stored = await loadData()
        if (!active) return
        if (stored) {
          setData(stored)
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
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const openPicker = () => {
    setScreen('picker')
    window.scrollTo(0, 0)
  }

  const saveImportedPhotos = async (photos) => {
    if (!photos.length) {
      setScreen('story')
      return
    }
    const nextData = { ...data, photos: [...photos, ...data.photos] }
    try {
      await saveData(nextData)
      setData(nextData)
      setScreen('story')
      setToast(photos.length === 1 ? 'ストーリーにあげました' : `${photos.length}枚をストーリーにあげました`)
    } catch {
      setToast(SAVE_ERROR)
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
            onSave={saveImportedPhotos}
            notify={setToast}
          />
        ) : screen === 'story' ? (
          <StoryScreen data={data} onOpenPicker={openPicker} />
        ) : (
          <div className="screen has-nav" />
        )}

        {data && screen !== 'picker' && <BottomNav screen={screen} onChange={setScreen} />}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </div>
    </main>
  )
}

export default App
