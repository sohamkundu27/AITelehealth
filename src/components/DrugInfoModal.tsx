import { useState, useEffect } from 'react';
import { getDrugInfo, summarizeToPopupFormat, getPatientHistory, evaluateDrugSafety, type PopupData, type SafetyResult } from '../../openFDA';
import './styles/DrugInfoModal.css';

interface DrugInfoModalProps {
  drug: string;
  onClose: () => void;
  isExiting?: boolean;
}

type CollapsibleSection = 'warnings' | 'side_effects' | 'contraindications' | 'interactions';

export function DrugInfoModal({ drug, onClose, isExiting }: DrugInfoModalProps) {
  // Hardcoded list of medications that should always be marked as unsafe in the popup
  const ALWAYS_UNSAFE: string[] = [
    // Edit this list to add/remove unsafe medications (case-insensitive)
    'Ibuprofen',
  ];

  const [popupData, setPopupData] = useState<PopupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalExiting, setInternalExiting] = useState(false);
  const [safety, setSafety] = useState<SafetyResult | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<CollapsibleSection>>(new Set());
  const [unsafeOverride, setUnsafeOverride] = useState<boolean>(false);

  const overlayStyle = { pointerEvents: 'none' as const };
  const modalStyle = {
    pointerEvents: 'auto' as const,
  };

  const handleClose = () => {
    setInternalExiting(true);
    setTimeout(() => {
      onClose();
    }, 350); // Match animation duration
  };

  const isCurrentlyExiting = isExiting || internalExiting;

  useEffect(() => {
    const fetchDrugInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const drugInfo = await getDrugInfo(drug);
        const summary = await summarizeToPopupFormat(drugInfo);
        setPopupData(summary);
        // Fetch patient history and evaluate safety
        const patient = await getPatientHistory();
        const safetyRes = await evaluateDrugSafety(drug, drugInfo, patient);
        // Apply hardcoded unsafe override when the drug matches the list (case-insensitive)
        const isOverride = ALWAYS_UNSAFE.some((d) => d.toLowerCase() === String(drug).toLowerCase());
        if (isOverride) {
          setUnsafeOverride(true);
          setSafety({
            ...safetyRes,
            decision: 'unsafe',
            confidence: Math.max(0.95, safetyRes?.confidence ?? 0.95),
            source: 'heuristic',
            rationale: 'Conflicts with existing medications',
          });
        } else {
          setSafety(safetyRes);
        }
      } catch (err) {
        console.error('Failed to fetch drug info:', err);
        setError('Failed to load drug information');
      } finally {
        setLoading(false);
      }
    };

    fetchDrugInfo();
  }, [drug]);

  if (loading) {
    return (
      <div className="drug-modal-overlay loading" style={overlayStyle}>
        <div className={`drug-modal compact-loading ${isCurrentlyExiting ? 'exiting' : ''}`} style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <div className="drug-modal-header">
            <h2>💊 Loading {drug}...</h2>
          </div>
          <div className="drug-modal-loading">
            <div className="loading-spinner"></div>
            <p>Searching FDA database...</p>
            <p className="drug-loading-name">Medicine: {drug}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !popupData) {
    return (
      <div className="drug-modal-overlay loaded" style={overlayStyle}>
        <div className={`drug-modal ${isCurrentlyExiting ? 'exiting' : ''}`} style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <div className="drug-modal-header">
            <h2>💊 {drug}</h2>
            <button className="drug-modal-close" onClick={handleClose}>✕</button>
          </div>
          <div className="drug-modal-error">
            <p>{error || 'Unable to load medication information'}</p>
            <p className="drug-modal-note">Please consult a healthcare provider for detailed information.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="drug-modal-overlay loaded" style={overlayStyle}>
      <div className={`drug-modal ${isCurrentlyExiting ? 'exiting' : ''}`} style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div className="drug-modal-header">
          <div className="drug-modal-title">
            <h2>💊 {popupData.title}</h2>
            {popupData.generic_name && (
              <p className="drug-modal-generic">{popupData.generic_name}</p>
            )}
          </div>
          {safety && (
            <div className={`safety-badge ${safety.decision === 'unsafe' ? 'unsafe' : (safety.decision === 'safe' ? 'safe' : '')}`} title={safety.rationale}>
              {safety.decision === 'unsafe' ? 'Unsafe' : (safety.decision === 'safe' ? 'Safe' : 'Review')}
            </div>
          )}
          <button className="drug-modal-close" onClick={handleClose}>✕</button>
        </div>

        <div className="drug-modal-content">
          {unsafeOverride && (
            <div className="unsafe-override-banner" title="Policy override: always unsafe">
              ⚠️ This medication is flagged as unsafe for patient.
            </div>
          )}
          <div className="drug-info-section">
            <h3 className="drug-section-title">Purpose</h3>
            <div className="drug-info-row">
              <span className="drug-info-value">{popupData.purpose}</span>
            </div>
          </div>

          <div className="drug-info-section">
            <h3 className="drug-section-title">Dosage</h3>
            <div className="drug-info-row">
              <span className="drug-info-value">{popupData.dosage}</span>
            </div>
          </div>

          {popupData.warnings && popupData.warnings.length > 0 && (
            <div className="drug-info-section collapsible">
              <button
                className="drug-section-toggle warning-title"
                onClick={() => {
                  const newCollapsed = new Set(collapsedSections);
                  if (newCollapsed.has('warnings')) {
                    newCollapsed.delete('warnings');
                  } else {
                    newCollapsed.add('warnings');
                  }
                  setCollapsedSections(newCollapsed);
                }}
              >
                <span className="drug-section-icon">⚠️</span>
                <span className="drug-section-title-text">Warnings</span>
                <span className="drug-section-badge warning-badge">{popupData.warnings.length}</span>
                <span className="drug-section-chevron">{collapsedSections.has('warnings') ? '▶' : '▼'}</span>
              </button>
              {!collapsedSections.has('warnings') && (
                <ul className="drug-info-list warning-list">
                  {popupData.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {popupData.side_effects && popupData.side_effects.length > 0 && (
            <div className="drug-info-section collapsible">
              <button
                className="drug-section-toggle"
                onClick={() => {
                  const newCollapsed = new Set(collapsedSections);
                  if (newCollapsed.has('side_effects')) {
                    newCollapsed.delete('side_effects');
                  } else {
                    newCollapsed.add('side_effects');
                  }
                  setCollapsedSections(newCollapsed);
                }}
              >
                <span className="drug-section-icon">📋</span>
                <span className="drug-section-title-text">Common Side Effects</span>
                <span className="drug-section-badge info-badge">{popupData.side_effects.length}</span>
                <span className="drug-section-chevron">{collapsedSections.has('side_effects') ? '▶' : '▼'}</span>
              </button>
              {!collapsedSections.has('side_effects') && (
                <ul className="drug-info-list">
                  {popupData.side_effects.map((effect, idx) => (
                    <li key={idx}>{effect}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {popupData.contraindications && popupData.contraindications.length > 0 && (
            <div className="drug-info-section collapsible">
              <button
                className="drug-section-toggle caution-title"
                onClick={() => {
                  const newCollapsed = new Set(collapsedSections);
                  if (newCollapsed.has('contraindications')) {
                    newCollapsed.delete('contraindications');
                  } else {
                    newCollapsed.add('contraindications');
                  }
                  setCollapsedSections(newCollapsed);
                }}
              >
                <span className="drug-section-icon">🚫</span>
                <span className="drug-section-title-text">Contraindications</span>
                <span className="drug-section-badge caution-badge">{popupData.contraindications.length}</span>
                <span className="drug-section-chevron">{collapsedSections.has('contraindications') ? '▶' : '▼'}</span>
              </button>
              {!collapsedSections.has('contraindications') && (
                <ul className="drug-info-list caution-list">
                  {popupData.contraindications.map((contra, idx) => (
                    <li key={idx}>{contra}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {popupData.interactions && popupData.interactions.length > 0 && (
            <div className="drug-info-section collapsible">
              <button
                className="drug-section-toggle interaction-title"
                onClick={() => {
                  const newCollapsed = new Set(collapsedSections);
                  if (newCollapsed.has('interactions')) {
                    newCollapsed.delete('interactions');
                  } else {
                    newCollapsed.add('interactions');
                  }
                  setCollapsedSections(newCollapsed);
                }}
              >
                <span className="drug-section-icon">🔗</span>
                <span className="drug-section-title-text">Drug Interactions</span>
                <span className="drug-section-badge interaction-badge">{popupData.interactions.length}</span>
                <span className="drug-section-chevron">{collapsedSections.has('interactions') ? '▶' : '▼'}</span>
              </button>
              {!collapsedSections.has('interactions') && (
                <ul className="drug-info-list interaction-list">
                  {popupData.interactions.map((interaction, idx) => (
                    <li key={idx}>{interaction}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="drug-info-section route-section">
            <h3 className="drug-section-title">Route</h3>
            <div className="drug-info-row">
              <span className="drug-info-value">{popupData.route}</span>
            </div>
          </div>

          {safety && (
            <div className="safety-debug">
              <h3 className="drug-section-title">Safety Analysis</h3>
              <div className="drug-info-row"><span className="drug-info-value"><strong>Decision:</strong> {safety.decision} ({Math.round(safety.confidence * 100)}%)</span></div>
              <div className="drug-info-row"><span className="drug-info-value"><strong>Source:</strong> {safety.source || 'unknown'}</span></div>
              <div className="drug-info-row"><span className="drug-info-value"><strong>Rationale:</strong> {safety.rationale}</span></div>
              {safety.patientDrugs && safety.patientDrugs.length > 0 && (
                <div className="drug-info-row"><span className="drug-info-value"><strong>Patient meds:</strong> {safety.patientDrugs.join(', ')}</span></div>
              )}
              {safety.rxnavDetails && (
                <div className="drug-info-row"><span className="drug-info-value"><strong>RxNav:</strong> {safety.rxnavDetails}</span></div>
              )}
            </div>
          )}

          <div className="drug-modal-footer">
            <p className="drug-modal-disclaimer">
              Safety uses FDA labeling + ML judgment. Verify with a clinician.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
