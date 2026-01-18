// Optional HuggingFace import - lazy loaded only when needed
import type { HfInference } from '@huggingface/inference';

async function getHfInstance(): Promise<HfInference | null> {
  try {
    const { HfInference } = await import("@huggingface/inference");
    const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
    if (apiKey) {
      return new HfInference(apiKey);
    }
  } catch (e) {
    console.warn('HuggingFace inference not available - will use raw data without summarization', e);
  }
  return null;
}

/**
 * Fetches official labeling data for a specific drug from openFDA.
 * @param drugName - The commercial or generic name of the drug (e.g., "Advil", "Warfarin")
 * @returns Promise<DrugData>
 */

export interface DrugData {
  brand_name: string;
  generic_name: string;
  route: string[];       // How it's administered (oral, injectable, etc.)
  interactions: string[]; // The raw text describing interactions
  warnings: string[];     // Boxed warnings or major cautions
  contraindications: string[]; // Who shouldn't take it
  dosage: string[];       // Dosage and administration
  adverse_reactions: string[]; // Side effects
  indications: string[];  // What the drug is actually for
  has_data: boolean;
}

export interface PopupData {
  title: string;
  generic_name: string;
  route: string;
  purpose: string;
  dosage: string;
  warnings: string[];
  side_effects: string[];
  contraindications: string[];
  interactions: string[];
}

export interface PatientHistory {
  drugs: string[];
  text?: string;
}

export interface SafetyResult {
  decision: 'safe' | 'unsafe' | 'unknown';
  confidence: number;
  rationale: string;
  source?: 'rxnav' | 'hf' | 'heuristic' | 'unknown';
  rxnavDetails?: string;
  patientDrugs?: string[];
}

// Few-shot style known unsafe combinations
const KNOWN_UNSAFE_PAIRS: Array<{ a: string; b: string; reason: string }> = [
  { a: 'sertraline', b: 'albuterol', reason: 'Known adverse combination per internal rule: Sertraline + Albuterol' },
];

interface OpenFDAResponse {
  results: Array<{
    openfda: {
      brand_name?: string[];
      generic_name?: string[];
      route?: string[];
    };
    drug_interactions?: string[];
    boxed_warning?: string[];
    warnings?: string[];
    contraindications?: string[];
    dosage_and_administration?: string[];
    adverse_reactions?: string[];
    indications_and_usage?: string[];
  }>;
}

export async function getDrugInfo(drugName: string): Promise<DrugData> {
  // Search
  const baseUrl = "https://api.fda.gov/drug/label.json";
  const query = `search=openfda.brand_name:"${encodeURIComponent(drugName)}"`;
  const limit = "limit=1"; // We only need the top match

  const url = `${baseUrl}?${query}&${limit}`;

  try {
    console.log(`Querying openFDA for ${drugName}...`);
    
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Drug "${drugName}" not found in openFDA.`);
        return createEmptyDrugData(drugName);
      }
      throw new Error(`OpenFDA API Error: ${response.statusText}`);
    }

    const data: OpenFDAResponse = await response.json();
    
    // 2. Parse the result (OpenFDA returns an array of results)
    if (!data.results || data.results.length === 0) {
      console.warn(`No results found for drug "${drugName}" in openFDA.`);
      return createEmptyDrugData(drugName);
    }
    const result = data.results[0];

    // 3. Map to our clean interface
    return {
      brand_name: result.openfda.brand_name?.[0] || drugName,
      generic_name: result.openfda.generic_name?.[0] || "Unknown",
      route: result.openfda.route || ["Route not specified."],
      // These fields return arrays of text paragraphs. We join them for easier NLP processing later.
      interactions: result.drug_interactions || ["No specific interaction data listed."],
      warnings: result.boxed_warning || result.warnings || ["No major warnings listed."],
      contraindications: result.contraindications || ["No contraindications listed."],
      dosage: result.dosage_and_administration || ["No dosage information available."],
      adverse_reactions: result.adverse_reactions || ["No adverse reactions data available."],
      indications: result.indications_and_usage || ["No indication data."],
      has_data: true
    };

  } catch (error) {
    console.error("Failed to fetch drug info:", error);
    return createEmptyDrugData(drugName);
  }
}

// Helper for when data is missing so the UI doesn't crash
function createEmptyDrugData(name: string): DrugData {
  return {
    brand_name: name,
    generic_name: "",
    route: [],
    interactions: [],
    warnings: [],
    contraindications: [],
    dosage: [],
    adverse_reactions: [],
    indications: [],
    has_data: false
  };
}

/**
 * Summarizes drug information into structured JSON format for popup display using LLM
 * @param drugData - The drug data to summarize
 * @returns Promise<PopupData> - Structured, condensed data for popup
 */
export async function summarizeToPopupFormat(drugData: DrugData): Promise<PopupData> {
  if (!drugData.has_data) {
    return {
      title: drugData.brand_name,
      generic_name: "Unknown",
      route: "Not specified",
      purpose: "No information available",
      dosage: "Consult a healthcare provider",
      warnings: [],
      side_effects: [],
      contraindications: [],
      interactions: [],
    };
  }

  try {
    // Helper to use LLM to condense text
    const condenseText = async (text: string, maxLength: number = 200): Promise<string> => {
      if (text.length <= maxLength) return text;
      const hfInstance = await getHfInstance();
      if (!hfInstance?.summarization) {
        // Fallback: just truncate if HuggingFace not available
        return text.substring(0, maxLength) + "...";
      }
      try {
        const result = await hfInstance.summarization({
          model: "facebook/bart-large-cnn",
          inputs: text.substring(0, 3000),
          parameters: { max_length: 100, min_length: 10 },
        });
        return result.summary_text;
      } catch {
        return text.substring(0, maxLength) + "...";
      }
    };

    // Helper to summarize text into bullet points using LLM
    const extractBulletsWithLLM = async (textArray: string[], maxItems: number = 5): Promise<string[]> => {
      if (!textArray || textArray.length === 0) return [];
      
      // Filter out empty/placeholder strings
      const validTexts = textArray.filter(t => 
        t && t.trim().length > 10 && 
        !t.toLowerCase().includes("no ") && 
        !t.toLowerCase().includes("not available") && 
        !t.toLowerCase().includes("not specified")
      );
      
      if (validTexts.length === 0) return [];
      
      const combined = validTexts.join(" ").substring(0, 2000);
      
      const hfInstance = await getHfInstance();
      if (!hfInstance?.summarization) {
        // Fallback: return first few valid texts if HuggingFace not available
        return validTexts.slice(0, maxItems).map(t => t.substring(0, 200));
      }
      
      try {
        const result = await hfInstance.summarization({
          model: "facebook/bart-large-cnn",
          inputs: combined,
          parameters: { max_length: 200, min_length: 40 },
        });
        
        // Split the summary into bullet points with improved logic
        const bullets = result.summary_text
          // Split on sentence boundaries (. ! ? followed by space or newline)
          .split(/(?<=[.!?])\s+(?=[A-Z])/g)
          // Also split on newlines and semicolons
          .flatMap((sentence: string) => sentence.split(/[;\n]/))
          .map((s: string) => s.trim())
          // Remove duplicates and empty strings
          .filter((s: string, index: number, array: string[]) => 
            s.length > 15 && 
            s.length < 250 &&
            !s.match(/^[\s\-•*]+$/) && // Skip pure bullet/dash lines
            array.indexOf(s) === index // Skip duplicates
          )
          // Clean up text
          .map((s: string) => {
            // Remove leading/trailing punctuation and bullets
            s = s.replace(/^[\s\-•*:]+|[\s\-•*:]+$/g, '').trim();
            // Capitalize first letter only if not already capitalized
            if (s.length > 0 && s[0] === s[0].toLowerCase()) {
              s = s.charAt(0).toUpperCase() + s.slice(1);
            }
            return s;
          })
          // Remove any remaining empty strings
          .filter((s: string) => s.length > 15)
          .slice(0, maxItems);
        
        return bullets.length > 0 ? bullets : [];

      } catch {
        return [];
      }
    };

    const [purposeSummary, dosageSummary, warningsBullets, sideEffectsBullets, contraindictionsBullets, interactionsBullets] = await Promise.all([
      condenseText(drugData.indications.join(" "), 250),
      condenseText(drugData.dosage.join(" "), 200),
      extractBulletsWithLLM(drugData.warnings, 4),
      extractBulletsWithLLM(drugData.adverse_reactions, 5),
      extractBulletsWithLLM(drugData.contraindications, 4),
      extractBulletsWithLLM(drugData.interactions, 4),
    ]);

    return {
      title: drugData.brand_name,
      generic_name: drugData.generic_name,
      route: drugData.route.join(", "),
      purpose: purposeSummary,
      dosage: dosageSummary,
      warnings: warningsBullets,
      side_effects: sideEffectsBullets,
      contraindications: contraindictionsBullets,
      interactions: interactionsBullets,
    };
  } catch (error) {
    console.error("Failed to format drug info for popup:", error);
    // Fallback to simple extraction
    return {
      title: drugData.brand_name,
      generic_name: drugData.generic_name,
      route: drugData.route.join(", "),
      purpose: drugData.indications[0]?.substring(0, 150) || "No information",
      dosage: drugData.dosage[0]?.substring(0, 150) || "Consult healthcare provider",
      warnings: drugData.warnings,
      side_effects: drugData.adverse_reactions,
      contraindications: drugData.contraindications,
      interactions: drugData.interactions,
    };
  }
}

/**
 * Retrieves patient medical records (drug list) from backend.
 */
export async function getPatientHistory(): Promise<PatientHistory> {
  try {
    const raw = localStorage.getItem('nexhacks.patientDrugs');
    const drugs = raw ? JSON.parse(raw) : [];
    if (Array.isArray(drugs)) {
      return { drugs, text: '' };
    }
    return { drugs: [], text: '' };
  } catch (e) {
    console.warn('Could not retrieve patient history from localStorage:', e);
    return { drugs: [], text: '' };
  }
}

/**
 * Uses HuggingFace zero-shot classification to judge safety of a drug for a given patient.
 * Falls back to heuristic matching when HF is not available.
 */
export async function evaluateDrugSafety(drugName: string, drugData: DrugData, patient: PatientHistory): Promise<SafetyResult> {
  try {
    // 0) Few-shot override: known unsafe pairs
    const dn = String(drugName || '').toLowerCase();
    const patientSet = new Set((patient.drugs || []).map(d => String(d).toLowerCase()));
    for (const pair of KNOWN_UNSAFE_PAIRS) {
      const hasPair = (dn === pair.a && patientSet.has(pair.b)) || (dn === pair.b && patientSet.has(pair.a));
      if (hasPair) {
        return {
          decision: 'unsafe',
          confidence: 0.95,
          rationale: pair.reason,
          source: 'heuristic',
          patientDrugs: patient.drugs || [],
        };
      }
    }
    // Try HuggingFace zero-shot classification if available
    const hf = await getHfInstance();

    const contextParts = [
      `Patient current medications: ${patient.drugs.join(', ') || 'None listed'}.`,
      `Drug name: ${drugName}. Generic: ${drugData.generic_name}. Route: ${drugData.route.join(', ') || 'N/A'}.`,
      `Indications: ${(drugData.indications || []).join(' ') || 'N/A'}.`,
      `Warnings: ${(drugData.warnings || []).join(' ') || 'N/A'}.`,
      `Contraindications: ${(drugData.contraindications || []).join(' ') || 'N/A'}.`,
      `Known interactions: ${(drugData.interactions || []).join(' ') || 'N/A'}.`,
      `Examples (few-shot): Sertraline + Albuterol → unsafe; Ibuprofen + Lisinopril → unsafe; Acetaminophen + Amoxicillin → safe.`,
    ];
    const input = contextParts.join('\n');

    if (hf?.zeroShotClassification) {
      try {
        const result = await hf.zeroShotClassification({
          model: 'facebook/bart-large-mnli',
          inputs: input,
          parameters: {
            candidate_labels: ['safe', 'unsafe'],
            multi_label: false,
          },
        });

        const raw = result as unknown as { labels: string[]; scores: number[] };
        const scores = Array.isArray(raw?.labels) && Array.isArray(raw?.scores)
          ? raw.labels.reduce((acc: Record<string, number>, label: string, idx: number) => {
              acc[label] = raw.scores[idx];
              return acc;
            }, {})
          : {};

        const unsafeScore = scores['unsafe'] ?? 0;
        const safeScore = scores['safe'] ?? 0;
        const decision = unsafeScore > safeScore ? 'unsafe' : 'safe';
        const confidence = Math.max(unsafeScore, safeScore);
        const rationale = `Model scores — safe: ${safeScore.toFixed(2)}, unsafe: ${unsafeScore.toFixed(2)}.`;
        return { decision, confidence, rationale, source: 'hf', patientDrugs: patient.drugs || [] };
      } catch (e) {
        console.warn('HuggingFace safety classification failed, falling back:', e);
      }
    }

    // Fallback heuristic: if any patient drug name occurs in interactions/warnings, mark unsafe
    const combined = [
      ...(drugData.interactions || []),
      ...(drugData.warnings || []),
      ...(drugData.contraindications || []),
    ].join(' ').toLowerCase();
    let hit = '';
    for (const d of patient.drugs || []) {
      const name = String(d).toLowerCase();
      if (name && combined.includes(name)) { hit = d; break; }
    }
    if (hit) {
      return {
        decision: 'unsafe',
        confidence: 0.65,
        rationale: `Heuristic: Found patient drug "${hit}" in contraindications/interactions/warnings.`,
        source: 'heuristic',
        patientDrugs: patient.drugs || [],
      };
    }
    return {
      decision: 'safe',
      confidence: 0.55,
      rationale: 'Heuristic: No obvious conflicts found in labeling data.',
      source: 'heuristic',
      patientDrugs: patient.drugs || [],
    };
  } catch (e) {
    console.warn('evaluateDrugSafety error:', e);
    return { decision: 'unknown', confidence: 0.0, rationale: 'Safety check unavailable.', source: 'unknown', patientDrugs: patient.drugs || [] };
  }
}