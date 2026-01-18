import { useState, useEffect } from 'react';
import { useSession } from '../contexts/SessionContext';
import { useRoleContext } from '../App';

/**
 * Debug panel to help test Phase 1 implementation.
 * Shows current session state, confusion events, and drug mentions.
 * Only visible in development or when ?debug=true
 */
export function SessionDebugPanel() {
  const session = useSession();
  const role = useRoleContext();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show in dev mode or with ?debug=true
    const params = new URLSearchParams(window.location.search);
    setIsVisible(import.meta.env.DEV || params.get('debug') === 'true');
  }, []);

  if (!isVisible) return null;

  const recentConfusions = session.getRecentConfusionEvents(60);
  const recentDrugs = session.getRecentDrugMentions(60);

  return (
    <div className="session-debug-panel">
      <div className="session-debug-header">
        <h4>🔍 Session Debug (Phase 1)</h4>
        <button onClick={() => setIsVisible(false)}>×</button>
      </div>
      
      <div className="session-debug-content">
        <div className="session-debug-section">
          <strong>Role:</strong> {role || 'unknown'}
        </div>

        <div className="session-debug-section">
          <strong>Recent Confusion Events ({recentConfusions.length}):</strong>
          {recentConfusions.length === 0 ? (
            <div className="session-debug-empty">None in last 60s</div>
          ) : (
            <ul className="session-debug-list">
              {recentConfusions.map((c) => (
                <li key={c.id}>
                  <span className={c.state === 'CONFUSION' ? 'confusion' : 'understanding'}>
                    {c.state}
                  </span>
                  {' '}
                  <span className="confidence">({c.confidence})</span>
                  {c.drugContext && (
                    <span className="drug-context"> → {c.drugContext}</span>
                  )}
                  <div className="session-debug-time">
                    {new Date(c.timestamp).toLocaleTimeString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="session-debug-section">
          <strong>Recent Drug Mentions ({recentDrugs.length}):</strong>
          {recentDrugs.length === 0 ? (
            <div className="session-debug-empty">None in last 60s</div>
          ) : (
            <ul className="session-debug-list">
              {recentDrugs.map((d, idx) => (
                <li key={idx}>
                  {d.drug} <span className="session-debug-time">
                    {new Date(d.timestamp).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="session-debug-section">
          <strong>Panel Trigger:</strong>
          <div className="session-debug-trigger">
            {role === 'patient' && recentConfusions.some(
              c => c.state === 'CONFUSION' && c.confidence !== 'LOW' && c.drugContext
            ) ? (
              <span className="trigger-active">✅ Should show panel</span>
            ) : (
              <span className="trigger-inactive">❌ Panel not triggered</span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .session-debug-panel {
          position: fixed;
          bottom: 20px;
          left: 20px;
          width: 350px;
          max-height: 400px;
          background: rgba(20, 20, 30, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 16px;
          color: #fff;
          font-size: 12px;
          z-index: 10001;
          overflow-y: auto;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .session-debug-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 8px;
        }

        .session-debug-header h4 {
          margin: 0;
          font-size: 14px;
        }

        .session-debug-header button {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #fff;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }

        .session-debug-section {
          margin-bottom: 16px;
        }

        .session-debug-section strong {
          display: block;
          margin-bottom: 6px;
          color: #4fc3f7;
        }

        .session-debug-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .session-debug-list li {
          padding: 6px 8px;
          margin: 4px 0;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          border-left: 3px solid #4fc3f7;
        }

        .confusion {
          color: #ff6b6b;
          font-weight: bold;
        }

        .understanding {
          color: #51cf66;
          font-weight: bold;
        }

        .confidence {
          color: rgba(255, 255, 255, 0.6);
          font-size: 11px;
        }

        .drug-context {
          color: #ffd43b;
          font-weight: bold;
        }

        .session-debug-time {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 2px;
        }

        .session-debug-empty {
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
          padding: 8px;
        }

        .session-debug-trigger {
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          margin-top: 6px;
        }

        .trigger-active {
          color: #51cf66;
          font-weight: bold;
        }

        .trigger-inactive {
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
