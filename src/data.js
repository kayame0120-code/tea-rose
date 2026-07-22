const PHOTO_ROWS = [
  ['韓国ドラマ', '📺', '#826F75', '最終回、涙腺崩壊…', '3日で全16話みた。しばらく引きずるやつ', 'きょう'],
  ['韓国ドラマ', '🎧', '#A78F8A', 'OSTがずっと頭にいる', 'サントラ通勤のおとも', 'きのう'],
  ['推し活', '✨', '#C49799', '推しの新作決定！', '情報解禁の日にスクショした', 'きのう'],
  ['スコーン', '🥐', '#CDAF89', 'はじめてのスコーン', '外はさっくり、なかはしっとり', '7月16日'],
  ['ごはん', '🍲', '#B98C78', '自信作', 'クリームシチュー、いちばん上手にできた', '7月16日'],
  ['カフェ', '🫖', '#8D796A', 'ずっと来たかった', '紅茶がポットで出てくるお店', '7月16日'],
  ['海', '🌊', '#718D92', '夕方の海', '風が気持ちよかった', '7月14日'],
  ['パン', '🍞', '#B88D65', '帰り道のパン屋', '帰りに寄ったパン屋さん', '7月14日'],
  ['花', '🌷', '#C68D91', '春の色', '駅前で見つけた', '7月14日'],
  ['おでかけ', '🚃', '#8C9A84', '小さな旅', '窓からの景色', '7月10日'],
  ['日常', '📱', '#7C706A', '忘れたくないメモ', '今日のスクリーンショット', '7月10日'],
  ['カフェ', '☕', '#9A7662', '午後の一杯', '静かな席でひと休み', '7月10日'],
  ['ごはん', '🍰', '#D0A4A0', 'ごほうび', '季節のケーキ', '7月10日'],
]

const EDITOR_WIDTH = 340

export function createInitialData() {
  return {
    photos: PHOTO_ROWS.map((row, index) => ({
      id: `p${index + 1}`,
      image: '',
      label: row[0],
      emoji: row[1],
      tone: row[2],
      day: row[5],
      createdAt: new Date(2026, 6, 18 - index).toISOString(),
      caption: row[4],
      overlays:
        index < 7
          ? [
              {
                id: `o${index}`,
                text: row[3],
                x: 50,
                y: 28 + (index % 3) * 15,
                size: (21 / EDITOR_WIDTH) * 100,
                rotation: 0,
                color: '#FAF6F2',
              },
            ]
          : [],
      rotation: 0,
    })),
    albums: [
      { id: 'a1', name: '韓ドラの記録', playlist: ['p1', 'p2', 'p3'], cover: '', icon: '🎬' },
      { id: 'a2', name: 'きょうのごはん', playlist: ['p5', 'p13'], cover: '', icon: '🍚' },
      { id: 'a3', name: 'カフェめぐり', playlist: ['p6', 'p12', 'p4'], cover: 'p6', icon: '☕' },
      { id: 'a4', name: 'おでかけ', playlist: ['p7', 'p9', 'p10'], cover: '', icon: '🌊' },
    ],
    overlaySizeUnit: 'percent',
  }
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
