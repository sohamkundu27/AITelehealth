import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

type Result = { hasConflict: boolean; details: string; source?: string };

type Props = {
  isChecking: boolean;
  result: Result | null;
  drug?: string;
};

/**
 * Enhanced conflict indicator with toast notifications, severity levels,
 * auto-dismiss functionality, and smooth animations.
 */
export function ConflictCheckIndicator({ isChecking, result, drug }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldAnimateOut, setShouldAnimateOut] = useState(false);

  // Determine severity level
  const getSeverity = (result: Result | null): 'info' | 'success' | 'warning' | 'error' => {
    if (!result) return 'info';
    if (!result.hasConflict) return 'success';
    // Check for critical keywords in details
    const detailsLower = result.details.toLowerCase();
    if (detailsLower.includes('severe') || detailsLower.includes('contraindicated') || detailsLower.includes('danger')) {
      return 'error';
    }
    return 'warning';
  };

  const severity = getSeverity(result);

  // Show/hide animation
  useEffect(() => {
    if (isChecking || result) {
      setIsVisible(true);
      setShouldAnimateOut(false);
    } else {
      setShouldAnimateOut(true);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isChecking, result]);

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (result && severity === 'success' && !result.hasConflict) {
      const timer = setTimeout(() => {
        setShouldAnimateOut(true);
        setTimeout(() => setIsVisible(false), 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [result, severity]);

  if (!isVisible && !isChecking && !result) return null;

  let body: ReactNode = null;
  if (isChecking) {
    body = (
      <div className="conflict-checking">
        <span className="conflict-spinner" />
        <div className="conflict-text">
          <strong>Checking for drug conflicts{drug ? ` (${drug})` : ''}…</strong>
        </div>
      </div>
    );
  } else if (result) {
    const icons = {
      success: '✓',
      warning: '⚠',
      error: '⚠',
      info: 'ℹ',
    };
    body = (
      <div className={`conflict-result conflict-${severity}`}>
        <span className="conflict-icon">{icons[severity]}</span>
        <div className="conflict-content">
          <strong>{result.hasConflict ? 'Potential interaction detected' : 'No conflicts found'}</strong>
          <p>{result.details}</p>
          {result.source && (
            <span className="conflict-source">Source: {result.source}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`conflict-indicator ${shouldAnimateOut ? 'animate-out' : 'animate-in'}`}>
      {body}
      <style>{`
        .conflict-indicator {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 700;
          background: var(--bg-overlay);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 16px 20px;
          color: var(--text-primary);
          font-size: 14px;
          max-width: calc(100vw - 40px);
          width: auto;
          min-width: 280px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          transition: opacity 0.2s ease, transform 0.2s ease;
          will-change: opacity, transform;
        }
        @media (max-width: 768px) {
          .conflict-indicator {
            top: 60px;
            min-width: auto;
            width: calc(100vw - 20px);
            max-width: calc(100vw - 20px);
            padding: 12px 16px;
            font-size: 13px;
          }
        }
        .conflict-indicator.animate-in {
          animation: toastSlideIn 0.25s ease-out forwards;
        }
        .conflict-indicator.animate-out {
          animation: toastSlideOut 0.2s ease-in forwards;
        }
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes toastSlideOut {
          from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          to {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
        }
        .conflict-checking {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .conflict-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border-color);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: conflict-spin 0.8s linear infinite;
          flex-shrink: 0;
          will-change: transform;
        }
        @keyframes conflict-spin {
          to { transform: rotate(360deg); }
        }
        .conflict-text {
          display: flex;
          flex-direction: column;
        }
        .conflict-result {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .conflict-icon {
          font-size: 1.5rem;
          line-height: 1;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .conflict-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .conflict-content strong {
          font-weight: 600;
          font-size: 15px;
        }
        .conflict-content p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.5;
        }
        .conflict-source {
          font-size: 11px;
          color: var(--text-tertiary);
          font-style: italic;
          margin-top: 4px;
        }
        .conflict-success {
          border-left: 4px solid var(--accent-success);
          background: linear-gradient(90deg, rgba(0, 170, 0, 0.1) 0%, transparent 100%);
        }
        .conflict-success .conflict-icon {
          color: var(--accent-success);
        }
        .conflict-warning {
          border-left: 4px solid var(--accent-warning);
          background: linear-gradient(90deg, rgba(255, 136, 0, 0.1) 0%, transparent 100%);
        }
        .conflict-warning .conflict-icon {
          color: var(--accent-warning);
        }
        .conflict-error {
          border-left: 4px solid var(--accent-error);
          background: linear-gradient(90deg, rgba(255, 85, 85, 0.1) 0%, transparent 100%);
        }
        .conflict-error .conflict-icon {
          color: var(--accent-error);
        }
        .conflict-info {
          border-left: 4px solid var(--accent-primary);
        }
        .conflict-info .conflict-icon {
          color: var(--accent-primary);
        }
        @media (max-width: 600px) {
          .conflict-indicator {
            min-width: auto;
            max-width: 95vw;
            padding: 12px 16px;
          }
        }
      `}</style>
    </div>
  );
}
