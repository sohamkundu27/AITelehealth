import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from '../contexts/SessionContext';

/**
 * Simplified comprehension monitor using Gemini API.
 * Sends hardcoded "attentive, nodding" observation every 10 seconds
 * and displays whether the patient appears confused or understanding.
 */
export function OvershootDemo() {
  const [state, setState] = useState<'CONFUSION' | 'UNDERSTANDING' | null>(null);
  const [confidence, setConfidence] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  
  const intervalRef = useRef<number | null>(null);
  const session = useSession();

  const analyzeComprehension = useCallback(async () => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/analyze-comprehension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observation: 'attentive, nodding' }),
      });
      
      const data = await response.json();
      
      setState(data.state);
      setConfidence(data.confidence);
      setLastUpdate(new Date().toLocaleTimeString());
      
      // Log to session context
      session.addConfusionEvent({
        state: data.state,
        visualEvidence: data.evidence || 'attentive, nodding',
        confidence: data.confidence || 'MEDIUM',
      });
      
      console.log('[Comprehension] State:', data.state, '| Confidence:', data.confidence);
    } catch (err) {
      console.error('[Comprehension] Analysis failed:', err);
      setState('UNDERSTANDING');
      setConfidence('LOW');
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, session]);

  const startMonitoring = useCallback(() => {
    setIsRunning(true);
    // Run immediately
    analyzeComprehension();
    // Then every 10 seconds
    intervalRef.current = window.setInterval(analyzeComprehension, 10000);
  }, [analyzeComprehension]);

  const stopMonitoring = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Auto-start on mount
  useEffect(() => {
    const timer = setTimeout(startMonitoring, 1000);
    return () => {
      clearTimeout(timer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const toggleMonitoring = () => {
    if (isRunning) {
      stopMonitoring();
    } else {
      startMonitoring();
    }
  };

  return (
    <div className="comprehension-monitor">
      <div className="cm-header">
        <div className="cm-status">
          <span className={`status-dot ${isRunning ? (isAnalyzing ? 'analyzing' : 'active') : ''}`} />
          <span className="status-text">
            {isRunning ? (isAnalyzing ? 'Analyzing...' : 'Monitoring') : 'Paused'}
          </span>
        </div>
        <button onClick={toggleMonitoring} className="cm-toggle">
          {isRunning ? 'Stop' : 'Start'}
        </button>
      </div>

      {state && (
        <div className={`cm-result ${state === 'CONFUSION' ? 'confused' : 'understanding'}`}>
          <div className="cm-state-icon">
            {state === 'CONFUSION' ? '😕' : '✓'}
          </div>
          <div className="cm-state-info">
            <div className="cm-state-label">
              {state === 'CONFUSION' ? 'Confused' : 'Understanding'}
            </div>
            <div className="cm-state-meta">
              {confidence} confidence • {lastUpdate}
            </div>
          </div>
        </div>
      )}

      {!state && isRunning && (
        <div className="cm-waiting">
          Analyzing patient comprehension...
        </div>
      )}

      <style>{`
        .comprehension-monitor {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 260px;
          background: rgba(15, 15, 20, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 14px;
          color: white;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .cm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .cm-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #666;
          transition: all 0.3s;
        }

        .status-dot.active {
          background: #00ff88;
          box-shadow: 0 0 8px #00ff88;
        }

        .status-dot.analyzing {
          background: #ffaa00;
          box-shadow: 0 0 8px #ffaa00;
          animation: pulse 0.8s infinite;
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

        .cm-toggle {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          padding: 5px 14px;
          border-radius: 14px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .cm-toggle:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .cm-result {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          animation: fadeIn 0.3s ease;
        }

        .cm-result.understanding {
          background: rgba(0, 255, 136, 0.15);
          border: 1px solid rgba(0, 255, 136, 0.3);
        }

        .cm-result.confused {
          background: rgba(255, 170, 0, 0.15);
          border: 1px solid rgba(255, 170, 0, 0.3);
        }

        .cm-state-icon {
          font-size: 24px;
          line-height: 1;
        }

        .cm-result.understanding .cm-state-icon {
          color: #00ff88;
        }

        .cm-result.confused .cm-state-icon {
          color: #ffaa00;
        }

        .cm-state-info {
          flex: 1;
        }

        .cm-state-label {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .cm-result.understanding .cm-state-label {
          color: #00ff88;
        }

        .cm-result.confused .cm-state-label {
          color: #ffaa00;
        }

        .cm-state-meta {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
          text-transform: lowercase;
        }

        .cm-waiting {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
          text-align: center;
          padding: 16px 0;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
