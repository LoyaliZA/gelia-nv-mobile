import { Camera, CameraDirection, CameraErrorCode } from '@capacitor/camera'
import type { MediaResult } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
import { compressImageToWebp } from '../../utils/compressImage'

const EVIDENCE_MAX_BYTES = 4.5 * 1024 * 1024

export const AVISO_CAMARA_RESGUARDO =
  'Gelia usa la cámara solo para fotografiar el paquete y el ticket de este resguardo. La imagen se envía al servidor de la sucursal y no se guarda en la galería del dispositivo.'

function fileFromBase64(base64: string, name: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new File([bytes], `${name}.jpg`, { type: 'image/jpeg' })
}

async function fileFromMedia(result: MediaResult, name: string) {
  if (result.webPath) {
    const response = await fetch(result.webPath)
    const blob = await response.blob()
    const type = blob.type.startsWith('image/') ? blob.type : 'image/jpeg'
    const extension = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'
    return new File([blob], `${name}.${extension}`, { type })
  }

  if (result.thumbnail) return fileFromBase64(result.thumbnail, name)
  throw new Error('No se obtuvo la imagen.')
}

export async function prepararArchivoEvidencia(file: File, name: string) {
  const compressed = await compressImageToWebp(file, {
    maxDimension: 1600,
    quality: 0.82,
    maxBytes: EVIDENCE_MAX_BYTES,
    minQuality: 0.4,
  })
  return new File([compressed], `${name}.webp`, { type: compressed.type })
}

export function cameraNativaDisponible() {
  return Capacitor.isNativePlatform()
}

function esCancelacion(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  const code = String(error.code)
  return code === CameraErrorCode.TakePhotoCancelled || code === CameraErrorCode.ChooseMediaCancelled
}

async function asegurarCamara() {
  const current = await Camera.checkPermissions()
  if (current.camera === 'granted') return
  const requested = await Camera.requestPermissions({ permissions: ['camera'] })
  if (requested.camera !== 'granted') {
    throw new Error('La cámara no está autorizada. Actívala en los ajustes de la app o elige una imagen de la galería.')
  }
}

export async function capturarEvidencia(source: 'camera' | 'photos', name: string) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Usa el selector de archivos para adjuntar la imagen.')
  }

  try {
    if (source === 'photos') {
      const gallery = await Camera.chooseFromGallery({
        quality: 80,
        correctOrientation: true,
        allowMultipleSelection: false,
      })
      const selected = gallery.results[0]
      if (!selected) return null
      return prepararArchivoEvidencia(await fileFromMedia(selected, name), name)
    }

    await asegurarCamara()
    const photo = await Camera.takePhoto({
      quality: 80,
      correctOrientation: true,
      saveToGallery: false,
      cameraDirection: CameraDirection.Rear,
    })
    return prepararArchivoEvidencia(await fileFromMedia(photo, name), name)
  } catch (error) {
    if (esCancelacion(error)) return null
    throw error
  }
}
