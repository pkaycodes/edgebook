import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/space-grotesk'
import './index.css'
import './styles/auth.css'
import './styles/dashboard.css'
import './styles/trades.css'
import './styles/insights.css'
import './styles/responsive.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
