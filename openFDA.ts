import { HfInference } from "@huggingface/inference";

const hf = new HfInference(import.meta.env.VITE_HUGGINGFACE_API_KEY);

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
      try {
        const result = await hf.summarization({
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
      
      try {
        const result = await hf.summarization({
          model: "facebook/bart-large-cnn",
          inputs: combined,
          parameters: { max_length: 200, min_length: 40 },
        });
        
        // Split the summary into bullet points with improved logic
        let bullets = result.summary_text
          // Split on sentence boundaries (. ! ? followed by space or newline)
          .split(/(?<=[.!?])\s+(?=[A-Z])/g)
          // Also split on newlines and semicolons
          .flatMap(sentence => sentence.split(/[;\n]/))
          .map(s => s.trim())
          // Remove duplicates and empty strings
          .filter((s, index, array) => 
            s.length > 15 && 
            s.length < 250 &&
            !s.match(/^[\s\-•*]+$/) && // Skip pure bullet/dash lines
            array.indexOf(s) === index // Skip duplicates
          )
          // Clean up text
          .map(s => {
            // Remove leading/trailing punctuation and bullets
            s = s.replace(/^[\s\-•*:]+|[\s\-•*:]+$/g, '').trim();
            // Capitalize first letter only if not already capitalized
            if (s.length > 0 && s[0] === s[0].toLowerCase()) {
              s = s.charAt(0).toUpperCase() + s.slice(1);
            }
            return s;
          })
          // Remove any remaining empty strings
          .filter(s => s.length > 15)
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