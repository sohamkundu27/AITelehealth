import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import { useEffect, useState, createContext, useContext } from 'react';
import { PdfUpload } from './components/PdfUpload';
import { CallWithSTT } from './components/CallWithSTT';
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
 * Flow: 1) Upload medical PDF → 2) Start call (LiveKit) → 3) STT detects prescriptions
 * → 4) Conflict check (Browserbase or RxNav) with on-screen indicator.
 * → 5) Post-visit safety check and summary
 */
function App() {
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

  // Step 1: PDF upload
  if (!pdfReady) {
    return (
      <div className="app-step app-upload">
        <PdfUpload onReady={() => setPdfReady(true)} />
      </div>
    );
  }

  // Step 2: Waiting for token
  if (!token) {
    return (
      <div className="app-step app-loading">
        Loading secure connection…
      </div>
    );
  }

  // Step 3–4: LiveKit call with STT + conflict check
  return (
    <SessionProvider>
      <RoleContext.Provider value={role}>
        <LiveKitRoom
          serverUrl={import.meta.env.VITE_PUBLIC_LIVEKIT_URL}
          token={token}
          connect={true}
          video={true}
          audio={true}
          data-lk-theme="default"
          style={{ height: '100vh', width: '100vw', background: '#000' }}
          onDisconnected={() => console.log('Disconnected from room')}
        >
        <VisitManager />
        <CallWithSTT />
        <OvershootDemo />
        <PatientClarificationPanelContainer />
        <SessionDebugPanel />
        {/* VideoConference handles the layout; grid shows participants. */}
        <VideoConference />
        {/* Essential for audio playback */}
        <RoomAudioRenderer />
        </LiveKitRoom>
      </RoleContext.Provider>
    </SessionProvider>
  );
}

export default App;
