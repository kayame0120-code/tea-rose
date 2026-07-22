export async function convertImageToJpeg(file) {
  const bitmap = await createImageBitmap(file)

  try {
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))

    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas unavailable')

    context.fillStyle = '#FAF6F2'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const jpeg = canvas.toDataURL('image/jpeg', 0.72)
    if (!jpeg.startsWith('data:image/jpeg')) throw new Error('JPEG conversion failed')
    return jpeg
  } finally {
    bitmap.close()
  }
}
