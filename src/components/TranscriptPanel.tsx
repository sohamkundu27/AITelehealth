import { useEffect } from 'react';
import { useLocalWhisper } from '../hooks/useLocalWhisper';
import { useSession } from '../contexts/SessionContext';

/**
 * TranscriptPanel: Displays live transcription from local Whisper.
 * Runs entirely in the browser using @xenova/transformers.
 */
export function TranscriptPanel() {
  const { transcript, isLoading, isModelReady, modelProgress, error } = useLocalWhisper();
  const { addTranscriptEntry } = useSession();
  
  // Add new transcript entries to session
  useEffect(() => {
    if (transcript.length > 0) {
      const lastEntry = transcript[transcript.length - 1];
      addTranscriptEntry(lastEntry, 'unknown');
    }
  }, [transcript.length, addTranscriptEntry]);

  return (
    <div className="transcript-panel">
      <div className="transcript-header">
        <div className="transcript-status">
          <span className={`status-dot ${isModelReady ? 'ready' : 'loading'}`} />
          <span className="status-text">
            {!isModelReady 
              ? `Loading Whisper (${modelProgress}%)` 
              : isLoading 
                ? 'Transcribing...' 
                : 'Listening'}
          </span>
        </div>
      </div>
      
      {error && (
        <div className="transcript-error">
          {error}
        </div>
      )}
      
      {!isModelReady && (
        <div className="transcript-loading">
          <div className="loading-bar">
            <div className="loading-progress" style={{ width: `${modelProgress}%` }} />
          </div>
          <p>Downloading Whisper model (~40MB)...</p>
        </div>
      )}
      
      <div className="transcript-content">
        {transcript.length === 0 ? (
          <p className="transcript-empty">
            {isModelReady ? 'Waiting for speech...' : 'Loading model...'}
          </p>
        ) : (
          transcript.slice(-5).map((text, i) => (
            <p key={i} className="transcript-entry">
              {text}
            </p>
          ))
        )}
      </div>
      
      <style>{`
        .transcript-panel {
          position: fixed;
          bottom: 80px;
          left: 20px;
          width: 320px;
          max-height: 250px;
          background: rgba(15, 15, 20, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 14px;
          color: white;
          z-index: 9998;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        
        .transcript-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .transcript-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .status-dot.ready {
          background: #00ff88;
          box-shadow: 0 0 8px #00ff88;
        }
        
        .status-dot.loading {
          background: #ffaa00;
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        
        .status-text {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.7);
        }
        
        .transcript-error {
          background: rgba(255, 68, 68, 0.15);
          border: 1px solid rgba(255, 68, 68, 0.3);
          color: #ff6b6b;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 11px;
          margin-bottom: 10px;
        }
        
        .transcript-loading {
          margin-bottom: 10px;
        }
        
        .loading-bar {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        
        .loading-progress {
          height: 100%;
          background: linear-gradient(90deg, #00ff88, #00ccff);
          border-radius: 2px;
          transition: width 0.3s ease;
        }
        
        .transcript-loading p {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
          text-align: center;
        }
        
        .transcript-content {
          max-height: 140px;
          overflow-y: auto;
        }
        
        .transcript-empty {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
          margin: 0;
          text-align: center;
          padding: 16px 0;
        }
        
        .transcript-entry {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.9);
          margin: 8px 0;
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border-left: 3px solid #00ccff;
          animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
