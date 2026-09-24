import { useState } from 'react'
import { resolveProfilePhotoUrl } from '../../lib/geliaAssets'
import type { GeliaUser } from '../../features/auth/auth.types'

interface ProfileAvatarProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  user: GeliaUser
}

const sizeClass = {
  sm: 'profile-avatar--sm',
  md: 'profile-avatar',
  lg: 'profile-avatar--lg',
} as const

export function ProfileAvatar({ className = '', size = 'md', user }: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false)
  const photoUrl = resolveProfilePhotoUrl(user)
  const initial = user.name.charAt(0).toUpperCase()
  const classes = [sizeClass[size], className].filter(Boolean).join(' ')

  if (photoUrl && !failed) {
    return (
      <img
        alt=""
        className={`${classes} profile-avatar__image`}
        onError={() => setFailed(true)}
        src={photoUrl}
      />
    )
  }

  return <div aria-hidden="true" className={classes}>{initial}</div>
}
