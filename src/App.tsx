import { AppProviders } from './app/AppProviders'
import { AppRouter } from './app/AppRouter'
import { useNativeSplash } from './hooks/useNativeSplash'

function App() {
  useNativeSplash()

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}

export default App
