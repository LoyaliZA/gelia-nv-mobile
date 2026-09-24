import { Camera, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { ProfileAvatar } from '../../components/profile/ProfileAvatar'
import { Icon } from '../../components/ui/Icon'
import { ApiError } from '../../lib/api/apiClient'
import { resolveProfilePhotoUrl } from '../../lib/geliaAssets'
import { compressImageToWebp } from '../../utils/compressImage'
import type { MobileSession } from '../auth/auth.types'
import { removeProfilePhoto, uploadProfilePhoto } from './profile.api'

interface PerfilViewProps {
  onLogout: () => Promise<void>
  onSessionUpdate: (session: MobileSession) => void
  session: MobileSession
}

export function PerfilView({ onLogout, onSessionUpdate, session }: PerfilViewProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const photoUrl = previewUrl || resolveProfilePhotoUrl(session.user)

  const seleccionarFoto = () => {
    inputRef.current?.click()
  }

  const manejarArchivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0]
    event.target.value = ''
    if (!archivo) return

    setProcesando(true)
    setError('')
    setMensaje('')
    try {
      const comprimido = await compressImageToWebp(archivo)
      const preview = URL.createObjectURL(comprimido)
      setPreviewUrl(preview)
      const actualizado = await uploadProfilePhoto(session, comprimido)
      onSessionUpdate(actualizado)
      setPreviewUrl(null)
      URL.revokeObjectURL(preview)
      setMensaje('Foto de perfil actualizada.')
    } catch (caught) {
      setPreviewUrl(null)
      setError(caught instanceof ApiError ? caught.message : (caught instanceof Error ? caught.message : 'No se pudo subir la foto.'))
    } finally {
      setProcesando(false)
    }
  }

  const eliminarFoto = async () => {
    setProcesando(true)
    setError('')
    setMensaje('')
    try {
      const actualizado = await removeProfilePhoto(session)
      setPreviewUrl(null)
      onSessionUpdate(actualizado)
      setMensaje('Foto de perfil eliminada.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo eliminar la foto.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="page-stack">
      <header className="page-heading"><span className="eyebrow">CUENTA GELIA_</span><h1>Mi perfil</h1></header>
      <section className="profile-card">
        <div className="profile-photo-editor">
          {photoUrl ? (
            <img alt="" className="profile-avatar profile-avatar--lg profile-avatar__image" src={photoUrl} />
          ) : (
            <ProfileAvatar size="lg" user={session.user} />
          )}
          <div className="profile-photo-actions">
            <button className="secondary-button profile-photo-btn" disabled={procesando} onClick={seleccionarFoto} type="button">
              <Camera size={16} />
              {procesando ? 'Subiendo…' : 'Cambiar foto'}
            </button>
            {(session.user.foto_perfil || photoUrl) && (
              <button className="logout-button profile-photo-btn" disabled={procesando} onClick={() => void eliminarFoto()} type="button">
                <Trash2 size={16} />
                Quitar
              </button>
            )}
          </div>
          <input
            accept="image/jpeg,image/png,image/jpg,image/webp"
            className="profile-photo-input"
            onChange={(event) => void manejarArchivo(event)}
            ref={inputRef}
            type="file"
          />
        </div>
        <h2>{session.user.name}</h2>
        <p>{session.user.email || session.user.username}</p>
        <div className="profile-meta"><span>Dispositivo</span><strong>{session.device.nombre || 'GELIA Móvil'}</strong></div>
        <div className="profile-meta"><span>Permisos móviles</span><strong>{session.permissions.length}</strong></div>
        {error && <div className="form-error" role="alert">{error}</div>}
        {mensaje && <p className="passkey-success">{mensaje}</p>}
      </section>

      <button className="logout-button" onClick={() => void onLogout()}><Icon name="logout" /> Cerrar sesión</button>
    </div>
  )
}
