import { useState, useRef, useEffect, useCallback } from 'react';
import { useRemoteParticipants, useParticipantTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useSession, type SymptomEvent } from '../contexts/SessionContext';

interface SymptomAnalysisResult {
  action: SymptomEvent['action'];
  bodyPart: SymptomEvent['bodyPart'];
  description: string;
  detected: boolean;
}

/**
 * VisualScribe: Captures frames from the remote patient's video track every 3 seconds,
 * sends them to the backend for AI analysis, and logs detected physical symptoms.
 */
export function VisualScribe() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);
  
  const { symptomLogs, addSymptomLog } = useSession();
  
  // Get remote participants
  const remoteParticipants = useRemoteParticipants();
  const remoteParticipant = remoteParticipants[0]; // Take first remote participant (the patient)
  
  // Get video track from remote participant
  const tracks = useParticipantTracks(
    [Track.Source.Camera],
    remoteParticipant?.identity
  );
  const videoTrack = tracks.find(t => t.source === Track.Source.Camera)?.publication?.track;

  // Attach video track to hidden video element
  useEffect(() => {
    if (!videoTrack || !videoRef.current) return;
    
    videoTrack.attach(videoRef.current);
    console.log('[VisualScribe] Video track attached');
    
    return () => {
      if (videoRef.current) {
        videoTrack.detach(videoRef.current);
      }
    };
  }, [videoTrack]);

  // Capture a frame from the video and convert to base64
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  // Analyze a frame using the backend
  const analyzeFrame = useCallback(async () => {
    if (isAnalyzing || !isActive) return;
    
    const frame = captureFrame();
    if (!frame) {
      console.log('[VisualScribe] No frame captured (video not ready)');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analyze-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: frame }),
      });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }
      
      const result: SymptomAnalysisResult = await response.json();
      
      if (result.detected) {
        addSymptomLog({
          action: result.action,
          bodyPart: result.bodyPart,
          description: result.description,
        });
        setLastAnalysis(result.description);
      } else {
        setLastAnalysis('No symptoms detected');
      }
    } catch (err: any) {
      console.error('[VisualScribe] Analysis error:', err);
      setError(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, isActive, captureFrame, addSymptomLog]);

  // Start/stop interval for frame analysis (every 3 seconds)
  useEffect(() => {
    if (isActive && videoTrack) {
      // Wait a moment for video to start
      const startDelay = setTimeout(() => {
        intervalRef.current = window.setInterval(analyzeFrame, 3000);
        // Run first analysis immediately
        analyzeFrame();
      }, 1000);
      
      return () => {
        clearTimeout(startDelay);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isActive, videoTrack, analyzeFrame]);

  // Format timestamp for display
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <>
      {/* Hidden video element for frame capture */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        style={{ display: 'none' }} 
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {/* Live Medical Log Sidebar */}
      <div className="visual-scribe-sidebar">
        <div className="visual-scribe-header">
          <div className="visual-scribe-title">
            <span className={`status-indicator ${isActive ? (isAnalyzing ? 'analyzing' : 'active') : 'inactive'}`} />
            <span>Live Medical Log</span>
          </div>
          <button 
            className="visual-scribe-toggle"
            onClick={() => setIsActive(!isActive)}
          >
            {isActive ? 'Pause' : 'Resume'}
          </button>
        </div>
        
        {error && (
          <div className="visual-scribe-error">
            {error}
          </div>
        )}
        
        {!videoTrack && (
          <div className="visual-scribe-waiting">
            Waiting for remote video...
          </div>
        )}
        
        {lastAnalysis && (
          <div className="visual-scribe-last">
            Latest: {lastAnalysis}
          </div>
        )}
        
        <div className="visual-scribe-logs">
          {symptomLogs.length === 0 ? (
            <div className="visual-scribe-empty">
              No symptoms logged yet
            </div>
          ) : (
            symptomLogs.slice().reverse().map((log) => (
              <div key={log.id} className="visual-scribe-log-entry">
                <span className="log-time">[{formatTime(log.timestamp)}]</span>
                <span className="log-description">{log.description}</span>
              </div>
            ))
          )}
        </div>
      </div>
      
      <style>{`
        .visual-scribe-sidebar {
          position: fixed;
          right: 20px;
          top: 80px;
          width: 300px;
          max-height: calc(100vh - 120px);
          background: rgba(15, 15, 20, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 16px;
          color: white;
          z-index: 9998;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
        }
        
        .visual-scribe-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .visual-scribe-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
        }
        
        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #666;
        }
        
        .status-indicator.active {
          background: #00ff88;
          box-shadow: 0 0 8px #00ff88;
        }
        
        .status-indicator.analyzing {
          background: #ffaa00;
          box-shadow: 0 0 8px #ffaa00;
          animation: pulse 1s infinite;
        }
        
        .status-indicator.inactive {
          background: #ff4444;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .visual-scribe-toggle {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .visual-scribe-toggle:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .visual-scribe-error {
          background: rgba(255, 68, 68, 0.15);
          border: 1px solid rgba(255, 68, 68, 0.3);
          color: #ff6b6b;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 12px;
        }
        
        .visual-scribe-waiting {
          color: rgba(255, 255, 255, 0.4);
          font-size: 12px;
          font-style: italic;
          text-align: center;
          padding: 20px 0;
        }
        
        .visual-scribe-last {
          background: rgba(0, 255, 136, 0.1);
          border-left: 3px solid #00ff88;
          padding: 8px 12px;
          font-size: 12px;
          margin-bottom: 12px;
          border-radius: 0 8px 8px 0;
        }
        
        .visual-scribe-logs {
          flex: 1;
          overflow-y: auto;
          min-height: 100px;
          max-height: 300px;
        }
        
        .visual-scribe-empty {
          color: rgba(255, 255, 255, 0.3);
          font-size: 12px;
          text-align: center;
          padding: 20px 0;
        }
        
        .visual-scribe-log-entry {
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 12px;
          animation: fadeIn 0.3s ease;
        }
        
        .visual-scribe-log-entry:last-child {
          border-bottom: none;
        }
        
        .log-time {
          color: #00ff88;
          font-family: monospace;
          margin-right: 8px;
        }
        
        .log-description {
          color: rgba(255, 255, 255, 0.85);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
