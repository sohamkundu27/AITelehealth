/**
 * Patient-friendly drug explanations for the clarification panel.
 * These are simple, non-medical explanations that help patients understand
 * what the doctor is talking about without feeling overwhelmed.
 */

export interface DrugExplanation {
  simpleName: string; // What patients might call it
  explanation: string; // Simple explanation
  commonUses: string[]; // What it's used for
  importantNotes: string[]; // Key things to know
  alternatives?: string; // Mention of alternatives if relevant
}

const drugExplanations: Record<string, DrugExplanation> = {
  // NSAIDs
  'NSAID': {
    simpleName: 'Pain relievers (like ibuprofen)',
    explanation: 'Pain-relief medications like ibuprofen or naproxen. They reduce pain, swelling, and fever.',
    commonUses: ['Pain relief', 'Reducing inflammation', 'Fever reduction'],
    importantNotes: [
      'Can sometimes affect blood pressure or kidneys',
      'May cause stomach upset if taken on empty stomach',
      'Alternatives exist if you\'ve had side effects before'
    ],
    alternatives: 'There are other pain relief options if NSAIDs don\'t work for you'
  },
  'ibuprofen': {
    simpleName: 'Ibuprofen (Advil, Motrin)',
    explanation: 'A common over-the-counter pain reliever and anti-inflammatory medication.',
    commonUses: ['Headaches', 'Muscle pain', 'Arthritis pain', 'Fever'],
    importantNotes: [
      'Take with food to avoid stomach upset',
      'Can affect blood pressure',
      'Not recommended for long-term use without doctor supervision'
    ]
  },
  'naproxen': {
    simpleName: 'Naproxen (Aleve)',
    explanation: 'A pain reliever similar to ibuprofen, often used for longer-lasting pain relief.',
    commonUses: ['Arthritis', 'Muscle pain', 'Menstrual cramps'],
    importantNotes: [
      'Can sometimes affect blood pressure or kidneys',
      'May interact with certain blood pressure medications',
      'Alternatives exist if you\'ve had side effects before'
    ],
    alternatives: 'Your doctor can suggest other options if naproxen isn\'t right for you'
  },
  'aspirin': {
    simpleName: 'Aspirin',
    explanation: 'A pain reliever that can also help prevent blood clots.',
    commonUses: ['Pain relief', 'Heart attack prevention (low dose)', 'Fever reduction'],
    importantNotes: [
      'Can cause stomach irritation',
      'Not recommended for children with fevers',
      'May interact with blood thinners'
    ]
  },
  
  // ACE Inhibitors
  'lisinopril': {
    simpleName: 'Lisinopril',
    explanation: 'A medication used to treat high blood pressure and heart conditions.',
    commonUses: ['High blood pressure', 'Heart failure', 'Protecting kidneys in diabetes'],
    importantNotes: [
      'Can cause a dry cough in some people',
      'May interact with NSAIDs (pain relievers)',
      'Important to monitor kidney function if taking with pain medications'
    ]
  },
  'ACE inhibitor': {
    simpleName: 'Blood pressure medication',
    explanation: 'Medications that help lower blood pressure and protect the heart and kidneys.',
    commonUses: ['High blood pressure', 'Heart conditions', 'Kidney protection'],
    importantNotes: [
      'May interact with pain relievers (NSAIDs)',
      'Can cause dry cough in some people',
      'Your doctor monitors kidney function when combining with other medications'
    ]
  },
  
  // Common antibiotics
  'amoxicillin': {
    simpleName: 'Amoxicillin',
    explanation: 'A common antibiotic used to treat bacterial infections.',
    commonUses: ['Ear infections', 'Respiratory infections', 'Urinary tract infections'],
    importantNotes: [
      'Must finish the full course even if you feel better',
      'Can cause stomach upset - take with food',
      'Tell your doctor if you have penicillin allergies'
    ]
  },
  
  // Statins
  'atorvastatin': {
    simpleName: 'Atorvastatin (Lipitor)',
    explanation: 'A medication that helps lower cholesterol levels.',
    commonUses: ['High cholesterol', 'Heart disease prevention'],
    importantNotes: [
      'Usually taken at bedtime',
      'May cause muscle aches in some people',
      'Avoid grapefruit juice while taking this'
    ]
  },
  
  // Metformin
  'metformin': {
    simpleName: 'Metformin',
    explanation: 'A medication used to treat type 2 diabetes by helping your body use insulin better.',
    commonUses: ['Type 2 diabetes', 'Blood sugar control'],
    importantNotes: [
      'Take with meals to reduce stomach upset',
      'Can cause vitamin B12 deficiency with long-term use',
      'Important to monitor kidney function'
    ]
  }
};

/**
 * Get patient-friendly explanation for a drug.
 * Returns a simplified explanation or null if not found.
 */
export function getDrugExplanation(drugName: string): DrugExplanation | null {
  const normalized = drugName.toLowerCase().trim();
  
  // Direct match
  if (drugExplanations[normalized]) {
    return drugExplanations[normalized];
  }
  
  // Partial match (e.g., "naproxen sodium" -> "naproxen")
  for (const [key, explanation] of Object.entries(drugExplanations)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return explanation;
    }
  }
  
  // Check for common drug classes
  if (normalized.includes('nsaid') || normalized.includes('nonsteroidal')) {
    return drugExplanations['NSAID'];
  }
  
  if (normalized.includes('ace') && (normalized.includes('inhibitor') || normalized.includes('pril'))) {
    return drugExplanations['ACE inhibitor'];
  }
  
  return null;
}

/**
 * Generate a simple explanation for any drug (fallback when not in our dictionary).
 * Uses basic patterns to provide helpful context.
 */
export function generateFallbackExplanation(drugName: string): DrugExplanation {
  const normalized = drugName.toLowerCase();
  
  // Pattern matching for common drug types
  if (normalized.includes('antibiotic') || normalized.endsWith('mycin') || normalized.endsWith('cillin')) {
    return {
      simpleName: drugName,
      explanation: 'An antibiotic medication used to treat bacterial infections.',
      commonUses: ['Treating infections'],
      importantNotes: [
        'Finish the full course even if you feel better',
        'Take as directed by your doctor'
      ]
    };
  }
  
  if (normalized.includes('pain') || normalized.includes('analgesic')) {
    return {
      simpleName: drugName,
      explanation: 'A pain relief medication.',
      commonUses: ['Pain management'],
      importantNotes: [
        'Take as directed',
        'Contact your doctor if pain persists'
      ]
    };
  }
  
  // Generic fallback
  return {
    simpleName: drugName,
    explanation: `A medication your doctor has prescribed. Ask your doctor if you have questions about how to take it or what to expect.`,
    commonUses: ['As prescribed by your doctor'],
    importantNotes: [
      'Follow your doctor\'s instructions',
      'Contact your doctor if you have concerns or side effects'
    ]
  };
}
