import express from 'express';
import multer from 'multer';
import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';
import cors from 'cors';
import { getDocumentProxy, extractText } from 'unpdf';
import { generateClinicianNote, generatePatientFollowUp } from './server/utils/messageGenerator.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: '.env.local' });

// Temporary in-memory store for parsed PDF (text + extracted drugs)
let storedPdf = { text: null, drugs: [] };

// Session storage for visit data (in-memory Map)
// Key: sessionId, Value: visit session data
const visitSessions = new Map();

/**
 * Heuristic extraction of likely drug names from medical text.
 * Looks for common drug suffixes and phrases like "X mg", "taking X".
 */
function extractDrugsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const seen = new Set();
  const drugs = [];

  // Common drug name suffixes (case-insensitive)
  const suffixRegex = /(?:^|[\s,;])([A-Z][a-zA-Z]*(?:olol|pril|cin|dipine|statin|cycline|mycin|prazole|formin|artan|azepam|oxetine|olone|ide|tide|dine|pine|done|tadine))(?=[\s,;.]|$)/gi;
  let m;
  while ((m = suffixRegex.exec(text)) !== null) {
    const name = m[1].trim();
    if (name.length > 2 && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      drugs.push(name);
    }
  }

  // Lines with "X mg", "X tablet", "X capsule", "X daily" — capture X
  const doseRegex = /(?:^|[\n])\s*([A-Z][a-zA-Z\-]+)\s+(?:\d+\s*)?(?:mg|mcg|mL|tablet|tablets|capsule|capsules|daily|twice|once)/gim;
  while ((m = doseRegex.exec(text)) !== null) {
    const name = m[1].trim();
    if (name.length > 2 && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      drugs.push(name);
    }
  }

  return drugs;
}

/**
 * Resolve drug name to RxCUI via RxNav (NIH). Returns null if not found.
 */
async function getRxcui(name) {
  const res = await fetch(
    `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}`
  );
  const json = await res.json();
  const id = json?.idGroup?.rxnormId?.[0] || json?.idGroup?.rxnormId;
  return id ? String(id) : null;
}

/**
 * Check interactions using RxNav API. Returns { hasConflict, details }.
 */
async function checkInteractionsRxNav(newDrug, existingDrugs) {
  const all = [newDrug, ...existingDrugs].filter(Boolean);
  const rxcuis = [];
  for (const d of all) {
    const id = await getRxcui(d);
    if (id) rxcuis.push(id);
  }
  if (rxcuis.length < 2) return { hasConflict: false, details: 'Insufficient drug data to check.', source: 'rxnav' };

  const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcui=${rxcuis.join(',')}`;
  const res = await fetch(url);
  const json = await res.json();
  const list = json?.fullInteractionTypeGroup || [];
  const pairs = [];
  for (const g of list) {
    for (const t of g?.fullInteractionType || []) {
      const names = (t?.interactionPair || []).map((p) => p?.interactionConcept?.[0]?.minConceptItem?.name).filter(Boolean);
      if (names.length) pairs.push(names.join(' + '));
    }
  }
  const hasConflict = pairs.length > 0;
  const details = hasConflict
    ? `Possible interaction(s): ${pairs.slice(0, 5).join('; ')}${pairs.length > 5 ? ' ...' : ''}`
    : 'No known interactions found.';
  return { hasConflict, details, source: 'rxnav' };
}

/**
 * Optional: check via Browserbase scraping drugs.com. Use when BROWSERBASE_* are set.
 */
async function checkInteractionsBrowserbase(newDrug, existingDrugs) {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;

  try {
    const Browserbase = (await import('@browserbasehq/sdk')).default;
    const { Builder } = await import('selenium-webdriver');
    const http = await import('http');

    const bb = new Browserbase({ apiKey });
    const session = await bb.sessions.create({ projectId });

    const customHttpAgent = new http.Agent({});
    customHttpAgent.addRequest = function (req, options) {
      req.setHeader('x-bb-signing-key', session.signingKey);
      http.Agent.prototype.addRequest.call(this, req, options);
    };

    const driver = new Builder()
      .forBrowser('chrome')
      .usingHttpAgent(customHttpAgent)
      .usingServer(session.seleniumRemoteUrl)
      .build();

    const toCheck = [newDrug, ...existingDrugs].filter(Boolean).slice(0, 5);
    const results = [];

    for (let i = 0; i < toCheck.length; i++) {
      for (let j = i + 1; j < toCheck.length; j++) {
        const a = toCheck[i].toLowerCase().replace(/\s+/g, '-');
        const b = toCheck[j].toLowerCase().replace(/\s+/g, '-');
        const url = `https://www.drugs.com/drug_interactions/${a}-with-${b}.html`;
        await driver.get(url);
        await new Promise((r) => setTimeout(r, 1500));
        const body = await driver.executeScript('return document.body.innerText;');
        if (/interaction|interact|contraindicated|moderate|major/i.test(body)) {
          const snippet = body.slice(0, 400).replace(/\s+/g, ' ').trim();
          results.push(`${toCheck[i]} + ${toCheck[j]}: ${snippet}`);
        }
      }
    }

    await driver.quit();

    const hasConflict = results.length > 0;
    const details = hasConflict
      ? results.slice(0, 3).join(' | ')
      : 'No interactions found (drugs.com).';
    return { hasConflict, details, source: 'browserbase' };
  } catch (e) {
    console.warn('Browserbase check failed:', e.message);
    return null;
  }
}

const createToken = async (role = 'doctor') => {
  const roomName = 'quick-chat-room';
  // Include role in identity for easy identification: "doctor-1234" or "patient-1234"
  const participantName = `${role}-${Math.floor(Math.random() * 10000)}`;

  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: participantName,
    ttl: '24h',
  });
  at.addGrant({ roomJoin: true, room: roomName });

  return await at.toJwt();
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());

// API routes first so they are not handled by static
app.get('/health', (req, res) => res.json({ ok: true, service: 'nexhacks-backend' }));

// Detect PDF parse errors (bad XRef, FormatError, encrypted, etc.) for a clearer 500 message.
function isPdfReadError(err) {
  const s = [err?.message, err?.details, String(err)].filter(Boolean).join(' ').toLowerCase();
  return /xref|formaterror|bad\s|password|encrypted|invalid|corrupt|malformed/.test(s);
}

app.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }
    const buf = req.file.buffer;
    if (buf.length < 5 || !buf.subarray(0, 5).toString('ascii').startsWith('%PDF-')) {
      return res.status(400).json({ error: 'File does not look like a valid PDF' });
    }
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    const drugs = extractDrugsFromText(text || '');
    storedPdf = { text: (text || '').slice(0, 50000), drugs };
    res.json({ ok: true, drugCount: drugs.length, drugs });
  } catch (err) {
    console.error('PDF upload error:', err);
    const msg = isPdfReadError(err)
      ? "This PDF could not be read. It may be corrupted, password-protected, or in a format we don't support. Try a different file or re-save the PDF."
      : 'Failed to parse PDF';
    res.status(500).json({ error: msg });
  }
});

app.get('/api/pdf-status', (req, res) => {
  res.json({
    loaded: !!storedPdf.text,
    drugCount: storedPdf.drugs?.length || 0,
    drugs: storedPdf.drugs || [],
  });
});

app.post('/check-interactions', async (req, res) => {
  try {
    const { newDrug } = req.body || {};
    if (!newDrug || typeof newDrug !== 'string') {
      return res.status(400).json({ error: 'Missing newDrug' });
    }
    const existingDrugs = storedPdf.drugs || [];

    let result = await checkInteractionsBrowserbase(newDrug, existingDrugs);
    if (!result) result = await checkInteractionsRxNav(newDrug, existingDrugs);

    res.json(result);
  } catch (err) {
    console.error('check-interactions error:', err);
    res.status(500).json({
      hasConflict: false,
      details: 'Conflict check failed. Please verify manually.',
      source: 'error',
    });
  }
});

app.get('/getToken', async (req, res) => {
  try {
    // Get role from query parameter, default to 'doctor' for backward compatibility
    const role = req.query.role === 'patient' ? 'patient' : 'doctor';
    const token = await createToken(role);
    res.send(token);
  } catch (err) {
    console.error(err);
    res.status(500).send('Could not generate token');
  }
});

// Post-visit safety check endpoint

app.post('/post-visit-safety-check', async (req, res) => {
  try {
    const { sessionId, prescriptions, patientHistory, role } = req.body;

    if (!sessionId || !prescriptions || !Array.isArray(prescriptions)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`[Post-Visit] Safety check for session ${sessionId}`);
    console.log(`[Post-Visit] Prescriptions: ${prescriptions.length}`);
    console.log(`[Post-Visit] Patient history: ${patientHistory?.length || 0} drugs`);

    // Get patient history from stored PDF
    const existingDrugs = storedPdf.drugs || [];
    const allPatientDrugs = [...existingDrugs, ...(patientHistory || [])];

    // Perform safety checks
    const safetyCheck = {
      sessionId,
      prescriptions,
      patientHistory: allPatientDrugs,
      interactions: [],
      risks: [],
    };

    // Check for ACE inhibitor + NSAID combination (renal risk)
    const aceInhibitors = prescriptions.filter(p => 
      p.drug.toLowerCase().includes('lisinopril') ||
      p.drug.toLowerCase().includes('ace') ||
      p.drug.toLowerCase().includes('pril')
    );
    
    const nsaids = prescriptions.filter(p => 
      p.drug.toLowerCase().includes('naproxen') ||
      p.drug.toLowerCase().includes('ibuprofen') ||
      p.drug.toLowerCase().includes('nsaid')
    );

    if (aceInhibitors.length > 0 && nsaids.length > 0) {
      safetyCheck.risks.push({
        type: 'renal_risk',
        severity: 'moderate',
        description: 'ACE inhibitor + NSAID combination may increase renal risk',
        drugs: [aceInhibitors[0].drug, nsaids[0].drug],
      });
    }

    // Check for interactions with existing medications
    for (const prescription of prescriptions) {
      if (allPatientDrugs.length > 0) {
        try {
          const interactionResult = await checkInteractionsRxNav(
            prescription.drug,
            allPatientDrugs
          );
          if (interactionResult.hasConflict) {
            safetyCheck.interactions.push({
              drug: prescription.drug,
              interaction: interactionResult.details,
            });
          }
        } catch (e) {
          console.warn(`Interaction check failed for ${prescription.drug}:`, e);
        }
      }
    }

    // Generate messages
    const clinicianNote = generateClinicianNote(safetyCheck);
    const patientFollowUp = generatePatientFollowUp(safetyCheck);

    // Store visit session with safety check results
    const visitData = {
      sessionId,
      startTime: Date.now() - 3600000, // Approximate (would be from actual visit)
      endTime: Date.now(),
      prescriptions,
      patientHistory: allPatientDrugs,
      safetyCheck,
      clinicianNote,
      patientFollowUp,
      role: role || 'patient',
      createdAt: Date.now(),
    };

    visitSessions.set(sessionId, visitData);

    console.log(`[Post-Visit] Safety check complete for ${sessionId}`);
    console.log(`[Post-Visit] Clinician note: ${clinicianNote.substring(0, 100)}...`);
    console.log(`[Post-Visit] Patient follow-up: ${patientFollowUp.substring(0, 100)}...`);

    res.json({
      sessionId,
      safetyCheck,
      clinicianNote,
      patientFollowUp,
      success: true,
    });
  } catch (err) {
    console.error('[Post-Visit] Safety check error:', err);
    res.status(500).json({
      error: 'Post-visit safety check failed',
      details: err.message,
    });
  }
});

// Get visit summary by session ID
app.get('/visit-summary/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const visitData = visitSessions.get(sessionId);

    if (!visitData) {
      return res.status(404).json({ error: 'Visit session not found' });
    }

    res.json(visitData);
  } catch (err) {
    console.error('[Visit Summary] Error:', err);
    res.status(500).json({ error: 'Failed to retrieve visit summary' });
  }
});

// ============================================================================
// Visual Symptom Logger Endpoints
// ============================================================================

/**
 * Analyze a video frame for physical symptoms.
 * Placeholder endpoint - you can integrate with a vision AI later.
 * For now, returns random demo symptom detections.
 */
app.post('/api/analyze-frame', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Missing image data' });
    }
    
    // Validate it's a base64 image
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format' });
    }
    
    console.log('[VisualScribe] Received frame for analysis');
    
    // Placeholder: In production, send to a vision AI (GPT-4V, Gemini Vision, etc.)
    // For now, return demo detections with 20% probability
    const shouldDetect = Math.random() < 0.2;
    
    if (shouldDetect) {
      const actions = ['clutching', 'pointing', 'rubbing', 'holding'];
      const bodyParts = ['head', 'chest', 'stomach', 'knee', 'arm', 'back'];
      
      const action = actions[Math.floor(Math.random() * actions.length)];
      const bodyPart = bodyParts[Math.floor(Math.random() * bodyParts.length)];
      
      const descriptions = {
        clutching: `Patient is clutching their ${bodyPart}`,
        pointing: `Patient pointed to their ${bodyPart}`,
        rubbing: `Patient is rubbing their ${bodyPart}`,
        holding: `Patient is holding their ${bodyPart}`,
      };
      
      res.json({
        detected: true,
        action,
        bodyPart,
        description: descriptions[action],
      });
    } else {
      res.json({
        detected: false,
        action: 'other',
        bodyPart: 'other',
        description: 'No symptoms detected',
      });
    }
  } catch (err) {
    console.error('[VisualScribe] Analysis error:', err);
    res.status(500).json({ error: 'Frame analysis failed' });
  }
});

/**
 * Generate medical notes (SOAP format) using Google Gemini.
 * Combines audio transcript and visual symptom logs.
 */
app.post('/api/generate-notes', async (req, res) => {
  try {
    const { transcript, visualLogs } = req.body;
    
    if (!transcript && !visualLogs) {
      return res.status(400).json({ error: 'Missing transcript or visualLogs' });
    }
    
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('[GenerateNotes] No Gemini API key found, returning mock notes');
      // Return mock notes if no API key
      const mockNotes = `# Medical Visit Notes

## Subjective
${transcript?.length ? `Patient described: "${transcript.slice(0, 3).join('. ')}"` : 'No verbal complaints recorded.'}

## Objective
${visualLogs?.length ? visualLogs.map(log => `- ${log.description}`).join('\n') : 'No visual observations recorded.'}

## Assessment
Based on the available information, further evaluation may be needed.

## Plan
1. Follow up with patient regarding symptoms
2. Consider additional diagnostic tests if symptoms persist
3. Schedule follow-up appointment in 1-2 weeks

---
*Note: This is a demo note. Configure GOOGLE_GEMINI_API_KEY for AI-generated notes.*`;
      
      return res.json({ notes: mockNotes, source: 'mock' });
    }
    
    console.log('[GenerateNotes] Generating SOAP notes with Gemini');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Build the prompt
    const transcriptText = Array.isArray(transcript) 
      ? transcript.join('\n') 
      : (transcript || 'No transcript available.');
      
    const visualLogsText = Array.isArray(visualLogs) && visualLogs.length > 0
      ? visualLogs.map(log => {
          const time = new Date(log.timestamp).toLocaleTimeString();
          return `[${time}] ${log.description} (${log.action} ${log.bodyPart})`;
        }).join('\n')
      : 'No visual observations recorded.';
    
    const prompt = `You are a medical scribe. Based on the following telehealth visit data, generate professional medical notes in SOAP format.

## Audio Transcript:
${transcriptText}

## Visual Observations (patient body language):
${visualLogsText}

Generate a complete SOAP note with the following sections:

1. **Subjective**: Summarize what the patient said about their symptoms, concerns, and medical history based on the transcript.

2. **Objective**: Document the visual observations noted during the call (e.g., "Patient pointed to knee", "Patient appeared to be holding their chest").

3. **Assessment**: Provide a clinical assessment connecting the verbal complaints with the observed body language. Note any correlations (e.g., "Patient's verbal complaint of knee pain is consistent with observed pointing behavior to right knee").

4. **Plan**: Suggest appropriate next steps, follow-up recommendations, and any additional tests or referrals that may be needed.

Format the response in clean Markdown with proper headers. Be professional, concise, and clinically accurate.`;
    
    const result = await model.generateContent(prompt);
    const notes = result.response.text();
    
    console.log('[GenerateNotes] Notes generated successfully');
    
    res.json({ notes, source: 'gemini' });
  } catch (err) {
    console.error('[GenerateNotes] Error:', err);
    res.status(500).json({ 
      error: 'Failed to generate notes', 
      details: err.message 
    });
  }
});

// SPA and static files last
app.use(express.static('dist'));

app.listen(port, () => {
  console.log(`Server listening on port ${port} (backend for PDF/LiveKit/conflict-check)`);
});
