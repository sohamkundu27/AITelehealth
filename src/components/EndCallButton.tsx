import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomContext } from '@livekit/components-react';
import { useSession } from '../contexts/SessionContext';

/**
 * End Call button that disconnects from LiveKit and navigates to the Notes page
 * with the collected transcript and visual logs.
 */
export function EndCallButton() {
  const navigate = useNavigate();
  const room = useRoomContext();
  const { symptomLogs, transcriptEntries, sessionId } = useSession();
  
  const handleEndCall = useCallback(async () => {
    console.log('[EndCall] Ending call and generating notes...');
    console.log('[EndCall] Transcript entries:', transcriptEntries.length);
    console.log('[EndCall] Visual logs:', symptomLogs.length);
    
    // Disconnect from LiveKit room
    try {
      await room.disconnect();
      console.log('[EndCall] Disconnected from LiveKit');
    } catch (e) {
      console.warn('[EndCall] Error disconnecting:', e);
    }
    
    // Navigate to notes page with the collected data
    navigate('/notes', {
      state: {
        transcript: transcriptEntries,
        visualLogs: symptomLogs,
        sessionId: sessionId || `session-${Date.now()}`,
      },
    });
  }, [navigate, room, symptomLogs, transcriptEntries, sessionId]);

  return (
    <>
      <button className="end-call-button" onClick={handleEndCall}>
        <span className="end-call-icon">📋</span>
        <span className="end-call-text">End Call & Generate Notes</span>
      </button>
      
      <style>{`
        .end-call-button {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          
          display: flex;
          align-items: center;
          gap: 10px;
          
          background: linear-gradient(135deg, #dc3545, #c82333);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 50px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          
          box-shadow: 0 6px 24px rgba(220, 53, 69, 0.4);
          transition: all 0.2s ease;
        }
        
        .end-call-button:hover {
          transform: translateX(-50%) translateY(-2px);
          box-shadow: 0 8px 32px rgba(220, 53, 69, 0.5);
          background: linear-gradient(135deg, #e04555, #d63447);
        }
        
        .end-call-button:active {
          transform: translateX(-50%) translateY(0);
        }
        
        .end-call-icon {
          font-size: 18px;
        }
        
        .end-call-text {
          white-space: nowrap;
        }
      `}</style>
    </>
  );
}
