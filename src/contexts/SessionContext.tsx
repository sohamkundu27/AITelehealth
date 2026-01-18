import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface ConfusionEvent {
  id: string;
  timestamp: number;
  state: 'CONFUSION' | 'UNDERSTANDING';
  visualEvidence: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  drugContext?: string; // Drug mentioned around the time of confusion
}

export interface DrugMention {
  drug: string;
  timestamp: number;
}

export interface Prescription {
  drug: string;
  dosage?: string;
  duration?: string;
  timestamp: number;
  prescribedBy?: string; // Doctor identity
}

export interface VisitSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  role: 'doctor' | 'patient';
  participantIdentity?: string; // LiveKit identity
  prescriptions: Prescription[];
  confusionEvents: ConfusionEvent[];
  drugMentions: DrugMention[];
  patientHistory?: string[]; // Drugs from PDF
}

interface SessionState {
  sessionId: string | null;
  confusionEvents: ConfusionEvent[];
  drugMentions: DrugMention[];
  prescriptions: Prescription[];
  visitStartTime: number | null;
  addConfusionEvent: (event: Omit<ConfusionEvent, 'id' | 'timestamp'>) => void;
  addDrugMention: (drug: string) => void;
  addPrescription: (prescription: Omit<Prescription, 'timestamp'>) => void;
  getRecentConfusionEvents: (withinSeconds?: number) => ConfusionEvent[];
  getRecentDrugMentions: (withinSeconds?: number) => DrugMention[];
  linkConfusionToDrug: (confusionId: string, drug: string) => void;
  startVisit: (sessionId: string, role: 'doctor' | 'patient', participantIdentity?: string) => void;
  endVisit: () => VisitSession | null;
  getVisitData: () => VisitSession | null;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [confusionEvents, setConfusionEvents] = useState<ConfusionEvent[]>([]);
  const [drugMentions, setDrugMentions] = useState<DrugMention[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [visitStartTime, setVisitStartTime] = useState<number | null>(null);
  const [role, setRole] = useState<'doctor' | 'patient' | null>(null);
  const [participantIdentity, setParticipantIdentity] = useState<string | undefined>(undefined);

  const addConfusionEvent = useCallback((event: Omit<ConfusionEvent, 'id' | 'timestamp'>) => {
    const newEvent: ConfusionEvent = {
      ...event,
      id: `confusion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setConfusionEvents((prev) => [...prev, newEvent]);
    
    // Auto-link to recent drug mentions (within last 10 seconds)
    const recentDrugs = drugMentions.filter(
      (dm) => Date.now() - dm.timestamp < 10000
    );
    if (recentDrugs.length > 0 && event.state === 'CONFUSION') {
      // Link to the most recent drug
      const linkedEvent = { ...newEvent, drugContext: recentDrugs[recentDrugs.length - 1].drug };
      setConfusionEvents((prev) => 
        prev.map((e) => e.id === newEvent.id ? linkedEvent : e)
      );
    }
  }, [drugMentions]);

  const addDrugMention = useCallback((drug: string) => {
    const mention: DrugMention = {
      drug,
      timestamp: Date.now(),
    };
    setDrugMentions((prev) => [...prev, mention]);
  }, []);

  const getRecentConfusionEvents = useCallback((withinSeconds = 30) => {
    const cutoff = Date.now() - withinSeconds * 1000;
    return confusionEvents.filter((e) => e.timestamp >= cutoff);
  }, [confusionEvents]);

  const getRecentDrugMentions = useCallback((withinSeconds = 30) => {
    const cutoff = Date.now() - withinSeconds * 1000;
    return drugMentions.filter((dm) => dm.timestamp >= cutoff);
  }, [drugMentions]);

  const linkConfusionToDrug = useCallback((confusionId: string, drug: string) => {
    setConfusionEvents((prev) =>
      prev.map((e) => (e.id === confusionId ? { ...e, drugContext: drug } : e))
    );
  }, []);

  const addPrescription = useCallback((prescription: Omit<Prescription, 'timestamp'>) => {
    const newPrescription: Prescription = {
      ...prescription,
      timestamp: Date.now(),
    };
    setPrescriptions((prev) => [...prev, newPrescription]);
  }, []);

  const startVisit = useCallback((id: string, visitRole: 'doctor' | 'patient', identity?: string) => {
    setSessionId(id);
    setVisitStartTime(Date.now());
    setRole(visitRole);
    setParticipantIdentity(identity);
  }, []);

  const endVisit = useCallback((): VisitSession | null => {
    if (!sessionId || !visitStartTime || !role) {
      return null;
    }

    const visitData: VisitSession = {
      sessionId,
      startTime: visitStartTime,
      endTime: Date.now(),
      role,
      participantIdentity,
      prescriptions: [...prescriptions],
      confusionEvents: [...confusionEvents],
      drugMentions: [...drugMentions],
    };

    // Reset state
    setSessionId(null);
    setVisitStartTime(null);
    setRole(null);
    setParticipantIdentity(undefined);
    setPrescriptions([]);
    setConfusionEvents([]);
    setDrugMentions([]);

    return visitData;
  }, [sessionId, visitStartTime, role, participantIdentity, prescriptions, confusionEvents, drugMentions]);

  const getVisitData = useCallback((): VisitSession | null => {
    if (!sessionId || !visitStartTime || !role) {
      return null;
    }

    return {
      sessionId,
      startTime: visitStartTime,
      endTime: undefined,
      role,
      participantIdentity,
      prescriptions: [...prescriptions],
      confusionEvents: [...confusionEvents],
      drugMentions: [...drugMentions],
    };
  }, [sessionId, visitStartTime, role, participantIdentity, prescriptions, confusionEvents, drugMentions]);

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        confusionEvents,
        drugMentions,
        prescriptions,
        visitStartTime,
        addConfusionEvent,
        addDrugMention,
        addPrescription,
        getRecentConfusionEvents,
        getRecentDrugMentions,
        linkConfusionToDrug,
        startVisit,
        endVisit,
        getVisitData,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
