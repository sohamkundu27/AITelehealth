import { useState } from 'react';
import { PrescriptionSTT } from './PrescriptionSTT';
import { OvershootDemo } from './OvershootDemo';

type Props = {
  onPrescriptionDetected: (drug: string) => void;
};

/**
 * Unified monitoring panel that combines prescription listener and AI observer
 * into a single, organized interface.
 */
export function MonitoringPanel({ onPrescriptionDetected }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'stt' | 'ai'>('stt');

  return (
    <>
      <div className={`monitoring-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="monitoring-header">
          <h3 className="monitoring-title">Monitoring</h3>
          <button
            className="monitoring-collapse-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        {isExpanded && (
          <>
            <div className="monitoring-tabs">
              <button
                className={`monitoring-tab ${activeTab === 'stt' ? 'active' : ''}`}
                onClick={() => setActiveTab('stt')}
              >
                💊 Prescriptions
              </button>
              <button
                className={`monitoring-tab ${activeTab === 'ai' ? 'active' : ''}`}
                onClick={() => setActiveTab('ai')}
              >
                👁️ AI Observer
              </button>
            </div>

            <div className="monitoring-content">
              {activeTab === 'stt' && (
                <PrescriptionSTT onPrescriptionDetected={onPrescriptionDetected} compact={true} />
              )}
              {activeTab === 'ai' && (
                <OvershootDemo compact={true} />
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .monitoring-panel {
          position: fixed;
          bottom: 20px;
          left: 20px;
          width: 320px;
          max-width: calc(100vw - 40px);
          background: var(--bg-overlay);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: var(--shadow-md);
          z-index: 600;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .monitoring-panel.collapsed {
          width: auto;
        }

        .monitoring-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-hover);
          gap: 8px;
        }

        .monitoring-title {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          flex: 1;
          min-width: 0;
        }

        .monitoring-collapse-btn {
          background: var(--bg-hover);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 600;
          transition: all 0.2s ease;
          line-height: 1;
        }

        .monitoring-collapse-btn:hover {
          background: var(--bg-overlay);
          border-color: var(--border-hover);
          transform: scale(1.05);
        }

        .monitoring-tabs {
          display: flex;
          padding: 8px;
          gap: 8px;
          background: var(--bg-primary);
        }

        .monitoring-tab {
          flex: 1;
          padding: 10px 12px;
          background: var(--bg-hover);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .monitoring-tab:hover {
          background: var(--bg-overlay);
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .monitoring-tab.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: var(--bg-primary);
        }

        .monitoring-content {
          padding: 12px;
          min-height: 100px;
          max-height: 300px;
          overflow-y: auto;
        }

        .monitoring-content::-webkit-scrollbar {
          width: 6px;
        }

        .monitoring-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .monitoring-content::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }

        .monitoring-content::-webkit-scrollbar-thumb:hover {
          background: var(--border-hover);
        }

        /* Override child component styles to fit in panel */
        .monitoring-content .stt-widget,
        .monitoring-content .overshoot-popup {
          position: static;
          width: 100%;
          max-width: none;
          border: none;
          border-radius: 0;
          box-shadow: none;
          padding: 0;
          background: transparent;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }

        .monitoring-content .stt-widget:hover {
          transform: none;
          box-shadow: none;
        }

        @media (max-width: 768px) {
          .monitoring-panel {
            left: 10px;
            right: 10px;
            bottom: 10px;
            width: auto;
            max-width: none;
          }

          .monitoring-panel.collapsed {
            right: auto;
            width: auto;
          }

          .monitoring-header {
            padding: 10px 12px;
          }

          .monitoring-title {
            font-size: 13px;
          }

          .monitoring-tabs {
            padding: 6px;
            gap: 6px;
          }

          .monitoring-tab {
            padding: 8px 10px;
            font-size: 12px;
          }

          .monitoring-content {
            padding: 10px;
            max-height: 200px;
          }
        }
      `}</style>
    </>
  );
}
