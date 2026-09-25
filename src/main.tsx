import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensurePasskeyBootstrap } from './features/auth/passkeyBootstrap'
import { bootstrapGeliaTheme } from './theme/bootstrapTheme'

async function bootstrap() {
  await ensurePasskeyBootstrap()
  bootstrapGeliaTheme()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
