import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@shared/index.css'
import { reportIslandHeight } from '@shared/reportHeight'
import App from './App'

reportIslandHeight('velorah-hero')
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
