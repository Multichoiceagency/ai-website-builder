import { createRoot } from 'react-dom/client'
import '@shared/index.css'
import { reportIslandHeight } from '@shared/reportHeight'
import App from './App'

reportIslandHeight('bold-studio')
createRoot(document.getElementById('root')!).render(<App />)
