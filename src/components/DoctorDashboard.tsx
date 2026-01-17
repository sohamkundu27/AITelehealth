import { useState, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';

type PatientData = {
  overshoot?: {
    result: string;
    state?: 'CONFUSION' | 'UNDERSTANDING';
    visualEvidence?: string;
    timestamp: number;
  };
  audioLevel?: number;
  timestamp: number;
};

type PatientStatus = {
  identity: string;
  data: PatientData;
  lastUpdate: number;
};

/**
 * Doctor-side dashboard that receives and displays patient data (Overshoot AI, audio, etc.)
 * Shows real-time patient comprehension status and alerts for confusion.
 */
export function DoctorDashboard() {
  const room = useRoomContext();
  const [patients, setPatients] = useState<Map<string, PatientStatus>>(new Map());
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array, participant?: any) => {
      try {
        const message = JSON.parse(new TextDecoder().decode(payload));
        
        if (message.type === 'patient_data' && participant) {
          const identity = participant.identity || participant.sid || 'unknown';
          const patientStatus: PatientStatus = {
            identity,
            data: message.data as PatientData,
            lastUpdate: Date.now(),
          };

          setPatients((prev) => {
            const updated = new Map(prev);
            updated.set(identity, patientStatus);
            return updated;
          });

          console.log('📥 Received patient data from:', identity, message.data);
        }
      } catch (e) {
        console.warn('⚠️ Failed to parse patient data:', e);
      }
    };

    room.on('data_received', handleData);

    // Clean up old patient data (if no update in 10 seconds, remove)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setPatients((prev) => {
        const updated = new Map(prev);
        for (const [id, status] of updated.entries()) {
          if (now - status.lastUpdate > 10000) {
            updated.delete(id);
          }
        }
        return updated;
      });
    }, 5000);

    return () => {
      room.off('data_received', handleData);
      clearInterval(cleanupInterval);
    };
  }, [room]);

  const patientArray = Array.from(patients.values());
  const hasConfusion = patientArray.some(
    (p) => p.data.overshoot?.state === 'CONFUSION'
  );

  if (patientArray.length === 0) {
    return (
      <div className="doctor-dashboard">
        <div className="dashboard-header">
          <h3>Patient Status</h3>
          <button onClick={() => setIsVisible(!isVisible)} className="toggle-btn">
            {isVisible ? '−' : '+'}
          </button>
        </div>
        {isVisible && (
          <div className="dashboard-content">
            <p className="no-data">Waiting for patient data...</p>
          </div>
        )}
        <style>{getStyles()}</style>
      </div>
    );
  }

  return (
    <div className={`doctor-dashboard ${hasConfusion ? 'alert' : ''}`}>
      <div className="dashboard-header">
        <h3>Patient Status {hasConfusion && '⚠️'}</h3>
        <button onClick={() => setIsVisible(!isVisible)} className="toggle-btn">
          {isVisible ? '−' : '+'}
        </button>
      </div>

      {isVisible && (
        <div className="dashboard-content">
          {patientArray.map((patient) => {
            const overshoot = patient.data.overshoot;
            const isConfused = overshoot?.state === 'CONFUSION';
            const timeAgo = Math.floor((Date.now() - patient.lastUpdate) / 1000);

            return (
              <div key={patient.identity} className={`patient-card ${isConfused ? 'confused' : ''}`}>
                <div className="patient-header">
                  <span className="patient-id">{patient.identity}</span>
                  <span className="patient-time">{timeAgo}s ago</span>
                </div>
                
                {overshoot && (
                  <div className="patient-status">
                    <div className={`status-badge ${isConfused ? 'confusion' : 'understanding'}`}>
                      {isConfused ? '⚠️ CONFUSION' : '✓ UNDERSTANDING'}
                    </div>
                    {overshoot.visualEvidence && (
                      <p className="evidence">{overshoot.visualEvidence}</p>
                    )}
                    {overshoot.result && (
                      <p className="result-text">{overshoot.result}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{getStyles()}</style>
    </div>
  );
}

function getStyles() {
  return `
    .doctor-dashboard {
      position: fixed;
      top: 20px;
      left: 20px;
      width: 320px;
      max-height: 80vh;
      background: rgba(20, 20, 28, 0.95);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 16px;
      color: white;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
    }

    .doctor-dashboard.alert {
      border-color: rgba(255, 136, 0, 0.6);
      box-shadow: 0 8px 32px rgba(255, 136, 0, 0.2);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 8px 32px rgba(255, 136, 0, 0.2); }
      50% { box-shadow: 0 8px 32px rgba(255, 136, 0, 0.4); }
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .dashboard-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .toggle-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dashboard-content {
      max-height: 60vh;
      overflow-y: auto;
    }

    .no-data {
      color: rgba(255, 255, 255, 0.5);
      font-size: 13px;
      text-align: center;
      padding: 20px;
    }

    .patient-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 8px;
      border-left: 3px solid rgba(255, 255, 255, 0.2);
      transition: all 0.2s;
    }

    .patient-card.confused {
      background: rgba(255, 136, 0, 0.15);
      border-left-color: #ff8800;
    }

    .patient-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .patient-id {
      font-weight: 600;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.9);
    }

    .patient-time {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
    }

    .patient-status {
      margin-top: 8px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .status-badge.confusion {
      background: rgba(255, 136, 0, 0.3);
      color: #ffaa44;
    }

    .status-badge.understanding {
      background: rgba(0, 200, 100, 0.3);
      color: #00ff88;
    }

    .evidence {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      margin: 4px 0;
      font-style: italic;
    }

    .result-text {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      margin: 4px 0 0;
      line-height: 1.4;
    }
  `;
}
