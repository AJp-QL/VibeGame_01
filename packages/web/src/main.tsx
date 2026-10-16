import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { createPlayStats } from '@mt/session'
import { browserStorage } from './storage.ts'
import './styles.css'

const root = document.getElementById('root')
if (root === null) throw new Error('#root element missing from index.html')

// Counted here, once per page load (StrictMode would run a component's setup twice).
const stats = createPlayStats(browserStorage(), () => new Date())
stats.recordAppOpen()

createRoot(root).render(
  <StrictMode>
    <App stats={stats} />
  </StrictMode>,
)
