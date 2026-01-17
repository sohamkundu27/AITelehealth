import { useEffect, useRef } from 'react';
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

type Props = {
  overshootResult?: string;
  overshootState?: 'CONFUSION' | 'UNDERSTANDING';
  overshootEvidence?: string;
  enabled?: boolean;
};

/**
 * Sends patient-side data (Overshoot AI results, audio levels, etc.) to all participants
 * via LiveKit data channels. This allows the doctor to see patient comprehension status.
 */
export function PatientDataSender({ 
  overshootResult, 
  overshootState, 
  overshootEvidence,
  enabled = true 
}: Props) {
  const room = useRoomContext();
  const lastSentRef = useRef<{ result: string; timestamp: number } | null>(null);

  useEffect(() => {
    if (!enabled || !room || !overshootResult) return;

    // Debounce: only send if result changed or it's been > 2 seconds
    const now = Date.now();
    const shouldSend = 
      !lastSentRef.current || 
      lastSentRef.current.result !== overshootResult ||
      (now - lastSentRef.current.timestamp) > 2000;

    if (!shouldSend) return;

    const patientData: PatientData = {
      overshoot: {
        result: overshootResult,
        state: overshootState,
        visualEvidence: overshootEvidence,
        timestamp: now,
      },
      timestamp: now,
    };

    try {
      const payload = JSON.stringify({
        type: 'patient_data',
        data: patientData,
      });

      room.localParticipant?.publishData(
        new TextEncoder().encode(payload),
        { reliable: true }
      );

      lastSentRef.current = { result: overshootResult, timestamp: now };
      console.log('📤 Sent patient data to doctor:', patientData);
    } catch (e) {
      console.warn('❌ Failed to send patient data:', e);
    }
  }, [room, overshootResult, overshootState, overshootEvidence, enabled]);

  return null; // This component doesn't render anything
}
