import { useEffect, useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { getDrugExplanation, generateFallbackExplanation, type DrugExplanation } from '../utils/drugExplanations';
import { useRoleContext } from '../contexts/RoleContext';

interface PanelProps {
  drug: string;
  onDismiss: () => void;
}

/**
 * Patient-only clarification panel that appears when confusion is detected
 * around a drug mention. Provides simple, non-medical explanations.
 */
export function PatientClarificationPanel({ drug, onDismiss }: PanelProps) {
  const [explanation, setExplanation] = useState<DrugExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get explanation (with fallback)
    const expl = getDrugExplanation(drug) || generateFallbackExplanation(drug);
    setExplanation(expl);
    setIsLoading(false);
  }, [drug]);

  if (isLoading || !explanation) {
    return (
      <div className="patient-panel">
        <div className="patient-panel-content">
          <div className="patient-panel-loading">Loading information...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-panel">
      <div className="patient-panel-content">
        <div className="patient-panel-header">
          <h3 className="patient-panel-title">💡 Quick Explanation</h3>
          <button 
            className="patient-panel-close" 
            onClick={onDismiss}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
        
        <div className="patient-panel-drug-name">{explanation.simpleName}</div>
        
        <div className="patient-panel-section">
          <p className="patient-panel-explanation">{explanation.explanation}</p>
        </div>

        {explanation.commonUses && explanation.commonUses.length > 0 && (
          <div className="patient-panel-section">
            <h4 className="patient-panel-section-title">Common uses:</h4>
            <ul className="patient-panel-list">
              {explanation.commonUses.map((use, idx) => (
                <li key={idx}>{use}</li>
              ))}
            </ul>
          </div>
        )}

        {explanation.importantNotes && explanation.importantNotes.length > 0 && (
          <div className="patient-panel-section">
            <h4 className="patient-panel-section-title">Things to know:</h4>
            <ul className="patient-panel-list patient-panel-notes">
              {explanation.importantNotes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {explanation.alternatives && (
          <div className="patient-panel-section patient-panel-alternatives">
            <p className="patient-panel-alternative-text">{explanation.alternatives}</p>
          </div>
        )}

        <div className="patient-panel-footer">
          <p className="patient-panel-footer-text">
            This helps you understand what your doctor is discussing. 
            Always follow your doctor's specific instructions.
          </p>
        </div>
      </div>

      <style>{`
        .patient-panel {
          position: fixed;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 320px;
          max-width: calc(100vw - 40px);
          max-height: 80vh;
          z-index: 10000;
          animation: slideInRight 0.3s ease-out;
        }

        @keyframes slideInRight {
          from {
            transform: translateY(-50%) translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateY(-50%) translateX(0);
            opacity: 1;
          }
        }

        .patient-panel-content {
          background: linear-gradient(135deg, rgba(30, 30, 40, 0.98) 0%, rgba(20, 20, 30, 0.98) 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          overflow-y: auto;
          max-height: 80vh;
        }

        .patient-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .patient-panel-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
        }

        .patient-panel-close {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #ffffff;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .patient-panel-close:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .patient-panel-drug-name {
          font-size: 20px;
          font-weight: 700;
          color: #4fc3f7;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .patient-panel-section {
          margin-bottom: 16px;
        }

        .patient-panel-explanation {
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        .patient-panel-section-title {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .patient-panel-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .patient-panel-list li {
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.85);
          padding: 6px 0;
          padding-left: 20px;
          position: relative;
        }

        .patient-panel-list li:before {
          content: "•";
          position: absolute;
          left: 0;
          color: #4fc3f7;
          font-weight: bold;
        }

        .patient-panel-notes li {
          color: rgba(255, 200, 100, 0.9);
        }

        .patient-panel-alternatives {
          background: rgba(79, 195, 247, 0.1);
          border-left: 3px solid #4fc3f7;
          padding: 12px;
          border-radius: 8px;
          margin-top: 12px;
        }

        .patient-panel-alternative-text {
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        .patient-panel-footer {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .patient-panel-footer-text {
          font-size: 11px;
          line-height: 1.4;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
          font-style: italic;
        }

        .patient-panel-loading {
          text-align: center;
          padding: 20px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .patient-panel {
            right: 10px;
            left: 10px;
            width: auto;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Container component that manages when to show the panel.
 * Only shows for patients, and only when confusion + drug detected.
 */
export function PatientClarificationPanelContainer() {
  const role = useRoleContext();
  const session = useSession();
  const [activePanel, setActivePanel] = useState<{ drug: string; confusionId: string } | null>(null);

  // Only show for patients
  if (role !== 'patient') {
    return null;
  }

  useEffect(() => {
    // Check for recent confusion events with drug context
    const recentConfusions = session.getRecentConfusionEvents(15); // Last 15 seconds
    const recentDrugs = session.getRecentDrugMentions(15);

    // Find confusion events that have drug context or can be linked
    for (const confusion of recentConfusions) {
      if (confusion.state === 'CONFUSION' && confusion.confidence !== 'LOW') {
        // Check if there's a drug context or recent drug mention
        let drugToShow = confusion.drugContext;
        
        if (!drugToShow && recentDrugs.length > 0) {
          // Link to most recent drug
          drugToShow = recentDrugs[recentDrugs.length - 1].drug;
          session.linkConfusionToDrug(confusion.id, drugToShow);
        }

        if (drugToShow) {
          // Show panel if not already showing this drug
          if (!activePanel || activePanel.drug !== drugToShow) {
            setActivePanel({ drug: drugToShow, confusionId: confusion.id });
            
            // Auto-dismiss after 30 seconds
            const timer = setTimeout(() => {
              setActivePanel(null);
            }, 30000);
            
            return () => clearTimeout(timer);
          }
        }
      }
    }
  }, [session.confusionEvents, session.drugMentions, activePanel, session]);

  if (!activePanel) {
    return null;
  }

  return (
    <PatientClarificationPanel
      drug={activePanel.drug}
      onDismiss={() => setActivePanel(null)}
    />
  );
}
