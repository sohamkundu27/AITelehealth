import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import { useEffect, useState, createContext, useContext } from 'react';
import { PdfUpload } from './components/PdfUpload';
import { CallWithSTT } from './components/CallWithSTT';
import { LandingPage } from './components/LandingPage';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import { OvershootDemo } from './components/OvershootDemo';
import { PatientClarificationPanelContainer } from './components/PatientClarificationPanel';
import { SessionDebugPanel } from './components/SessionDebugPanel';
import { VisitManager } from './components/VisitManager';
import { VisitSummary } from './pages/VisitSummary';
import { useRole, type UserRole } from './hooks/useRole';
import { SessionProvider } from './contexts/SessionContext';
import '@livekit/components-styles';
import './App.css';

// Role context for components to access
const RoleContext = createContext<UserRole>(null);

export const useRoleContext = () => useContext(RoleContext);

/**
 * Flow: 0) Landing page → 1) Upload medical PDF → 2) Start call (LiveKit) → 3) STT detects prescriptions
 * → 4) Conflict check (Browserbase or RxNav) with on-screen indicator.
 * → 5) Post-visit safety check and summary
 */
function App() {
  const [welcomeAcknowledged, setWelcomeAcknowledged] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [token, setToken] = useState('');
  const role = useRole();

  // Check if we're on the visit summary page
  const path = window.location.pathname;
  const hash = window.location.hash;
  if (path.startsWith('/visit-summary/')) {
    const sessionId = path.split('/visit-summary/')[1];
    return <VisitSummary sessionId={sessionId} />;
  }
  if (hash.startsWith('#/visit-summary/')) {
    const sessionId = hash.split('#/visit-summary/')[1];
    return <VisitSummary sessionId={sessionId} />;
  }

  // Fetch LiveKit token only after user has uploaded PDF and clicked "Start call"
  useEffect(() => {
    if (!pdfReady) return;
    (async () => {
      try {
        // Pass role to token generation
        const roleParam = role === 'patient' ? 'patient' : 'doctor';
        const res = await fetch(`/getToken?role=${roleParam}`);
        setToken(await res.text());
      } catch (e) {
        console.error('Failed to generate token', e);
      }
    })();
  }, [pdfReady, role]);

  // Step 0: Landing page
  if (!welcomeAcknowledged) {
    return (
      <ThemeProvider>
        <ThemeToggle />
        <LandingPage onGetStarted={() => setWelcomeAcknowledged(true)} />
      </ThemeProvider>
    );
  }

  // Step 1: PDF upload
  if (!pdfReady) {
    return (
      <ThemeProvider>
        <ThemeToggle />
        <div className="app-step app-upload">
          <PdfUpload onReady={() => setPdfReady(true)} />
        </div>
      </ThemeProvider>
    );
  }

  // Step 2: Waiting for token
  if (!token) {
    return (
      <ThemeProvider>
        <ThemeToggle />
        <div className="app-step app-loading">
          <div className="app-loading-spinner" />
          <span>Loading secure connection…</span>
        </div>
      </ThemeProvider>
    );
  }

  // Step 3–4: LiveKit call with STT + conflict check
  return (
    <ThemeProvider>
      <SessionProvider>
        <RoleContext.Provider value={role}>
          <ThemeToggle />
          <LiveKitRoom
            serverUrl={import.meta.env.VITE_PUBLIC_LIVEKIT_URL}
            token={token}
            connect={true}
            video={true}
            audio={true}
            data-lk-theme="default"
            style={{ height: '100vh', width: '100vw', background: 'var(--bg-primary)' }}
            onDisconnected={() => console.log('Disconnected from room')}
          >
            <VisitManager />
            <CallWithSTT />
            <OvershootDemo />
            <PatientClarificationPanelContainer />
            <SessionDebugPanel />
            {/* VideoConference handles the layout; grid shows participants. */}
            <VideoConference layout="grid" />
            {/* Essential for audio playback */}
            <RoomAudioRenderer />
          </LiveKitRoom>
        </RoleContext.Provider>
      </SessionProvider>
    </ThemeProvider>
  );
}

export default App;
