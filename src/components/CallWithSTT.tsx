import { useState, useCallback, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, type RemoteParticipant, ConnectionState } from 'livekit-client';
import { MonitoringPanel } from './MonitoringPanel';
import { ConflictCheckIndicator } from './ConflictCheckIndicator';
import { DrugInfoModal } from './DrugInfoModal';
import { PrescriptionHistory, type PrescriptionEntry } from './PrescriptionHistory';
import { useSession } from '../contexts/SessionContext';

/**
 * In-call layer: runs PrescriptionSTT and, when a drug is detected,
 * calls /check-interactions (Browserbase or RxNav) and shows ConflictCheckIndicator.
 * Also manages prescription history and connection status.
 */
export function CallWithSTT() {
  const room = useRoomContext();
  const session = useSession();
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{ hasConflict: boolean; details: string; source?: string } | null>(null);
  const [activeDrugs, setActiveDrugs] = useState<string[]>([]);
  const [prescriptionHistory, setPrescriptionHistory] = useState<PrescriptionEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);

  const onPrescriptionDetected = useCallback(async (drug: string) => {
    // Check Against Patient History (Unimplemented)
    console.log('💊 Checking interactions for:', drug);
    
    // Create prescription entry for history
    const entryId = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const entry: PrescriptionEntry = {
      id: entryId,
      drug,
      timestamp: Date.now(),
    };

    // Track drug mention in session (for linking with confusion events)
    session.addDrugMention(drug);
    
    // Track as prescription (when doctor prescribes, not just mentions)
    // TODO: Parse dosage/duration from transcript
    session.addPrescription({
      drug,
      prescribedBy: room?.localParticipant?.identity,
    });
    
    // Add drug to active list if not already present
    setActiveDrugs((prev) => (prev.includes(drug) ? prev : [...prev, drug]));
    setIsChecking(true);
    setResult(null);

    // Broadcast to all participants so the popup shows up for everyone
    if (room?.localParticipant) {
      try {
        const payload = {
          type: 'drug_detected',
          drug,
          by: room.localParticipant.identity,
          id: entryId,
          ts: Date.now(),
        };
        await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(payload)), {
          reliable: true,
        });
        console.log('📡 Broadcasted drug detection to room:', payload);
      } catch (e) {
        console.warn('❌ Failed to broadcast drug detection:', e);
      }
    }

    try {
      const res = await fetch('/check-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDrug: drug }),
      });
      const data = await res.json();
      console.log('✅ Interaction check result:', data);
      setResult(data);
      
      // Update entry with conflict status and add to history
      entry.hasConflict = data.hasConflict;
      setPrescriptionHistory((prev) => [entry, ...prev]);
    } catch {
      console.log('❌ Interaction check failed');
      setResult({ hasConflict: false, details: 'Conflict check request failed.' });
      setPrescriptionHistory((prev) => [entry, ...prev]);
    } finally {
      setIsChecking(false);
    }
  }, [room, session]);

  // Track connection state
  useEffect(() => {
    if (!room) return;
    setConnectionState(room.state);
    const updateState = () => setConnectionState(room.state);
    room.on(RoomEvent.ConnectionStateChanged, updateState);
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, updateState);
    };
  }, [room]);

  // Listen for incoming drug detections
  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const message = JSON.parse(new TextDecoder().decode(payload));
        if (message?.type !== 'drug_detected') return;
        // LiveKit does not echo to the sender, but guard anyway
        if (participant?.isLocal) return;
        setActiveDrugs((prev) => (prev.includes(message.drug) ? prev : [...prev, message.drug]));
        // Add to history
        const entry: PrescriptionEntry = {
          id: message.id || `${Date.now()}-${Math.random()}`,
          drug: message.drug,
          timestamp: message.ts || Date.now(),
        };
        setPrescriptionHistory((prev) => [entry, ...prev]);
      } catch (e) {
        console.warn('⚠️ Failed to parse incoming data:', e);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  const handleDrugSelect = (drug: string) => {
    if (!activeDrugs.includes(drug)) {
      setActiveDrugs((prev) => [...prev, drug]);
    }
  };

  const handleClearHistory = () => {
    setPrescriptionHistory([]);
  };

  const closeDrugModal = (drug: string) => {
    console.log('Removing modal for:', drug);
    setActiveDrugs(prev => prev.filter(d => d !== drug));
  };

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case ConnectionState.Connected:
        return 'Connected';
      case ConnectionState.Connecting:
        return 'Connecting...';
      case ConnectionState.Disconnected:
        return 'Disconnected';
      case ConnectionState.Reconnecting:
        return 'Reconnecting...';
      default:
        return 'Unknown';
    }
  };

  const isConnectionHealthy = connectionState === ConnectionState.Connected;

  return (
    <>
      {/* Connection status indicator */}
      <div className="connection-status">
        <div className={`connection-status-dot ${isConnectionHealthy ? 'connected' : 'disconnected'}`} />
        <span className="connection-status-text">{getConnectionStatusText()}</span>
      </div>

      {/* Unified monitoring panel */}
      <MonitoringPanel onPrescriptionDetected={onPrescriptionDetected} />

      {/* Drug information modals */}
      <div
        className="drug-modals-container"
        style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', position: 'fixed', top: '20px', left: '20px', zIndex: 1200 }}
      >
        {activeDrugs.map(drug => (
          <DrugInfoModal
            key={drug}
            drug={drug}
            onClose={() => closeDrugModal(drug)}
          />
        ))}
        <style>{`
          .drug-modals-container {
            max-width: calc(100vw - 40px);
          }
          @media (max-width: 768px) {
            .drug-modals-container {
              top: 60px;
              left: 10px;
              gap: 12px;
            }
          }
        `}</style>
      </div>

      {/* Conflict check notifications */}
      <ConflictCheckIndicator isChecking={isChecking} result={result} drug={activeDrugs[0]} />

      {/* Prescription history sidebar */}
      <PrescriptionHistory
        prescriptions={prescriptionHistory}
        onDrugSelect={handleDrugSelect}
        onClear={handleClearHistory}
        isOpen={isHistoryOpen}
        onToggle={() => setIsHistoryOpen(!isHistoryOpen)}
      />
      <style>{`
        .connection-status {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 800;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-overlay);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          font-size: 11px;
          color: var(--text-secondary);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          transition: opacity 0.2s ease;
          will-change: opacity;
          white-space: nowrap;
        }
        @media (max-width: 768px) {
          .connection-status {
            top: 10px;
            left: 10px;
            padding: 6px 10px;
            font-size: 10px;
            gap: 6px;
          }
        }
        .connection-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
          will-change: opacity;
        }
        .connection-status-dot.connected {
          background: var(--accent-success);
          box-shadow: 0 0 6px var(--accent-success);
        }
        .connection-status-dot.disconnected {
          background: var(--accent-error);
          box-shadow: 0 0 6px var(--accent-error);
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
        .connection-status-text {
          font-weight: 500;
        }
        @media (max-width: 768px) {
          .connection-status-text {
            font-size: 10px;
          }
        }
      `}</style>
    </>
  );
}
