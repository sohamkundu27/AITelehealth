import { useState, useCallback, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, type RemoteParticipant } from 'livekit-client';
import { PrescriptionSTT } from './PrescriptionSTT';
import { ConflictCheckIndicator } from './ConflictCheckIndicator';
import { DrugInfoModal } from './DrugInfoModal';
import { useSession } from '../contexts/SessionContext';

/**
 * In-call layer: runs PrescriptionSTT and, when a drug is detected,
 * calls /check-interactions (Browserbase or RxNav) and shows ConflictCheckIndicator.
 */
export function CallWithSTT() {
  const room = useRoomContext();
  const session = useSession();
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{ hasConflict: boolean; details: string; source?: string } | null>(null);
  const [activeDrugs, setActiveDrugs] = useState<string[]>([]);

  const onPrescriptionDetected = useCallback(async (drug: string) => {
    // Check Against Patient History (Unimplemented)
    console.log('💊 Checking interactions for:', drug);
    
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
          id: typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
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
    } catch {
      console.log('❌ Interaction check failed');
      setResult({ hasConflict: false, details: 'Conflict check request failed.' });
    } finally {
      setIsChecking(false);
    }
  }, [room, session]);

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
      } catch (e) {
        console.warn('⚠️ Failed to parse incoming data:', e);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  const closeDrugModal = (drug: string) => {
    console.log('Removing modal for:', drug);
    setActiveDrugs(prev => prev.filter(d => d !== drug));
  };

  return (
    <>
      <PrescriptionSTT onPrescriptionDetected={onPrescriptionDetected} />
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', position: 'fixed', top: '20px', left: '20px', zIndex: 9999 }}>
        {activeDrugs.map(drug => (
          <DrugInfoModal 
            key={drug} 
            drug={drug} 
            onClose={() => closeDrugModal(drug)}
          />
        ))}
      </div>
      <ConflictCheckIndicator isChecking={isChecking} result={result} drug={activeDrugs[0]} />
    </>
  );
}
