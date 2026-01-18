import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import { useEffect, useState, createContext, useContext } from 'react';
import { PdfUpload } from './components/PdfUpload';
import { CallWithSTT } from './components/CallWithSTT';
import { VisualScribe } from './components/VisualScribe';
import { TranscriptPanel } from './components/TranscriptPanel';
import { EndCallButton } from './components/EndCallButton';
import { PatientClarificationPanelContainer } from './components/PatientClarificationPanel';
import { SessionDebugPanel } from './components/SessionDebugPanel';
import { VisitManager } from './components/VisitManager';
import { useRole, type UserRole } from './hooks/useRole';
import { SessionProvider } from './contexts/SessionContext';
import '@livekit/components-styles';
import './App.css';

// Role context for components to access
const RoleContext = createContext<UserRole>(null);

export const useRoleContext = () => useContext(RoleContext);

/**
 * Visual Symptom Logger - Telehealth application that:
 * 1) Uploads medical PDF → 2) Starts LiveKit call → 3) Records visual symptoms via VisualScribe
 * → 4) Transcribes audio locally via Whisper → 5) Generates SOAP notes via Gemini
 */
function App() {
  const [pdfReady, setPdfReady] = useState(false);
  const [token, setToken] = useState('');
  const role = useRole();

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

  // Step 3–5: LiveKit call with VisualScribe + Whisper transcription + Notes generation
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
          
          {/* Visual Symptom Logger - analyzes remote video for physical symptoms */}
          <VisualScribe />
          
          {/* Local Whisper transcription panel */}
          <TranscriptPanel />
          
          {/* End call button - navigates to Notes page */}
          <EndCallButton />
          
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
