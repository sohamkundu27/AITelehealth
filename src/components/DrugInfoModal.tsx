import { useState, useEffect } from 'react';
import { getDrugInfo, summarizeToPopupFormat, type PopupData } from '../../openFDA';
import './styles/DrugInfoModal.css';

interface DrugInfoModalProps {
  drug: string;
  onClose: () => void;
}

export function DrugInfoModal({ drug, onClose }: DrugInfoModalProps) {
  const [popupData, setPopupData] = useState<PopupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const overlayStyle = { pointerEvents: 'none' as const };
  const modalStyle = {
    pointerEvents: 'auto' as const,
  };

  useEffect(() => {
    const fetchDrugInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const drugInfo = await getDrugInfo(drug);
        const summary = await summarizeToPopupFormat(drugInfo);
        setPopupData(summary);
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
        <div className="drug-modal compact-loading" style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <div className="drug-modal-header">
            <h2>💊 Loading {drug}...</h2>
            <button className="drug-modal-close" onClick={onClose}>✕</button>
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
        <div className="drug-modal" style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <div className="drug-modal-header">
            <h2>💊 {drug}</h2>
            <button className="drug-modal-close" onClick={onClose}>✕</button>
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
      <div className="drug-modal" style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div className="drug-modal-header">
          <div className="drug-modal-title">
            <h2>💊 {popupData.title}</h2>
            {popupData.generic_name && (
              <p className="drug-modal-generic">{popupData.generic_name}</p>
            )}
          </div>
          <button className="drug-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="drug-modal-content">
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
            <div className="drug-info-section">
              <h3 className="drug-section-title warning-title">⚠️ Warnings</h3>
              <ul className="drug-info-list warning-list">
                {popupData.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {popupData.side_effects && popupData.side_effects.length > 0 && (
            <div className="drug-info-section">
              <h3 className="drug-section-title">📋 Common Side Effects</h3>
              <ul className="drug-info-list">
                {popupData.side_effects.map((effect, idx) => (
                  <li key={idx}>{effect}</li>
                ))}
              </ul>
            </div>
          )}

          {popupData.contraindications && popupData.contraindications.length > 0 && (
            <div className="drug-info-section">
              <h3 className="drug-section-title caution-title">🚫 Contraindications</h3>
              <ul className="drug-info-list caution-list">
                {popupData.contraindications.map((contra, idx) => (
                  <li key={idx}>{contra}</li>
                ))}
              </ul>
            </div>
          )}

          {popupData.interactions && popupData.interactions.length > 0 && (
            <div className="drug-info-section">
              <h3 className="drug-section-title interaction-title">🔗 Drug Interactions</h3>
              <ul className="drug-info-list interaction-list">
                {popupData.interactions.map((interaction, idx) => (
                  <li key={idx}>{interaction}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="drug-info-section route-section">
            <h3 className="drug-section-title">Route</h3>
            <div className="drug-info-row">
              <span className="drug-info-value">{popupData.route}</span>
            </div>
          </div>

          <div className="drug-modal-footer">
            <p className="drug-modal-disclaimer">
              This information is from the FDA database and should not replace professional medical advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
