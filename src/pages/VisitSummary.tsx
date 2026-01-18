import { useEffect, useState } from 'react';

interface VisitSummaryData {
  sessionId: string;
  prescriptions: Array<{
    drug: string;
    dosage?: string;
    duration?: string;
  }>;
  patientFollowUp: string;
  safetyCheck: {
    risks: Array<{
      type: string;
      severity: string;
      description: string;
      drugs: string[];
    }>;
    interactions: Array<{
      drug: string;
      interaction: string;
    }>;
  };
  clinicianNote?: string;
}

interface VisitSummaryProps {
  sessionId: string;
}

export function VisitSummary({ sessionId }: VisitSummaryProps) {
  const [data, setData] = useState<VisitSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    const fetchSummary = async () => {
      try {
        const response = await fetch(`/visit-summary/${sessionId}`);
        if (!response.ok) {
          throw new Error('Failed to load visit summary');
        }
        const visitData = await response.json();
        setData(visitData);
      } catch (err: any) {
        setError(err.message || 'Failed to load visit summary');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="visit-summary-container">
        <div className="visit-summary-loading">
          <div className="loading-spinner"></div>
          <p>Loading your visit summary...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="visit-summary-container">
        <div className="visit-summary-error">
          <h2>Unable to Load Summary</h2>
          <p>{error || 'Visit summary not found'}</p>
          <button onClick={() => window.location.href = '/'}>
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="visit-summary-container">
      <div className="visit-summary-content">
        <header className="visit-summary-header">
          <h1>📋 Your Visit Summary</h1>
          <p className="visit-summary-subtitle">
            Session: {data.sessionId.substring(0, 20)}...
          </p>
        </header>

        <section className="visit-summary-section">
          <h2>💊 Prescribed Medications</h2>
          {data.prescriptions.length === 0 ? (
            <p className="visit-summary-empty">No medications were prescribed during this visit.</p>
          ) : (
            <div className="visit-summary-prescriptions">
              {data.prescriptions.map((prescription, idx) => (
                <div key={idx} className="visit-summary-prescription">
                  <h3 className="prescription-drug">{prescription.drug}</h3>
                  {prescription.dosage && (
                    <p className="prescription-detail">
                      <strong>Dosage:</strong> {prescription.dosage}
                    </p>
                  )}
                  {prescription.duration && (
                    <p className="prescription-detail">
                      <strong>Duration:</strong> {prescription.duration}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {data.safetyCheck.risks.length > 0 && (
          <section className="visit-summary-section visit-summary-risks">
            <h2>⚠️ Important Information</h2>
            {data.safetyCheck.risks.map((risk, idx) => (
              <div key={idx} className="visit-summary-risk">
                <p className="risk-description">{risk.description}</p>
                <p className="risk-drugs">Medications: {risk.drugs.join(', ')}</p>
              </div>
            ))}
          </section>
        )}

        <section className="visit-summary-section visit-summary-followup">
          <h2>📝 Follow-Up Instructions</h2>
          <div className="visit-summary-followup-content">
            {data.patientFollowUp.split('\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="visit-summary-section visit-summary-actions">
          <h2>🔄 Next Steps</h2>
          <div className="visit-summary-actions-content">
            <button 
              className="visit-summary-button primary"
              onClick={() => {
                // TODO: Implement side effects reporting
                alert('Side effects reporting coming soon!');
              }}
            >
              Report Side Effects
            </button>
            <button 
              className="visit-summary-button secondary"
              onClick={() => window.location.href = '/'}
            >
              Start New Visit
            </button>
          </div>
        </section>

        <footer className="visit-summary-footer">
          <p>
            This summary is for your reference. Always follow your doctor's specific instructions.
            If you have questions or concerns, contact your healthcare provider.
          </p>
        </footer>
      </div>

      <style>{`
        .visit-summary-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .visit-summary-content {
          max-width: 800px;
          width: 100%;
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .visit-summary-header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }

        .visit-summary-header h1 {
          margin: 0 0 10px 0;
          font-size: 32px;
          color: #333;
        }

        .visit-summary-subtitle {
          color: #666;
          font-size: 14px;
          margin: 0;
        }

        .visit-summary-section {
          margin-bottom: 30px;
        }

        .visit-summary-section h2 {
          font-size: 24px;
          color: #333;
          margin: 0 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #e0e0e0;
        }

        .visit-summary-prescriptions {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .visit-summary-prescription {
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 16px;
          border-radius: 8px;
        }

        .prescription-drug {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: #333;
          font-weight: 600;
        }

        .prescription-detail {
          margin: 4px 0;
          color: #666;
          font-size: 14px;
        }

        .visit-summary-risks {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 8px;
          padding: 20px;
        }

        .visit-summary-risk {
          margin-bottom: 12px;
        }

        .risk-description {
          margin: 0 0 4px 0;
          color: #856404;
          font-weight: 500;
        }

        .risk-drugs {
          margin: 0;
          color: #856404;
          font-size: 14px;
        }

        .visit-summary-followup {
          background: #e7f3ff;
          border-left: 4px solid #2196f3;
          padding: 20px;
          border-radius: 8px;
        }

        .visit-summary-followup-content {
          color: #333;
          line-height: 1.6;
        }

        .visit-summary-followup-content p {
          margin: 8px 0;
        }

        .visit-summary-actions {
          text-align: center;
        }

        .visit-summary-actions-content {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .visit-summary-button {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .visit-summary-button.primary {
          background: #667eea;
          color: white;
        }

        .visit-summary-button.primary:hover {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .visit-summary-button.secondary {
          background: #f0f0f0;
          color: #333;
        }

        .visit-summary-button.secondary:hover {
          background: #e0e0e0;
        }

        .visit-summary-footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          color: #666;
          font-size: 12px;
          line-height: 1.5;
        }

        .visit-summary-empty {
          color: #999;
          font-style: italic;
        }

        .visit-summary-loading,
        .visit-summary-error {
          text-align: center;
          padding: 60px 20px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .visit-summary-error h2 {
          color: #d32f2f;
          margin-bottom: 16px;
        }

        .visit-summary-error button {
          margin-top: 20px;
          padding: 10px 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
