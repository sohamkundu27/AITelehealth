import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import '@livekit/components-styles';
import App from './App.tsx'
import { Notes } from './pages/Notes.tsx'
import { VisitSummary } from './pages/VisitSummary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/visit-summary/:sessionId" element={<VisitSummary />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
