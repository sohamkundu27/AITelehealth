import { useState, useRef, useEffect } from 'react';
import { RealtimeVision } from '@overshoot/sdk';
import { useSession } from '../contexts/SessionContext';

interface OvershootResult {
  visual_evidence?: string;
  current_state?: 'CONFUSION' | 'UNDERSTANDING';
  should_interrupt?: boolean;
  intensity_score?: number;
}

type Props = {
  compact?: boolean;
};

export function OvershootDemo({ compact = false }: Props = {}) {
  const [result, setResult] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const visionRef = useRef<RealtimeVision | null>(null);
  const demoIntervalRef = useRef<number | null>(null);
  const session = useSession();

  useEffect(() => {
    const key = import.meta.env.VITE_OVERSHOOT_API_KEY;
    if (!key) {
      setError("Missing VITE_OVERSHOOT_API_KEY in .env");
      return;
    }
    setDebugInfo(`Key loaded: ${key.substring(0, 8)}...`);

    // Initialize the SDK instance
    visionRef.current = new RealtimeVision({
      apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
      apiKey: key,
      prompt: `Role: You are an expert Communication Analyst observing a patient during a telehealth call. Your sole purpose is to detect if the patient understands the doctor's explanation. Objective: Real-time classification of the patient's level of comprehension. You must accurately distinguish between "Thinking/Processing" (Good) and "Confusion" (Bad).Input Context: Video stream of a patient.Analysis Logic:Differentiate:Processing Information: Nodding, eyes focused. $\rightarrow$ DO NOT INTERRUPT.Confusion: Eyebrows knitted together, head tilt, lips pursed, stopped blinking. $\rightarrow$ INTERRUPT. Classification Labels:CONFUSION: Slight uncertainty, squinting.UNDERSTANDING: Nodding, verbal backchanneling cues (smiling/agreement), attentive.Negative Constraints (Critical):Do NOT classify "nodding" as confusion.Do NOT classify "thinking/looking away to recall" as Disengaged.Do NOT classify "adjusting glasses" or "screen glare squint" as confusion.Output Format:Return ONLY a single valid JSON object. No conversational text.JSON{
  "visual_evidence": "Brief description of the facial cue (e.g., 'Brow knitted + Head tilt')",
  "current_state": "CONFUSION" | "UNDERSTANDING",
}
Logic for should_interrupt: Set to TRUE only if (current_state is CONFUSION_HIGH) AND intensity_score > 5.'`,
      source: { type: 'camera', cameraFacing: 'user' },
      onResult: (data: any) => {
        setDebugInfo(`Data rx: ${new Date().toLocaleTimeString()}`);
        if (data && data.result) {
          setResult(data.result);
          
          // Parse Overshoot JSON response
          try {
            let parsed: OvershootResult;
            if (typeof data.result === 'string') {
              // Try to parse as JSON
              parsed = JSON.parse(data.result);
            } else {
              parsed = data.result;
            }
            
            if (parsed.current_state) {
              // Calculate confidence based on state and intensity
              let confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
              if (parsed.current_state === 'CONFUSION') {
                const intensity = parsed.intensity_score || 0;
                if (intensity > 7) confidence = 'HIGH';
                else if (intensity > 4) confidence = 'MEDIUM';
                else confidence = 'LOW';
              } else {
                // UNDERSTANDING - lower confidence means less certain
                confidence = 'LOW'; // We're more interested in tracking confusion
              }
              
              // Add to session state (silent tracking, no doctor alerts)
              session.addConfusionEvent({
                state: parsed.current_state,
                visualEvidence: parsed.visual_evidence || 'No visual evidence provided',
                confidence,
              });
              
              // Removed overshoot detection console log
            }
          } catch (e) {
            // If parsing fails, just display the raw result
            // Removed overshoot parsing warning
          }
        }
      },
      onError: (err: any) => {
        setError(err.message || "Unknown error");
        setIsRunning(false);
      }
    });

    return () => {
      stopAll();
    };
  }, []);

  // Auto-start on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      toggleVision();
    }, 1000); // Wait 1s for SDK to initialize
    return () => clearTimeout(timer);
  }, []);

  const stopAll = async () => {
    if (visionRef.current && isRunning) {
      try { await visionRef.current.stop(); } catch (e) { /* ignore */ }
    }
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
    setIsRunning(false);
    setIsDemoMode(false);
  };

  const toggleVision = async () => {
    setError(null);

    if (isRunning) {
      await stopAll();
      setResult("");
      setDebugInfo("Stopped.");
    } else {
      // Try real AI first
      try {
        setDebugInfo("Starting RealtimeVision...");
        if (visionRef.current) {
            await visionRef.current.start();
            setIsRunning(true);
            setDebugInfo("Stream active. Waiting for AI...");
            
            // Safety check: if no data in 10s, suggest demo mode
            setTimeout(() => {
                setDebugInfo(prev => prev.includes("Data rx") ? prev : "No data yet. AI might be busy.");
            }, 8000);
        }
      } catch (err: any) {
        setError("Camera failed. Switching to Demo Mode in 3s...");
        setTimeout(() => startDemoMode(), 3000);
      }
    }
  };

  const startDemoMode = () => {
    stopAll();
    setIsDemoMode(true);
    setIsRunning(true);
    setDebugInfo("Simulating AI (Demo Mode)");
    
    // Demo mode: simulate confusion events for testing
    const demoStates: Array<{ state: 'CONFUSION' | 'UNDERSTANDING'; evidence: string; intensity?: number }> = [
      { state: 'UNDERSTANDING', evidence: 'Nodding, attentive expression' },
      { state: 'UNDERSTANDING', evidence: 'Eye contact maintained' },
      { state: 'CONFUSION', evidence: 'Brow knitted, head tilt', intensity: 6 },
      { state: 'UNDERSTANDING', evidence: 'Calm, focused' },
      { state: 'CONFUSION', evidence: 'Lips pursed, slower blinking', intensity: 5 },
    ];

    let index = 0;
    demoIntervalRef.current = setInterval(() => {
        const demo = demoStates[index % demoStates.length];
        const demoResult = JSON.stringify({
          visual_evidence: demo.evidence,
          current_state: demo.state,
          intensity_score: demo.intensity || 3,
        });
        setResult(demoResult);
        setDebugInfo(`Demo data: ${new Date().toLocaleTimeString()}`);
        
        // Also trigger the onResult handler for demo mode
        try {
          const parsed = JSON.parse(demoResult);
          let confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
          if (parsed.current_state === 'CONFUSION') {
            const intensity = parsed.intensity_score || 0;
            if (intensity > 7) confidence = 'HIGH';
            else if (intensity > 4) confidence = 'MEDIUM';
            else confidence = 'LOW';
          } else {
            confidence = 'LOW';
          }
          
          session.addConfusionEvent({
            state: parsed.current_state,
            visualEvidence: parsed.visual_evidence,
            confidence,
          });
        } catch (e) {
          // Removed demo mode parse warning
        }
        
        index++;
    }, 4000) as unknown as number;
  };

  return (
    <div className="overshoot-popup">
      <div className="overshoot-header">
        <div className="overshoot-status">
          <span className={`status-dot ${isRunning ? 'active' : ''}`} />
          <span className="status-text">
            {isDemoMode ? 'AI Demo' : (isRunning ? 'AI Observing' : 'AI Offline')}
          </span>
        </div>
        <div style={{display: 'flex', gap: '8px'}}>
            {!isRunning && !isDemoMode && (
                <button onClick={startDemoMode} className="overshoot-toggle" style={{background: 'rgba(100,100,255,0.2)'}}>
                    Demo
                </button>
            )}
            <button onClick={toggleVision} className="overshoot-toggle">
            {isRunning ? 'Stop' : 'Start'}
            </button>
        </div>
      </div>

      {error && (
        <div className="overshoot-error">
          {error}
        </div>
      )}

      {isRunning && (
        <div className="overshoot-content">
          {result ? (
            <p className="overshoot-result">{result}</p>
          ) : (
            <p className="overshoot-waiting">
                Watching stream...<br/>
                <span style={{fontSize: '10px', opacity: 0.5}}>{debugInfo}</span>
            </p>
          )}
        </div>
      )}

      <style>{`
        .overshoot-popup {
          ${compact ? '' : 'position: fixed; bottom: 100px; right: 100px; z-index: 500;'}
          width: ${compact ? '100%' : '200px'};
          max-width: ${compact ? 'none' : 'calc(100vw - 120px)'};
          background: ${compact ? 'transparent' : 'var(--bg-overlay)'};
          backdrop-filter: ${compact ? 'none' : 'blur(10px)'};
          -webkit-backdrop-filter: ${compact ? 'none' : 'blur(10px)'};
          border: ${compact ? 'none' : '1px solid var(--border-color)'};
          border-radius: ${compact ? '0' : '12px'};
          padding: ${compact ? '0' : '10px 12px'};
          color: var(--text-primary);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          box-shadow: ${compact ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.2)'};
          transition: opacity 0.2s ease, transform 0.2s ease;
          will-change: opacity;
          font-size: ${compact ? '12px' : '11px'};
        }
        @media (max-width: 768px) {
          .overshoot-popup {
            ${compact ? '' : 'bottom: 180px; right: 10px; left: 10px;'}
            width: ${compact ? '100%' : 'auto'};
            max-width: none;
            padding: ${compact ? '0' : '10px'};
            font-size: 11px;
          }
        }

        .overshoot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: ${isRunning || error ? '8px' : '0'};
          gap: 6px;
          flex-wrap: nowrap;
        }

        .overshoot-status {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: var(--border-color);
          transition: background-color 0.3s ease;
          flex-shrink: 0;
        }

        .status-dot.active {
          background-color: var(--accent-success);
          box-shadow: 0 0 6px var(--accent-success);
        }

        .status-text {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .overshoot-toggle {
          background: var(--bg-hover);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.15s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .overshoot-toggle:hover {
          background: var(--bg-overlay);
          transform: scale(1.05);
        }

        .overshoot-toggle:active {
          transform: scale(0.95);
        }

        @media (max-width: 768px) {
          .overshoot-toggle {
            padding: 4px 8px;
            font-size: 10px;
          }
          .status-text {
            font-size: 10px;
          }
        }

        .overshoot-content {
          background: var(--bg-hover);
          border-radius: 8px;
          padding: 8px;
          min-height: 30px;
        }

        .overshoot-result {
          font-size: 11px;
          line-height: 1.3;
          margin: 0;
          color: var(--text-secondary);
          animation: fadeIn 0.3s ease;
        }

        .overshoot-waiting {
          font-size: 10px;
          color: var(--text-tertiary);
          margin: 0;
          font-style: italic;
          line-height: 1.3;
        }

        .overshoot-error {
          font-size: 10px;
          color: var(--accent-error);
          margin-bottom: 6px;
          padding: 6px;
          background: rgba(255, 85, 85, 0.1);
          border-radius: 6px;
          border-left: 2px solid var(--accent-error);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
