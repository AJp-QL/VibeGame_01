import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { browserStorage, createPlayStats } from './playStats.ts'
import './styles.css'

const root = document.getElementById('root')
if (root === null) throw new Error('#root element missing from index.html')

// Counted here, once per page load (StrictMode would run a component's setup twice).
const stats = createPlayStats(browserStorage())
stats.recordAppOpen()

createRoot(root).render(
  <StrictMode>
    <App stats={stats} />
  </StrictMode>,
)
