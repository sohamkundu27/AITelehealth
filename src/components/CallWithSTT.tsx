import { useState, useCallback, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { PrescriptionSTT } from './PrescriptionSTT';
import { ConflictCheckIndicator } from './ConflictCheckIndicator';
import { DrugInfoModal } from './DrugInfoModal';

/**
 * In-call layer: runs PrescriptionSTT and, when a drug is detected,
 * calls /check-interactions (Browserbase or RxNav) and shows ConflictCheckIndicator.
 */
export function CallWithSTT() {
  const room = useRoomContext();
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{ hasConflict: boolean; details: string; source?: string } | null>(null);
  const [currentDrug, setCurrentDrug] = useState<string | undefined>();
  const [showDrugModal, setShowDrugModal] = useState(false);

  const onPrescriptionDetected = useCallback(async (drug: string) => {
    

    //Check Against Patient History (Unimplemented)
    console.log('💊 Checking interactions for:', drug);
    setCurrentDrug(drug);
    setIsChecking(true);
    setResult(null);
    
    // Show modal on local screen
    setShowDrugModal(true);
    
    // Broadcast to all participants
    if (room?.localParticipant) {
      try {
        console.log('📡 Broadcasting drug detection:', drug);
        console.log('   Room:', room);
        console.log('   LocalParticipant:', room.localParticipant);
        
        await room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({ type: 'drug_detected', drug })),
          { reliable: true }
        );
        console.log('📡 ✅ Broadcasted drug detection to all participants');
      } catch (e) {
        console.warn('❌ Failed to broadcast drug detection:', e);
      }
    } else {
      console.warn('❌ No room or localParticipant available');
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
  }, [room]);

  // Listen for incoming drug detections
  useEffect(() => {
    if (!room) {
      console.log('⚠️ No room available yet');
      return;
    }
    console.log('📡 Setting up data_received listener on room:', room);
    console.log('📡 Available room events:', Object.getOwnPropertyNames(room).filter(n => n.includes('on') || n.includes('add')).slice(0, 20));
    
    const handleData = (payload: Uint8Array, participant?: any) => {
      try {
        console.log('📡 RAW DATA RECEIVED!', payload, 'from participant:', participant);
        const message = JSON.parse(new TextDecoder().decode(payload));
        console.log('📡 Parsed message:', message);
        
        if (message.type === 'drug_detected') {
          console.log('📡 ✅ Received drug detection from other participant:', message.drug);
          setCurrentDrug(message.drug);
          setShowDrugModal(true);
        }
      } catch (e) {
        console.warn('⚠️ Failed to parse incoming data:', e);
      }
    };
    
    // Try multiple event names
    room.on('data_received', handleData);
    console.log('📡 Attached listener to: data_received');
    
    return () => {
      console.log('📡 Cleaning up data_received listener');
      room.off('data_received', handleData);
    };
  }, [room]);

  return (
    <>
      <PrescriptionSTT onPrescriptionDetected={onPrescriptionDetected} />
      {showDrugModal && currentDrug && (
        <DrugInfoModal drug={currentDrug} onClose={() => setShowDrugModal(false)} />
      )}
      <ConflictCheckIndicator isChecking={isChecking} result={result} drug={currentDrug} />
    </>
  );
}
