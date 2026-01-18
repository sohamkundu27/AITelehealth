import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import { useEffect, useState } from 'react';
import { PdfUpload } from './components/PdfUpload';
import { CallWithSTT } from './components/CallWithSTT';
import { LandingPage } from './components/LandingPage';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import { PatientClarificationPanelContainer } from './components/PatientClarificationPanel';
import { VisitManager } from './components/VisitManager';
import { VisitSummary } from './pages/VisitSummary';
import { TranscriptSummary } from './pages/TranscriptSummary';
import { useRole } from './hooks/useRole';
import { SessionProvider } from './contexts/SessionContext';
import '@livekit/components-styles';
import './App.css';
import { RoleContext } from './contexts/RoleContext';

/**
 * Flow: 
 * Patient: Click "Enter Meeting" → Join call
 * Doctor: Upload patient medical PDF → Join call
 */
function App() {
  const [welcomeAcknowledged, setWelcomeAcknowledged] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [token, setToken] = useState('');
  const role = useRole();

  // Detect visit summary route, but keep hooks unconditionally called
  const path = window.location.pathname;
  const hash = window.location.hash;
  const summarySessionId = path.startsWith('/visit-summary/')
    ? path.split('/visit-summary/')[1]
    : (hash.startsWith('#/visit-summary/') ? hash.split('#/visit-summary/')[1] : null);

  const transcriptSessionId = path.startsWith('/visit-transcript/')
    ? path.split('/visit-transcript/')[1]
    : (hash.startsWith('#/visit-transcript/') ? hash.split('#/visit-transcript/')[1] : null);

  // Fetch LiveKit token once ready
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

  // Render visit summary when routed
  if (summarySessionId) {
    return (
      <ThemeProvider>
        <ThemeToggle />
        <VisitSummary sessionId={summarySessionId} />
      </ThemeProvider>
    );
  }

  // Render transcript summary when routed
  if (transcriptSessionId) {
    return (
      <ThemeProvider>
        <ThemeToggle />
        <TranscriptSummary />
      </ThemeProvider>
    );
  }

  // Step 1: Patient sees "Enter Meeting", Doctor uploads PDF
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
    if (role === 'patient') {
      return (
        <div className="app-step app-upload">
          <div style={{ maxWidth: '420px', margin: '0 auto', textAlign: 'center', padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', color: '#fff' }}>Ready to join?</h2>
            <button
              onClick={() => setPdfReady(true)}
              style={{
                background: '#0a0',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '24px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Enter Meeting
            </button>
          </div>
        </div>
      );
    }
    
    // Doctor uploads patient medical history
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
            <PatientClarificationPanelContainer />
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
