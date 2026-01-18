import { useState } from 'react';

interface TranscriptData {
  sessionId: string;
  completeScript: string;
  prescriptions: Array<{
    drug: string;
    dosage?: string;
    duration?: string;
  }>;
  startTime: number;
  endTime: number;
}

export function TranscriptSummary() {
  // Derive sessionId from URL
  const path = window.location.pathname;
  const hash = window.location.hash;
  const sessionId = path.startsWith('/visit-transcript/')
    ? path.split('/visit-transcript/')[1]
    : (hash.startsWith('#/visit-transcript/') ? hash.split('#/visit-transcript/')[1] : null);

  // Initialize data from sessionStorage without backend calls
  const initialData: TranscriptData | null = (() => {
    if (sessionId) {
      const storedData = sessionStorage.getItem(`transcript-${sessionId}`);
      if (storedData) {
        try {
          return JSON.parse(storedData) as TranscriptData;
        } catch (e) {
          console.warn('Failed to parse stored transcript:', e);
          return null;
        }
      }
    }
    return null;
  })();

  const data = initialData;
  const loading = false;
  const error: string | null = !sessionId ? 'No session ID provided' : (initialData ? null : 'Transcript not found in session');
  const [copied, setCopied] = useState(false);
  const summary = 'SUMMARY GOES HERE';

  // No effects needed; summary and data are derived client-side

  // Summary is hard-coded; no backend summarization

  const copyToClipboard = () => {
    if (data?.completeScript) {
      navigator.clipboard.writeText(data.completeScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadTranscript = () => {
    if (!data) return;
    const content = `MEETING TRANSCRIPT
Session ID: ${data.sessionId}
Date: ${new Date(data.startTime).toLocaleString()}
Duration: ${Math.floor((data.endTime - data.startTime) / 1000)} seconds

TRANSCRIPT:
${data.completeScript}

PRESCRIBED MEDICATIONS:
${data.prescriptions.map(p => `- ${p.drug}${p.dosage ? ` (${p.dosage})` : ''}`).join('\n')}`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `transcript-${data.sessionId}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="transcript-container">
        <div className="transcript-loading">
          <div className="loading-spinner"></div>
          <p>Loading transcript...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="transcript-container">
        <div className="transcript-error">
          <h2>Unable to Load Transcript</h2>
          <p>{error || 'Transcript not found'}</p>
          <button onClick={() => (window.location.href = '/')}>Return to Home</button>
        </div>
      </div>
    );
  }

  const duration = Math.floor((data.endTime - data.startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <div className="transcript-container">
      <div className="transcript-content">
        <header className="transcript-header">
          <h1>📜 Meeting Transcript</h1>
          <p className="transcript-subtitle">Session: {data.sessionId.substring(0, 20)}...</p>
          <p className="transcript-time">
            {new Date(data.startTime).toLocaleString()} • Duration: {minutes}m {seconds}s
          </p>
        </header>

        {/* Summary Section */}
        <section className="transcript-section">
          <h2>📊 AI Summary</h2>
          <div className="summary-text">
            <p>{summary}</p>
          </div>
        </section>

        <section className="transcript-section">
          <div className="transcript-header-controls">
            <h2>Full Transcript</h2>
            <div className="transcript-actions">
              <button className="transcript-btn copy-btn" onClick={copyToClipboard}>
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
              <button className="transcript-btn download-btn" onClick={downloadTranscript}>
                📥 Download
              </button>
            </div>
          </div>
          <div className="transcript-text">
            {data.completeScript && data.completeScript.length > 0 ? (
              <p>{data.completeScript}</p>
            ) : (
              <p className="transcript-empty">No transcript recorded for this session.</p>
            )}
          </div>
        </section>

        {data.prescriptions.length > 0 && (
          <section className="transcript-section">
            <h2>💊 Medications Mentioned</h2>
            <div className="transcript-prescriptions">
              {data.prescriptions.map((prescription, idx) => (
                <div key={idx} className="transcript-prescription">
                  <h3>{prescription.drug}</h3>
                  {prescription.dosage && <p>Dosage: {prescription.dosage}</p>}
                  {prescription.duration && <p>Duration: {prescription.duration}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="transcript-section transcript-actions-section">
          <button className="transcript-btn primary-btn" onClick={() => (window.location.href = '/')}>
            Start New Meeting
          </button>
        </section>

        <footer className="transcript-footer">
          <p>This transcript was automatically generated during your meeting.</p>
        </footer>
      </div>

      <style>{`
        .transcript-container {
          min-height: 100vh;
          background: var(--bg-primary);
          padding: 40px 20px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .transcript-content {
          max-width: 900px;
          width: 100%;
          background: var(--bg-overlay);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 32px;
          box-shadow: var(--shadow-md);
          color: var(--text-primary);
        }

        .transcript-header {
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .transcript-header h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          color: var(--text-primary);
        }

        .transcript-subtitle {
          color: var(--text-secondary);
          font-size: 14px;
          margin: 0 0 6px 0;
        }

        .transcript-time {
          color: var(--text-tertiary);
          font-size: 12px;
          margin: 0;
        }

        .transcript-section {
          margin-bottom: 24px;
        }

        .transcript-section h2 {
          font-size: 20px;
          color: var(--text-primary);
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-color);
        }

        .transcript-header-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 12px;
        }

        .transcript-header-controls h2 {
          margin: 0;
          padding: 0;
          border: none;
        }

        .transcript-actions {
          display: flex;
          gap: 10px;
        }

        .transcript-text {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px;
          line-height: 1.7;
          color: var(--text-primary);
          max-height: 400px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .transcript-text p {
          margin: 0;
        }

        .transcript-empty {
          color: var(--text-tertiary);
          font-style: italic;
        }

        .transcript-prescriptions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .transcript-prescription {
          background: var(--bg-primary);
          border-left: 4px solid var(--accent-primary);
          padding: 12px;
          border-radius: 12px;
        }

        .transcript-prescription h3 {
          margin: 0 0 6px 0;
          font-size: 16px;
          color: var(--text-primary);
        }

        .transcript-prescription p {
          margin: 4px 0;
          color: var(--text-secondary);
          font-size: 13px;
        }

        .transcript-btn {
          padding: 10px 16px;
          border: 1px solid var(--border-color);
          background: var(--bg-hover);
          color: var(--text-primary);
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-btn:hover,
        .download-btn:hover {
          background: var(--bg-overlay);
          border-color: var(--border-hover);
        }

        .transcript-actions-section {
          text-align: center;
        }

        .primary-btn {
          background: var(--accent-primary);
          color: var(--bg-primary);
          padding: 12px 28px;
          font-size: 16px;
          border: none;
          border-radius: 28px;
        }

        .primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }

        .transcript-footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
          text-align: center;
          color: var(--text-tertiary);
          font-size: 12px;
        }

        .summary-text {
          background: var(--bg-primary);
          border-left: 4px solid var(--accent-primary);
          padding: 16px;
          border-radius: 12px;
          line-height: 1.7;
        }

        .summary-text p {
          margin: 0;
          color: var(--text-primary);
        }

        .transcript-loading,
        .transcript-error {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-secondary);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--border-color);
          border-top: 4px solid var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .transcript-error h2 {
          color: var(--accent-error);
          margin-bottom: 12px;
        }

        .transcript-error button {
          margin-top: 12px;
          padding: 10px 16px;
          background: var(--accent-primary);
          color: var(--bg-primary);
          border: none;
          border-radius: 20px;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .transcript-content {
            padding: 20px;
          }

          .transcript-header h1 {
            font-size: 22px;
          }

          .transcript-header-controls {
            flex-direction: column;
            align-items: stretch;
          }

          .transcript-actions {
            width: 100%;
          }

          .transcript-btn {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
