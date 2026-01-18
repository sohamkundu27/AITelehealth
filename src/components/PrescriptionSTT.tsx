import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from '../contexts/SessionContext';

const COMMON_DRUGS = [
  'lisinopril', 'metoprolol', 'atorvastatin', 'omeprazole', 'metformin', 'sertraline', 'amlodipine', 'albuterol',
  'levothyroxine', 'enalapril', 'hydrochlorothiazide', 'furosemide', 'simvastatin', 'amoxicillin', 'ibuprofen',
  'acetaminophen', 'aspirin', 'warfarin', 'clopidogrel', 'losartan', 'valsartan', 'diltiazem', 'verapamil',
  'propranolol', 'atenolol', 'bisoprolol', 'carvedilol', 'labetalol', 'pravastatin', 'rosuvastatin', 'fluoxetine',
  'paroxetine', 'citalopram', 'escitalopram', 'venlafaxine', 'bupropion', 'duloxetine', 'tramadol', 'oxycodone',
  'morphine', 'hydrocodone', 'codeine', 'gabapentin', 'pregabalin', 'amitriptyline', 'nortriptyline', 'doxepin',
  'zolpidem', 'eszopiclone', 'zaleplon', 'lorazepam', 'alprazolam', 'diazepam', 'clonazepam', 'methotrexate',
  'prednisone', 'dexamethasone', 'hydrocortisone', 'insulin', 'glipizide', 'glyburide', 'pioglitazone', 'sitagliptin',
  'donepezil', 'memantine', 'levodopa', 'carbidopa', 'ropinirole', 'bromocriptine', 'tamsulosin', 'finasteride',
  'sildenafil', 'tadalafil', 'ciprofloxacin', 'levofloxacin', 'azithromycin', 'doxycycline', 'tetracycline', 'cephalexin',
  'penicillin', 'erythromycin', 'clarithromycin', 'metronidazole', 'nystatin', 'fluconazole', 'itraconazole', 'ketoconazole',
  'acyclovir', 'valacyclovir', 'oseltamivir', 'zanamivir', 'amantadine', 'rimantadine', 'ritonavir', 'lopinavir',
  'darunavir', 'atazanavir', 'efavirenz', 'rilpivirine', 'dolutegravir', 'bictegravir', 'cabotegravir', 'tenofovir',
  'lamivudine', 'emtricitabine', 'abacavir', 'zidovudine', 'didanosine', 'stavudine', 'zalcitabine', 'nevirapine',
  'delavirdine', 'maraviroc', 'enfuvirtide', 'ibalizumab', 'fostemsavir', 'letermovir', 'ganciclovir', 'valganciclovir',
  'cidofovir', 'foscarnet', 'famciclovir', 'penciclovir', 'trifluridine', 'idoxuridine', 'podofilox', 'imiquimod',
  'sinecatechins', 'podophyllin', 'cryotherapy', 'interferon', 'peginterferon', 'ribavirin', 'sofosbuvir', 'ledipasvir',
  'velpatasvir', 'voxilaprevir', 'glecaprevir', 'pibrentasvir', 'simeprevir', 'boceprevir', 'telaprevir', 'danoprevir',
  'asunaprevir', 'daclatasvir', 'faldaprevir', 'alisporivir', 'miravirsen', 'metavir', 'heplisav', 'engerix', 'recombivax', 'naproxen'
];

/**
 * Simple list-based drug detection. Looks for all known drug names in the transcript.
 */
function extractDrugs(transcript: string): string[] {
  if (!transcript || transcript.length < 3) return [];
  const lower = transcript.toLowerCase();
  const found: string[] = [];
  
  // Search for all known drug names in the transcript
  for (const drug of COMMON_DRUGS) {
    if (lower.includes(drug)) {
      const capitalized = drug.charAt(0).toUpperCase() + drug.slice(1);
      if (!found.includes(capitalized)) {
        found.push(capitalized);
      }
    }
  }
  
  return found;
}

type Props = {
  onPrescriptionDetected: (drug: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

/**
 * STT via Web Speech API. Listens to local microphone and detects drug names.
 * When detected, calls onPrescriptionDetected(drug). Runs alongside the LiveKit call.
 */
export function PrescriptionSTT({ onPrescriptionDetected, disabled, compact = false }: Props) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState('');
  const recRef = useRef<{ start?: () => void; stop?: () => void } | null>(null);
  const lastDrugRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptRef = useRef<string>(''); // Local ref to track complete script
  const listeningRef = useRef(false);
  listeningRef.current = listening;
  const session = useSession();

  const onResult = useCallback(
    (e: { results?: { [i: number]: { [j: number]: { transcript?: string } } }; resultIndex?: number }) => {
      const idx = e.resultIndex ?? 0;
      const t = (e.results?.[idx]?.[0]?.transcript || '').trim();
      if (!t) return;
      setLastTranscript(t);
      
      // Update local script ref with line breaks
      scriptRef.current = scriptRef.current ? `${scriptRef.current}\n${t}` : t;
      
      // Add to complete script in session context
      session.addToScript(t);
      
      // Console log the accumulated script
      console.log('📝 Complete Script (Doctor):', scriptRef.current);
      console.log('🎙️ Latest transcription:', t);
      
      const drugs = extractDrugs(t);
      
      // Process all detected drugs
      for (const drug of drugs) {
        // Debounce: avoid firing for the same drug within 8s
        const key = drug.toLowerCase();
        if (lastDrugRef.current === key) continue;
        lastDrugRef.current = key;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          lastDrugRef.current = null;
        }, 8000);
        console.log('🔍 Medication detected:', drug, '| Full transcript:', t);
        onPrescriptionDetected(drug);
      }
    },
    [onPrescriptionDetected, session]
  );

  useEffect(() => {
    const SR = (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (!SR) {
      setError('Speech recognition not supported (use Chrome)');
      return;
    }
    const rec = new SR() as {
      continuous?: boolean; interimResults?: boolean; lang?: string;
      onresult: (e: { results?: { [i: number]: { [j: number]: { transcript?: string } } }; resultIndex?: number }) => void;
      onerror: (e: { error?: string }) => void; onend: () => void; start?: () => void; stop?: () => void;
    };
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = onResult;
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') setError('Microphone access denied');
      else if (e.error !== 'aborted') setError(`STT: ${e.error}`);
    };
    rec.onend = () => {
      if (listeningRef.current && !disabled) rec.start?.();
    };
    recRef.current = rec;
    return () => {
      try { rec.stop?.(); } catch { /* ignore */ }
      recRef.current = null;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [onResult, disabled]);

  useEffect(() => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening && !disabled) {
      try { rec.start?.(); } catch { setError('Could not start microphone'); }
    } else {
      try { rec.stop?.(); } catch { /* ignore */ }
    }
  }, [listening, disabled]);

  // Auto-start listening when component mounts
  useEffect(() => {
    if (!disabled) {
      setListening(true);
    }
  }, [disabled]);

  return (
    <div className="stt-widget">
      <div className="stt-header">
        <span className={`stt-dot ${listening ? 'on' : ''}`} />
        <span className="stt-label">Prescription listener</span>
        <button
          type="button"
          className="stt-btn"
          onClick={() => setListening((v) => !v)}
          disabled={!!error || disabled}
        >
          {listening ? 'Stop' : 'Start'}
        </button>
      </div>
      {error && <div className="stt-err">{error}</div>}
      {listening && lastTranscript && (
        <div className="stt-transcript" title="Latest speech">{lastTranscript.slice(-80)}</div>
      )}
      <style>{`
        .stt-widget {
          ${compact ? '' : 'position: fixed; bottom: 100px; left: 20px; z-index: 600;'}
          background: ${compact ? 'transparent' : 'var(--bg-overlay)'};
          backdrop-filter: ${compact ? 'none' : 'blur(10px)'};
          -webkit-backdrop-filter: ${compact ? 'none' : 'blur(10px)'};
          border: ${compact ? 'none' : '1px solid var(--border-color)'};
          border-radius: ${compact ? '0' : '12px'};
          padding: ${compact ? '0' : '12px 16px'};
          color: var(--text-primary);
          font-size: 12px;
          max-width: ${compact ? 'none' : '280px'};
          width: ${compact ? '100%' : 'auto'};
          box-shadow: ${compact ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.2)'};
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          will-change: transform;
        }
        .stt-widget:hover {
          box-shadow: ${compact ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.25)'};
          transform: ${compact ? 'none' : 'translateY(-2px)'};
        }
        @media (max-width: 768px) {
          .stt-widget {
            ${compact ? '' : 'bottom: 120px; left: 10px; right: 10px;'}
            max-width: none;
            width: ${compact ? '100%' : 'auto'};
            padding: ${compact ? '0' : '10px 12px'};
            font-size: 11px;
          }
          .stt-label {
            font-size: 11px;
          }
          .stt-btn {
            padding: 5px 10px;
            font-size: 10px;
          }
        }
        .stt-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .stt-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--border-color);
          transition: all 0.3s ease;
        }
        .stt-dot.on {
          background: var(--accent-primary);
          box-shadow: 0 0 12px var(--accent-primary);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
        .stt-label {
          flex: 1;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .stt-btn {
          background: var(--bg-hover);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .stt-btn:hover:not(:disabled) {
          background: var(--bg-overlay);
          border-color: var(--border-hover);
          transform: scale(1.05);
        }
        .stt-btn:active:not(:disabled) {
          transform: scale(0.95);
        }
        .stt-err {
          color: var(--accent-error);
          margin-top: 8px;
          font-size: 11px;
          padding: 6px;
          background: rgba(255, 85, 85, 0.1);
          border-radius: 6px;
          border-left: 2px solid var(--accent-error);
        }
        .stt-transcript {
          margin-top: 8px;
          color: var(--text-tertiary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          font-style: italic;
          padding: 6px;
          background: var(--bg-hover);
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}
