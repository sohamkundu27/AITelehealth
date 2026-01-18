import { useEffect, useRef } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { useSession } from '../contexts/SessionContext';
import { useRoleContext } from '../contexts/RoleContext';

/**
 * Manages visit session lifecycle:
 * - Starts visit when call connects
 * - Ends visit and triggers post-visit safety check when disconnected
 */
export function VisitManager() {
  const room = useRoomContext();
  const session = useSession();
  const role = useRoleContext();

  // Start visit when room connects (only once)
  const startedRef = useRef(false);
  useEffect(() => {
    if (!room || !role || startedRef.current) return;

    const handleConnected = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const sessionId = `visit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const participantIdentity = room.localParticipant?.identity;
      session.startVisit(sessionId, role, participantIdentity);
    };

    if (room.state === 'connected') {
      handleConnected();
    } else {
      room.on('connected', handleConnected);
      return () => {
        room.off('connected', handleConnected);
      };
    }
  }, [room, role]);

  // End visit when disconnected
  useEffect(() => {
    if (!room) return;

    const handleDisconnected = () => {
      const visitData = session.endVisit();
      
      if (visitData) {
        // Trigger post-visit safety check
        triggerPostVisitSafetyCheck(visitData);
      }
    };

    room.on('disconnected', handleDisconnected);
    return () => {
      room.off('disconnected', handleDisconnected);
    };
  }, [room, session]);

  return null; // This component doesn't render anything
}

async function triggerPostVisitSafetyCheck(visitData: any) {
  try {
    
    const response = await fetch('/post-visit-safety-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: visitData.sessionId,
        prescriptions: visitData.prescriptions.map((p: any) => ({
          drug: p.drug,
          dosage: p.dosage,
          duration: p.duration,
        })),
        patientHistory: visitData.patientHistory || [],
        role: visitData.role,
      }),
    });

    if (!response.ok) {
      throw new Error(`Safety check failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Store session ID for patient to access summary later
    if (visitData.role === 'patient' && result.sessionId) {
      sessionStorage.setItem('lastVisitSessionId', result.sessionId);
    }
    
    // If doctor, store transcript and redirect to transcript page
    if (visitData.role === 'doctor') {
      const transcriptData = {
        sessionId: visitData.sessionId,
        completeScript: visitData.completeScript || '',
        prescriptions: visitData.prescriptions.map((p: any) => ({
          drug: p.drug,
          dosage: p.dosage,
          duration: p.duration,
        })),
        startTime: visitData.startTime,
        endTime: visitData.endTime,
      };
      sessionStorage.setItem(`transcript-${visitData.sessionId}`, JSON.stringify(transcriptData));
      
      // Small delay to let the disconnect complete
      setTimeout(() => {
        window.location.href = `/visit-transcript/${visitData.sessionId}`;
      }, 1000);
    }
    // If patient, redirect to summary page
    else if (visitData.role === 'patient' && result.sessionId) {
      // Small delay to let the disconnect complete
      setTimeout(() => {
        window.location.href = `/visit-summary/${result.sessionId}`;
      }, 1000);
    }
  } catch (error) {
    console.error('[VisitManager] Post-visit safety check error:', error);
  }
}
