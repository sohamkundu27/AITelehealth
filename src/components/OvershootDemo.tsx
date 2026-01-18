import { useState, useRef, useEffect } from 'react';
import { RealtimeVision } from '@overshoot/sdk';
import { useSession } from '../contexts/SessionContext';

interface OvershootResult {
  visual_evidence?: string;
  current_state?: 'CONFUSION' | 'UNDERSTANDING';
  should_interrupt?: boolean;
  intensity_score?: number;
}

export function OvershootDemo() {
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
          position: fixed;
          top: 20px;
          right: 20px;
          width: 280px;
          background: rgba(20, 20, 25, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 16px;
          color: white;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .overshoot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: ${isRunning || error ? '12px' : '0'};
        }

        .overshoot-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #666;
          transition: background-color 0.3s ease;
        }

        .status-dot.active {
          background-color: #00ff88;
          box-shadow: 0 0 8px #00ff88;
        }

        .status-text {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.7);
        }

        .overshoot-toggle {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .overshoot-toggle:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .overshoot-content {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          padding: 12px;
          min-height: 40px;
        }

        .overshoot-result {
          font-size: 14px;
          line-height: 1.4;
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
          animation: fadeIn 0.3s ease;
        }

        .overshoot-waiting {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
          margin: 0;
          font-style: italic;
        }

        .overshoot-error {
          font-size: 13px;
          color: #ff6b6b;
          margin-bottom: 8px;
          padding: 8px;
          background: rgba(255, 107, 107, 0.1);
          border-radius: 8px;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
