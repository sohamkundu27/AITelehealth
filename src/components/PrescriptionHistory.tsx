import { useState } from 'react';

/**
 * Prescription history entry with timestamp and drug name
 */
export type PrescriptionEntry = {
  id: string;
  drug: string;
  timestamp: number;
  hasConflict?: boolean;
};

type Props = {
  prescriptions: PrescriptionEntry[];
  onDrugSelect?: (drug: string) => void;
  onClear?: () => void;
  isOpen: boolean;
  onToggle: () => void;
};

/**
 * Prescription history sidebar component showing timeline of all detected drugs during call.
 * Provides ability to view, select, and clear prescription history.
 */
export function PrescriptionHistory({ prescriptions, onDrugSelect, onClear, isOpen, onToggle }: Props) {
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Group prescriptions by date
  const groupedByDate = prescriptions.reduce((acc, entry) => {
    const date = formatDate(entry.timestamp);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, PrescriptionEntry[]>);

  return (
    <>
      {/* Toggle button */}
      <button
        className={`prescription-history-toggle ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        aria-label={isOpen ? 'Close prescription history' : 'Open prescription history'}
        title={isOpen ? 'Close history' : 'Open history'}
      >
        <span className="prescription-history-icon">📋</span>
        <span className="prescription-history-label">History</span>
        {prescriptions.length > 0 && (
          <span className="prescription-history-count">{prescriptions.length}</span>
        )}
      </button>

      {/* Sidebar */}
      <div className={`prescription-history-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="prescription-history-header">
          <h3>Prescription History</h3>
          <div className="prescription-history-actions">
            {prescriptions.length > 0 && onClear && (
              <button
                className="prescription-history-clear"
                onClick={onClear}
                title="Clear history"
              >
                Clear
              </button>
            )}
            <button
              className="prescription-history-close"
              onClick={onToggle}
              aria-label="Close prescription history"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="prescription-history-content">
          {prescriptions.length === 0 ? (
            <div className="prescription-history-empty">
              <span className="prescription-history-empty-icon">💊</span>
              <p>No prescriptions detected yet</p>
              <span className="prescription-history-empty-hint">
                Prescriptions will appear here as they're detected during the call
              </span>
            </div>
          ) : (
            <div className="prescription-history-timeline">
              {Object.entries(groupedByDate).map(([date, entries]) => (
                <div key={date} className="prescription-history-date-group">
                  <div className="prescription-history-date-header">
                    <span className="prescription-history-date-line" />
                    <span className="prescription-history-date-text">{date}</span>
                    <span className="prescription-history-date-line" />
                  </div>
                  <div className="prescription-history-entries">
                    {entries.map((entry) => (
                      <button
                        key={entry.id}
                        className={`prescription-history-entry ${entry.hasConflict ? 'has-conflict' : ''}`}
                        onClick={() => onDrugSelect?.(entry.drug)}
                        title={`View details for ${entry.drug}`}
                      >
                        <div className="prescription-history-entry-dot">
                          {entry.hasConflict ? '⚠' : '✓'}
                        </div>
                        <div className="prescription-history-entry-content">
                          <div className="prescription-history-entry-drug">{entry.drug}</div>
                          <div className="prescription-history-entry-time">{formatTime(entry.timestamp)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overlay when sidebar is open on mobile */}
      {isOpen && <div className="prescription-history-overlay" onClick={onToggle} />}

      <style>{`
        .prescription-history-toggle {
          position: fixed;
          bottom: 100px;
          right: 20px;
          z-index: 900;
          background: var(--bg-overlay);
          backdrop-filter: blur(10px);
          border: 2px solid var(--border-color);
          color: var(--text-primary);
          min-width: 120px;
          height: 56px;
          border-radius: 28px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .prescription-history-toggle:hover {
          transform: translateY(-2px);
          background: var(--bg-hover);
          border-color: var(--border-hover);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
        }
        .prescription-history-toggle:active {
          transform: translateY(0);
        }
        .prescription-history-toggle.open {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: var(--bg-primary);
          box-shadow: 0 4px 16px rgba(var(--accent-primary-rgb, 0, 255, 136), 0.4);
        }
        .prescription-history-icon {
          position: relative;
          font-size: 20px;
          flex-shrink: 0;
        }
        .prescription-history-label {
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
        }
        .prescription-history-count {
          position: absolute;
          top: -6px;
          right: -6px;
          background: var(--accent-error);
          color: var(--bg-primary);
          font-size: 11px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 12px;
          min-width: 20px;
          height: 20px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          border: 2px solid var(--bg-primary);
        }
        .prescription-history-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: 360px;
          max-width: 90vw;
          background: var(--bg-overlay);
          backdrop-filter: blur(20px);
          border-left: 1px solid var(--border-color);
          z-index: 1100;
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.25s ease-out;
          box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
        }
        .prescription-history-sidebar.open {
          transform: translateX(0);
        }
        .prescription-history-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .prescription-history-header h3 {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .prescription-history-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .prescription-history-clear,
        .prescription-history-close {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s ease;
        }
        .prescription-history-clear:hover {
          background: var(--bg-hover);
          border-color: var(--accent-error);
          color: var(--accent-error);
        }
        .prescription-history-close {
          width: 28px;
          height: 28px;
          padding: 0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .prescription-history-close:hover {
          background: var(--bg-hover);
          transform: rotate(90deg);
        }
        .prescription-history-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        .prescription-history-content::-webkit-scrollbar {
          width: 6px;
        }
        .prescription-history-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .prescription-history-content::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }
        .prescription-history-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          color: var(--text-tertiary);
        }
        .prescription-history-empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }
        .prescription-history-empty p {
          margin: 0 0 8px 0;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .prescription-history-empty-hint {
          font-size: 0.85rem;
          line-height: 1.5;
        }
        .prescription-history-timeline {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .prescription-history-date-group {
          position: relative;
        }
        .prescription-history-date-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .prescription-history-date-line {
          flex: 1;
          height: 1px;
          background: var(--border-color);
        }
        .prescription-history-date-text {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .prescription-history-entries {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .prescription-history-entry {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-hover);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
        }
        .prescription-history-entry:hover {
          background: var(--bg-overlay);
          border-color: var(--border-hover);
          transform: translateX(4px);
          box-shadow: var(--shadow-sm);
        }
        .prescription-history-entry.has-conflict {
          border-left: 3px solid var(--accent-error);
        }
        .prescription-history-entry-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
          background: var(--bg-primary);
          border: 2px solid var(--border-color);
        }
        .prescription-history-entry.has-conflict .prescription-history-entry-dot {
          background: rgba(255, 85, 85, 0.1);
          border-color: var(--accent-error);
          color: var(--accent-error);
        }
        .prescription-history-entry:not(.has-conflict) .prescription-history-entry-dot {
          background: rgba(0, 170, 0, 0.1);
          border-color: var(--accent-success);
          color: var(--accent-success);
        }
        .prescription-history-entry-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .prescription-history-entry-drug {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.95rem;
        }
        .prescription-history-entry-time {
          font-size: 0.8rem;
          color: var(--text-tertiary);
        }
        .prescription-history-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1050;
          backdrop-filter: blur(2px);
        }
        @media (max-width: 768px) {
          .prescription-history-sidebar {
            width: 100vw;
            max-width: 100vw;
          }
          .prescription-history-toggle {
            bottom: 90px;
            right: 10px;
            min-width: 100px;
            height: 48px;
            padding: 0 12px;
            gap: 6px;
            font-size: 13px;
            border-radius: 24px;
          }
          .prescription-history-icon {
            font-size: 18px;
          }
          .prescription-history-label {
            font-size: 13px;
          }
          .prescription-history-count {
            top: -5px;
            right: -5px;
            font-size: 10px;
            padding: 2px 6px;
            min-width: 18px;
            height: 18px;
            border-width: 1.5px;
          }
        }
      `}</style>
    </>
  );
}
