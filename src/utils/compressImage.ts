const IMAGE_SOURCE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
])

export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024

function fitDimensions(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height }
  }
  const ratio = Math.min(maxDimension / width, maxDimension / height)
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

function loadImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen seleccionada.'))
    }
    img.src = url
  })
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.'))),
      'image/webp',
      quality,
    )
  })
}

export function validateImageSource(file: File) {
  if (!IMAGE_SOURCE_TYPES.has(file.type)) {
    throw new Error('Usa una imagen JPG, PNG o WebP.')
  }
}

export async function compressImageToWebp(
  file: File,
  {
    maxDimension = 800,
    quality = 0.85,
    maxBytes = MAX_PROFILE_PHOTO_BYTES,
    minQuality = 0.45,
  } = {},
) {
  validateImageSource(file)

  const img = await loadImageElement(file)
  const { width, height } = fitDimensions(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    maxDimension,
  )

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen.')

  ctx.drawImage(img, 0, 0, width, height)

  let currentQuality = quality
  let blob = await canvasToWebpBlob(canvas, currentQuality)

  while (blob.size > maxBytes && currentQuality > minQuality) {
    currentQuality = Math.max(minQuality, Number((currentQuality - 0.07).toFixed(2)))
    blob = await canvasToWebpBlob(canvas, currentQuality)
  }

  if (blob.size > maxBytes) {
    throw new Error('La imagen sigue siendo demasiado grande. Prueba con otra foto.')
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'perfil'
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' })
}
