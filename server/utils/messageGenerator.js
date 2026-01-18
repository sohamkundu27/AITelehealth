/**
 * Generates follow-up messages for clinicians and patients
 * after a post-visit safety check.
 */

/**
 * Generate clinician note (not an alert, just a note)
 * Format: "For patients on ACE inhibitors, consider renal monitoring..."
 */
function generateClinicianNote(safetyCheck) {
  const notes = [];

  // Check for ACE inhibitor + NSAID combination
  const aceInhibitors = safetyCheck.prescriptions.filter(p => 
    p.drug.toLowerCase().includes('lisinopril') ||
    p.drug.toLowerCase().includes('ace') ||
    p.drug.toLowerCase().includes('pril')
  );
  
  const nsaids = safetyCheck.prescriptions.filter(p => 
    p.drug.toLowerCase().includes('naproxen') ||
    p.drug.toLowerCase().includes('ibuprofen') ||
    p.drug.toLowerCase().includes('nsaid')
  );

  if (aceInhibitors.length > 0 && nsaids.length > 0) {
    const aceDrug = aceInhibitors[0].drug;
    const nsaidDrug = nsaids[0].drug;
    notes.push(
      `For patients on ${aceDrug}, consider renal monitoring or follow-up if ${nsaidDrug} use extends beyond the prescribed duration.`
    );
  }

  // Check for other common interactions
  if (safetyCheck.interactions && safetyCheck.interactions.length > 0) {
    notes.push(
      `Review potential interactions: ${safetyCheck.interactions.slice(0, 3).join(', ')}.`
    );
  }

  // Age-based considerations
  if (safetyCheck.patientAge && safetyCheck.patientAge > 65) {
    notes.push(
      `Patient is over 65 - consider reduced dosing or closer monitoring for new medications.`
    );
  }

  // Default note if no specific concerns
  if (notes.length === 0) {
    notes.push(
      `Standard follow-up recommended. Monitor patient response to prescribed medications.`
    );
  }

  return notes.join(' ');
}

/**
 * Generate patient follow-up message
 * Format: "If pain lasts beyond a week or you notice swelling..."
 */
function generatePatientFollowUp(safetyCheck) {
  const messages = [];

  // NSAID-specific follow-up
  const nsaids = safetyCheck.prescriptions.filter(p => 
    p.drug.toLowerCase().includes('naproxen') ||
    p.drug.toLowerCase().includes('ibuprofen') ||
    p.drug.toLowerCase().includes('nsaid')
  );

  if (nsaids.length > 0) {
    const nsaidDrug = nsaids[0].drug;
    messages.push(
      `If pain lasts beyond the prescribed duration or you notice swelling, reduced urination, or unusual symptoms, contact your provider immediately.`
    );
  }

  // ACE inhibitor + NSAID combination warning
  const aceInhibitors = safetyCheck.prescriptions.filter(p => 
    p.drug.toLowerCase().includes('lisinopril') ||
    p.drug.toLowerCase().includes('ace') ||
    p.drug.toLowerCase().includes('pril')
  );

  if (aceInhibitors.length > 0 && nsaids.length > 0) {
    messages.push(
      `Since you're taking both blood pressure medication and pain medication, watch for signs of kidney issues: reduced urination, swelling in your legs or feet, or unusual fatigue. Contact your provider if these occur.`
    );
  }

  // General follow-up
  if (messages.length === 0) {
    messages.push(
      `If you experience any unexpected side effects or your symptoms don't improve as expected, contact your provider.`
    );
  }

  // Add medication-specific reminders
  if (safetyCheck.prescriptions.length > 0) {
    messages.push(
      `Remember to take your medications as prescribed and complete the full course unless your doctor advises otherwise.`
    );
  }

  return messages.join(' ');
}

export { generateClinicianNote, generatePatientFollowUp };
