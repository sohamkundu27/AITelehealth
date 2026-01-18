import { useState, useRef, useEffect, useCallback } from 'react';

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
};

/**
 * STT via Web Speech API. Listens to local microphone and detects drug names.
 * When detected, calls onPrescriptionDetected(drug). Runs alongside the LiveKit call.
 */
export function PrescriptionSTT({ onPrescriptionDetected, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState('');
  const recRef = useRef<{ start?: () => void; stop?: () => void } | null>(null);
  const lastDrugRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeningRef = useRef(false);
  listeningRef.current = listening;

  const onResult = useCallback(
    (e: { results?: { [i: number]: { [j: number]: { transcript?: string } } }; resultIndex?: number }) => {
      const idx = e.resultIndex ?? 0;
      const t = (e.results?.[idx]?.[0]?.transcript || '').trim();
      if (!t) return;
      setLastTranscript(t);
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
    [onPrescriptionDetected]
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
          position: fixed; bottom: 80px; left: 20px; z-index: 9998;
          background: rgba(20,20,28,0.9); backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 14px;
          color: #fff; font-size: 12px; max-width: 260px;
        }
        .stt-header { display: flex; align-items: center; gap: 8px; }
        .stt-dot { width: 8px; height: 8px; border-radius: 50%; background: #555; }
        .stt-dot.on { background: #0f8; box-shadow: 0 0 8px #0f8; }
        .stt-label { flex: 1; }
        .stt-btn { background: rgba(255,255,255,0.15); border: none; color: #fff; padding: 4px 10px; border-radius: 8px; cursor: pointer; font-size: 11px; }
        .stt-err { color: #f66; margin-top: 6px; }
        .stt-transcript { margin-top: 6px; color: rgba(255,255,255,0.5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      `}</style>
    </div>
  );
}
