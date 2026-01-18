import { useState, useCallback, useRef } from 'react';

type Props = {
  onReady: () => void;
  onDrugCount?: (n: number) => void;
};

/**
 * Enhanced PDF upload component with loading states, progress indicators,
 * drag preview, and better visual feedback using theme variables.
 */
export function PdfUpload({ onReady, onDrugCount }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [drugCount, setDrugCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFile = useCallback(
    async (f: File) => {
      if (!f || f.type !== 'application/pdf') {
        setError('Please select a PDF file.');
        setStatus('error');
        setTimeout(() => {
          setError(null);
          setStatus('idle');
        }, 3000);
        return;
      }
      setFile(f);
      setError(null);
      setStatus('uploading');
      setUploadProgress(0);

      const form = new FormData();
      form.append('pdf', f);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      try {
        const res = await fetch('/upload-pdf', { method: 'POST', body: form });
        clearInterval(progressInterval);
        setUploadProgress(100);
        const data = await res.json();
        if (!res.ok) {
          setStatus('error');
          setError(data?.error || 'Upload failed');
          setTimeout(() => {
            setStatus('idle');
            setError(null);
          }, 3000);
          return;
        }
        setStatus('done');
        const n = data?.drugCount ?? 0;
        setDrugCount(n);
        onDrugCount?.(n);
        // Store patient drugs locally for client-side safety checks
        try {
          const drugs = Array.isArray(data?.drugs) ? data.drugs : [];
          localStorage.setItem('nexhacks.patientDrugs', JSON.stringify(drugs));
        } catch {}
        // Print full extracted text contents to the console (doctor-side use case)
        if (typeof data?.text === 'string') {
          console.log('=== FULL EXTRACTED PDF TEXT START ===');
          console.log(data.text);
          console.log('=== FULL EXTRACTED PDF TEXT END ===');
        } else {
          console.warn('No extracted text returned from server for this PDF.');
        }
      } catch {
        clearInterval(progressInterval);
        setStatus('error');
        setError('Upload failed. Start the backend with: node server.js');
        setTimeout(() => {
          setStatus('idle');
          setError(null);
        }, 3000);
      }
    },
    [onDrugCount]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) onFile(f);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (status === 'idle') {
      setIsDragging(true);
    }
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target?.files?.[0];
    if (f) onFile(f);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="pdf-upload">
      <h2>1. Upload medical data (PDF)</h2>
      <p className="pdf-upload-hint">
        We extract text and medication names to check for conflicts when the doctor prescribes during the call.
      </p>

      <div
        className={`pdf-upload-zone ${status === 'uploading' ? 'uploading' : ''} ${status === 'done' ? 'done' : ''} ${isDragging ? 'dragging' : ''} ${status === 'error' ? 'error' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={onSelect}
          disabled={status === 'uploading'}
          id="pdf-input"
        />
        {status === 'idle' && (
          <label htmlFor="pdf-input" className="pdf-upload-label">
            <span className="pdf-upload-icon">📄</span>
            <span className="pdf-upload-text">
              Drop PDF here or <span className="pdf-upload-browse">browse</span>
            </span>
            <span className="pdf-upload-hint-small">PDF files only</span>
          </label>
        )}
        {status === 'uploading' && (
          <div className="pdf-upload-progress">
            <div className="pdf-upload-spinner" />
            <span className="pdf-upload-progress-text">Parsing PDF…</span>
            <div className="pdf-upload-progress-bar">
              <div className="pdf-upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className="pdf-upload-progress-percent">{uploadProgress}%</span>
          </div>
        )}
        {status === 'done' && (
          <div className="pdf-upload-success">
            <div className="pdf-upload-success-icon">✓</div>
            <div className="pdf-upload-success-content">
              <div className="pdf-upload-filename">{file?.name}</div>
              <div className="pdf-upload-fileinfo">
                {file && formatFileSize(file.size)} • {drugCount} medication{drugCount !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="pdf-upload-error-display">
            <span className="pdf-upload-error-icon">⚠</span>
            <span>Upload failed</span>
          </div>
        )}
      </div>

      {error && (
        <div className="pdf-upload-error-message" role="alert">
          {error}
        </div>
      )}

      <button
        className={`pdf-upload-start ${status === 'done' ? 'ready' : ''}`}
        disabled={status !== 'done'}
        onClick={onReady}
      >
        <span>Start call</span>
        {status === 'done' && <span className="pdf-upload-start-arrow">→</span>}
      </button>

      <style>{`
        .pdf-upload {
          max-width: 480px;
          margin: 0 auto;
          text-align: center;
          padding: 32px;
          animation: fadeIn 0.4s ease;
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .pdf-upload {
            padding: 24px 16px;
            max-width: 100%;
          }
          .pdf-upload h2 {
            font-size: 1.3rem;
          }
          .pdf-upload-hint {
            font-size: 0.85rem;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pdf-upload h2 {
          font-size: 1.5rem;
          margin-bottom: 8px;
          color: var(--text-primary);
          font-weight: 600;
        }
        .pdf-upload-hint {
          font-size: 0.9rem;
          color: var(--text-tertiary);
          margin-bottom: 24px;
          line-height: 1.5;
        }
        .pdf-upload-zone {
          border: 2px dashed var(--border-color);
          border-radius: 16px;
          padding: 48px 32px;
          background: var(--bg-hover);
          margin-bottom: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .pdf-upload-zone {
            padding: 32px 20px;
          }
          .pdf-upload-icon {
            font-size: 36px;
          }
        }
        .pdf-upload-zone:hover:not(.uploading):not(.done) {
          border-color: var(--accent-primary);
          background: var(--bg-overlay);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .pdf-upload-zone.dragging {
          border-color: var(--accent-primary);
          background: var(--bg-overlay);
          transform: scale(1.02);
          box-shadow: var(--shadow-lg);
        }
        .pdf-upload-zone.uploading {
          border-color: var(--accent-primary);
          pointer-events: none;
        }
        .pdf-upload-zone.done {
          border-color: var(--accent-success);
          background: var(--bg-overlay);
          animation: successPulse 0.5s ease;
        }
        .pdf-upload-zone.error {
          border-color: var(--accent-error);
          animation: errorShake 0.4s ease;
        }
        @keyframes successPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes errorShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .pdf-upload-zone input[type=file] {
          display: none;
        }
        .pdf-upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }
        .pdf-upload-icon {
          font-size: 48px;
          opacity: 0.7;
          transition: transform 0.3s ease;
        }
        .pdf-upload-zone:hover .pdf-upload-icon {
          transform: scale(1.1);
        }
        .pdf-upload-text {
          font-size: 1rem;
          color: var(--text-secondary);
        }
        .pdf-upload-browse {
          color: var(--accent-primary);
          text-decoration: underline;
          font-weight: 600;
        }
        .pdf-upload-hint-small {
          font-size: 0.85rem;
          color: var(--text-tertiary);
        }
        .pdf-upload-progress {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          width: 100%;
        }
        .pdf-upload-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-color);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .pdf-upload-progress-text {
          color: var(--text-secondary);
          font-size: 0.95rem;
        }
        .pdf-upload-progress-bar {
          width: 100%;
          height: 6px;
          background: var(--border-color);
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }
        .pdf-upload-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-primary), var(--accent-success));
          border-radius: 3px;
          transition: width 0.3s ease;
          animation: progressShimmer 1.5s infinite;
        }
        @keyframes progressShimmer {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        .pdf-upload-progress-percent {
          font-size: 0.85rem;
          color: var(--text-tertiary);
        }
        .pdf-upload-success {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
        }
        .pdf-upload-success-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--accent-success);
          color: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          flex-shrink: 0;
          animation: successIconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes successIconPop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .pdf-upload-success-content {
          flex: 1;
          text-align: left;
        }
        .pdf-upload-filename {
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
          word-break: break-word;
        }
        .pdf-upload-fileinfo {
          font-size: 0.85rem;
          color: var(--text-tertiary);
        }
        .pdf-upload-error-display {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--accent-error);
        }
        .pdf-upload-error-icon {
          font-size: 24px;
        }
        .pdf-upload-error-message {
          color: var(--accent-error);
          font-size: 0.9rem;
          margin-bottom: 12px;
          padding: 12px;
          background: rgba(var(--accent-error-rgb, 255, 85, 85), 0.1);
          border-radius: 8px;
          border-left: 3px solid var(--accent-error);
          animation: fadeIn 0.3s ease;
        }
        .pdf-upload-start {
          background: var(--accent-success);
          color: var(--bg-primary);
          border: none;
          padding: 14px 32px;
          border-radius: 28px;
          font-weight: 600;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: var(--shadow-sm);
        }
        @media (max-width: 768px) {
          .pdf-upload-start {
            padding: 12px 24px;
            font-size: 0.9rem;
            width: 100%;
            justify-content: center;
          }
        }
        .pdf-upload-start:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          background: var(--accent-success);
          filter: brightness(1.1);
        }
        .pdf-upload-start:active:not(:disabled) {
          transform: translateY(0);
        }
        .pdf-upload-start:disabled {
          background: var(--border-color);
          cursor: not-allowed;
          color: var(--text-tertiary);
          opacity: 0.6;
        }
        .pdf-upload-start.ready {
          animation: buttonReady 0.6s ease;
        }
        @keyframes buttonReady {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .pdf-upload-start-arrow {
          transition: transform 0.3s ease;
        }
        .pdf-upload-start:hover:not(:disabled) .pdf-upload-start-arrow {
          transform: translateX(4px);
        }
      `}</style>
    </div>
  );
}
