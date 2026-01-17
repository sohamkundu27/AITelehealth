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
  const [activeDrugs, setActiveDrugs] = useState<string[]>([]);

  const onPrescriptionDetected = useCallback(async (drug: string) => {
    

    //Check Against Patient History (Unimplemented)
    console.log('💊 Checking interactions for:', drug);
    // Add drug to active list if not already present
    setActiveDrugs(prev => prev.includes(drug) ? prev : [...prev, drug]);
    setIsChecking(true);
    setResult(null);
    
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
          setActiveDrugs(prev => prev.includes(message.drug) ? prev : [...prev, message.drug]);
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

  const closeDrugModal = (drug: string) => {
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
