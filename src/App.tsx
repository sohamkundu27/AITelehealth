import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import { useEffect, useState } from 'react';
import { CallWithSTT } from './components/CallWithSTT';
import { OvershootDemo } from './components/OvershootDemo';
import { DoctorDashboard } from './components/DoctorDashboard';
import '@livekit/components-styles';
import './App.css';

type Role = 'doctor' | 'patient';

/**
 * Flow: 1) Upload medical PDF → 2) Start call (LiveKit) → 3) STT detects prescriptions
 * → 4) Conflict check (Browserbase or RxNav) with on-screen indicator.
 * 
 * Patient side: Sends Overshoot AI data to doctor
 * Doctor side: Receives and displays patient data
 */
function App() {
  // Check URL parameter first, then localStorage, then prompt user
  const getInitialRole = (): Role | null => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlRole = urlParams.get('role') as Role | null;
    if (urlRole === 'doctor' || urlRole === 'patient') {
      return urlRole;
    }
    // Check localStorage for previous selection
    const stored = localStorage.getItem('userRole') as Role | null;
    if (stored === 'doctor' || stored === 'patient') {
      return stored;
    }
    return null;
  };

  const [role, setRole] = useState<Role | null>(getInitialRole());
  const [roomCode, setRoomCode] = useState<string>('');
  const [pdfReady, setPdfReady] = useState(false);
  const [token, setToken] = useState('');

  // Save role to localStorage when changed
  useEffect(() => {
    if (role) {
      localStorage.setItem('userRole', role);
    }
  }, [role]);

  // Generate room code for doctor when role is selected
  useEffect(() => {
    if (role === 'doctor' && !roomCode) {
      // Doctor creates room - generate code immediately
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomCode(code);
    }
  }, [role, roomCode]);

  // Fetch LiveKit token only when pdfReady is true (user clicked "Start Call")
  useEffect(() => {
    if (!pdfReady || !role || !roomCode) return;
    
    (async () => {
      try {
        const res = await fetch(`/getToken?role=${role}&room=${roomCode}`);
        setToken(await res.text());
      } catch (e) {
        console.error('Failed to generate token', e);
      }
    })();
  }, [pdfReady, role, roomCode]);

  // Step 0: Role selection
  if (!role) {
    return (
      <div className="app-step app-role-select">
        <h2>Select Your Role</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '32px', fontSize: '14px', textAlign: 'center', maxWidth: '500px' }}>
          Choose your role to begin. Doctors will receive a room code to share with patients.
        </p>
        <div className="role-buttons">
          <button 
            className="role-btn doctor-btn"
            onClick={() => setRole('doctor')}
          >
            👨‍⚕️ Doctor
            <span className="role-desc">Upload PDF, prescribe medications, see patient status</span>
          </button>
          <button 
            className="role-btn patient-btn"
            onClick={() => setRole('patient')}
          >
            👤 Patient
            <span className="role-desc">Join call, your comprehension is monitored</span>
          </button>
        </div>
        <style>{`
          .app-role-select {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            padding: 24px;
          }
          .app-role-select h2 {
            margin-bottom: 32px;
            font-size: 24px;
          }
          .role-buttons {
            display: flex;
            gap: 24px;
            flex-wrap: wrap;
            justify-content: center;
          }
          .role-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 32px 48px;
            color: white;
            font-size: 20px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            min-width: 240px;
          }
          .role-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.4);
            transform: translateY(-4px);
          }
          .doctor-btn:hover {
            border-color: #00aaff;
            box-shadow: 0 8px 24px rgba(0, 170, 255, 0.3);
          }
          .patient-btn:hover {
            border-color: #00ff88;
            box-shadow: 0 8px 24px rgba(0, 255, 136, 0.3);
          }
          .role-desc {
            font-size: 14px;
            font-weight: 400;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
          }
        `}</style>
      </div>
    );
  }

  // Step 1a: Doctor sees room code and "Start Call" button
  if (role === 'doctor' && !pdfReady) {
    return (
      <div className="app-step app-doctor-ready">
        <h2>Your Room Code</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '32px', textAlign: 'center', maxWidth: '400px' }}>
          Share this code with your patient so they can join the call
        </p>
        <div style={{
          background: 'rgba(0, 200, 100, 0.2)',
          border: '2px solid #00ff88',
          borderRadius: '16px',
          padding: '32px 40px',
          color: 'white',
          marginBottom: '32px',
          minWidth: '280px',
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0, 255, 136, 0.3)'
        }}>
          <div style={{ 
            fontSize: '48px', 
            fontWeight: 'bold', 
            letterSpacing: '8px', 
            fontFamily: 'monospace',
            marginBottom: '16px',
            background: 'rgba(0,0,0,0.3)',
            padding: '16px',
            borderRadius: '12px'
          }}>
            {roomCode}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(roomCode);
              alert('Room code copied to clipboard!');
            }}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
          >
            📋 Copy Code
          </button>
        </div>
        <button
          onClick={() => setPdfReady(true)}
          style={{
            padding: '16px 48px',
            fontSize: '18px',
            background: '#00ff88',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s',
            boxShadow: '0 4px 16px rgba(0, 255, 136, 0.4)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#00cc6a';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#00ff88';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 255, 136, 0.4)';
          }}
        >
          Start Call
        </button>
        <style>{`
          .app-doctor-ready {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            padding: 24px;
          }
          .app-doctor-ready h2 {
            margin-bottom: 8px;
            font-size: 28px;
          }
        `}</style>
      </div>
    );
  }

  // Step 1b: Patient needs to enter room code (only show if they haven't entered code or clicked join)
  if (role === 'patient' && (!roomCode || (roomCode && !pdfReady))) {
    return (
      <div className="app-step app-room-code">
        <h2>Enter Room Code</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '24px', textAlign: 'center', maxWidth: '400px' }}>
          Ask the doctor for the room code to join the call
        </p>
        <input
          type="text"
          value={roomCode}
          onChange={(e) => {
            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            setRoomCode(value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && roomCode.length >= 3) {
              setPdfReady(true);
            }
          }}
          placeholder="Enter room code (e.g., ABC123)"
          maxLength={6}
          autoFocus
          style={{
            padding: '12px 16px',
            fontSize: '18px',
            textAlign: 'center',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            borderRadius: '8px',
            border: '2px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            width: '200px',
            marginBottom: '16px',
            outline: 'none',
            transition: 'all 0.2s'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#00ff88';
            e.target.style.background = 'rgba(255,255,255,0.15)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255,255,255,0.2)';
            e.target.style.background = 'rgba(255,255,255,0.1)';
          }}
        />
        <button
          onClick={() => setPdfReady(true)}
          disabled={roomCode.length < 3}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: roomCode.length >= 3 ? '#00ff88' : '#444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: roomCode.length >= 3 ? 'pointer' : 'not-allowed',
            fontWeight: '600',
            transition: 'all 0.2s',
            opacity: roomCode.length >= 3 ? 1 : 0.5
          }}
        >
          Join Call
        </button>
        {roomCode.length > 0 && roomCode.length < 3 && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '8px' }}>
            Room code must be at least 3 characters
          </p>
        )}
        <style>{`
          .app-room-code {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            padding: 24px;
          }
          .app-room-code h2 {
            margin-bottom: 8px;
          }
        `}</style>
      </div>
    );
  }


  // Step 2: Waiting for token
  if (!token) {
    return (
      <div className="app-step app-loading">
        {role === 'doctor' && roomCode && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 200, 100, 0.2)',
            border: '2px solid #00ff88',
            borderRadius: '12px',
            padding: '20px 28px',
            color: 'white',
            zIndex: 10000,
            boxShadow: '0 8px 24px rgba(0, 255, 136, 0.3)',
            minWidth: '180px'
          }}>
            <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Your Room Code
            </div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              letterSpacing: '6px', 
              fontFamily: 'monospace',
              marginBottom: '12px',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.2)',
              padding: '8px',
              borderRadius: '8px'
            }}>
              {roomCode}
            </div>
            <div style={{ 
              fontSize: '11px', 
              marginTop: '8px', 
              opacity: 0.7,
              textAlign: 'center',
              lineHeight: '1.4'
            }}>
              Share this code with your patient so they can join
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomCode);
                alert('Room code copied to clipboard!');
              }}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '8px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
            >
              📋 Copy Code
            </button>
          </div>
        )}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '100vh',
          color: 'white'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '16px' }}>Loading secure connection…</div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(255,255,255,0.2)', 
            borderTopColor: '#00ff88',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Step 3–4: LiveKit call with role-specific components
  return (
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
      {/* Doctor-side components */}
      {role === 'doctor' && (
        <>
          <CallWithSTT />
          <DoctorDashboard />
        </>
      )}
      
      {/* Patient-side components */}
      {role === 'patient' && (
        <OvershootDemo />
      )}
      
      {/* VideoConference handles the layout; grid shows participants. */}
      <VideoConference layout="grid" />
      {/* Essential for audio playback */}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

export default App;
