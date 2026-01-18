# Implementation Gap Analysis: Passive Confusion Detection & Post-Visit Safety

## Current Implementation Status

### ✅ What's Already Built

1. **Overshoot AI Integration** (`OvershootDemo.tsx`)
   - Real-time vision analysis running
   - Detects CONFUSION vs UNDERSTANDING states
   - **Gap**: Results are only displayed in a debug widget, not used for decision-making

2. **Drug Detection** (`PrescriptionSTT.tsx`)
   - Web Speech API listening for drug names
   - Extracts medications from doctor's speech
   - Debouncing to avoid duplicate triggers

3. **Real-Time Conflict Checking** (`CallWithSTT.tsx`, `server.js`)
   - Checks drug interactions during call
   - Uses Browserbase (drugs.com) or RxNav fallback
   - Shows conflict indicators **to everyone** (not role-based)

4. **Drug Information Display** (`DrugInfoModal.tsx`, `openFDA.ts`)
   - Fetches FDA data via openFDA API
   - Summarizes drug info using HuggingFace
   - **Gap**: Shows to all participants, not patient-only

5. **Arize Setup** (`arize.ts`)
   - OpenTelemetry configured
   - OpenAI instrumentation ready
   - **Gap**: No actual event tracking implemented

6. **PDF Upload & Parsing** (`PdfUpload.tsx`, `server.js`)
   - Extracts medications from patient history
   - Stores in-memory for conflict checking

---

## ❌ What's Missing for Your Scenario

### 1. **Passive Confusion Detection (Overshoot AI Integration)**
**Status**: Partially implemented, not integrated

**Current State**:
- Overshoot AI runs and detects confusion
- Results displayed in debug widget only
- No confidence scoring or LOW/HIGH classification

**What's Needed**:
- [ ] Parse Overshoot JSON response to extract `current_state` and confidence
- [ ] Track "comprehension confidence" score (LOW/MEDIUM/HIGH)
- [ ] Store confusion events in session state (no doctor alerts)
- [ ] Link confusion events to specific drug mentions (e.g., "confusion after NSAIDs mentioned")
- [ ] Integrate with Arize to track confusion detection accuracy

**Files to Modify**:
- `src/components/OvershootDemo.tsx` - Parse and store results
- `src/components/CallWithSTT.tsx` - Connect confusion to drug context
- `server.js` - Add session state management endpoint

---

### 2. **Patient-Side Silent Clarification Panel**
**Status**: Not implemented

**What's Needed**:
- [ ] Role-based UI system (doctor vs patient views)
- [ ] Patient-only side panel component
- [ ] Context-aware drug explanations (e.g., "NSAIDs" → patient-friendly definition)
- [ ] Trigger panel when:
  - Confusion detected + drug mentioned
  - Drug detected via STT
- [ ] Panel content: drug name, simple explanation, warnings, alternatives mention
- [ ] Panel should NOT be visible to doctor

**New Files Needed**:
- `src/components/PatientClarificationPanel.tsx` - Main panel component
- `src/hooks/useRole.ts` - Role detection hook (from LiveKit identity or query param)
- `src/utils/drugExplanations.ts` - Patient-friendly drug explanations

**Files to Modify**:
- `src/App.tsx` - Add role-based rendering
- `src/components/CallWithSTT.tsx` - Conditionally show patient panel
- `server.js` - Add role to token generation

---

### 3. **Prescription Issued (No Interference)**
**Status**: Partially implemented

**Current State**:
- STT detects prescriptions
- Conflict checks run but show alerts to everyone

**What's Needed**:
- [ ] Suppress doctor-side alerts during active prescription
- [ ] Track prescription events silently
- [ ] Store prescription data: drug, dosage, duration, timestamp
- [ ] No popups or interruptions during prescription flow

**Files to Modify**:
- `src/components/ConflictCheckIndicator.tsx` - Make conditional (doctor-only, or suppress during prescription)
- `src/components/CallWithSTT.tsx` - Add prescription state tracking

---

### 4. **Post-Decision Safety Review (After Visit Ends)**
**Status**: Not implemented

**What's Needed**:
- [ ] Visit session tracking (start/end timestamps, participants, prescriptions)
- [ ] Post-visit trigger when call disconnects
- [ ] Safety check endpoint that runs after visit:
  - Check all prescribed drugs against patient history
  - Check for ACE inhibitors + NSAIDs (renal risk)
  - Check patient age and risk factors
  - Use Browserbase for comprehensive checks
- [ ] Generate safety assessment (not alerts)

**New Files Needed**:
- `src/hooks/useVisitSession.ts` - Session state management
- `server.js` - Add `/post-visit-safety-check` endpoint
- `server/utils/safetyChecker.js` - Safety analysis logic

**Files to Modify**:
- `src/App.tsx` - Hook into `onDisconnected` event
- `server.js` - Add session storage (in-memory or DB)

---

### 5. **Follow-Up Framing (Not Override)**
**Status**: Not implemented

**What's Needed**:
- [ ] Generate clinician note (not alert):
  - Format: "For patients on ACE inhibitors, consider renal monitoring or follow-up if NSAID use extends beyond 7 days."
  - Store in session record
  - Available in doctor's dashboard (future)
- [ ] Generate patient follow-up message:
  - Format: "If pain lasts beyond a week or you notice swelling or reduced urination, contact your provider."
  - Store for patient notification
- [ ] No prescription changes or alerts
- [ ] Both messages generated from same safety assessment

**New Files Needed**:
- `server/utils/messageGenerator.js` - LLM or template-based message generation
- `src/components/PostVisitSummary.tsx` - Display summary after call (optional)

**Files to Modify**:
- `server.js` - Add message generation to post-visit flow

---

### 6. **Memory + Safety Anchor (Patient Value)**
**Status**: Not implemented

**What's Needed**:
- [ ] Patient-facing post-visit page/summary
- [ ] Display:
  - Prescribed medications with clear explanations
  - Why each medication was chosen (context from visit)
  - Follow-up triggers ("contact provider if X happens")
  - One-click "I had side effects" reporting button
- [ ] Side effects reporting:
  - Form: drug, symptoms, severity
  - Submit to backend (store in session or send notification)
- [ ] Session persistence (store visit data for patient access)

**New Files Needed**:
- `src/pages/PostVisitSummary.tsx` - Patient summary page
- `src/components/SideEffectReport.tsx` - Reporting form
- `server.js` - Add `/report-side-effects` endpoint
- `server.js` - Add `/get-visit-summary/:sessionId` endpoint

**Files to Modify**:
- `src/App.tsx` - Add routing or state for post-visit view
- `server.js` - Add session storage with visit data

---

### 7. **Evaluation (Arize Integration)**
**Status**: Setup exists, no tracking implemented

**What's Needed**:
- [ ] Track confusion detection events:
  - Timestamp, drug mentioned, confidence level, actual state (if known)
- [ ] Track post-visit follow-up triggers:
  - Safety check results, messages generated
- [ ] Track patient clarification engagement:
  - Panel views, time spent, interactions
- [ ] Track doctor dismissal rates:
  - How often doctors ignore/acknowledge safety notes (future)
- [ ] Track hallucination prevention:
  - Zero medical advice generation (only FDA data + safety notes)
- [ ] Custom spans for each event type

**Files to Modify**:
- `arize.ts` - Add custom span creation functions
- `src/components/OvershootDemo.tsx` - Track confusion events
- `src/components/PatientClarificationPanel.tsx` - Track engagement
- `server.js` - Track safety checks and message generation

---

## Implementation Priority

### Phase 1: Core Passive Detection (Week 1)
1. Integrate Overshoot results into session state
2. Link confusion to drug context
3. Role-based UI system (doctor/patient)
4. Patient-only clarification panel

### Phase 2: Post-Visit Safety (Week 2)
1. Visit session tracking
2. Post-visit safety check endpoint
3. Message generation (clinician note + patient follow-up)
4. Basic post-visit summary page

### Phase 3: Patient Value & Evaluation (Week 3)
1. Side effects reporting
2. Patient memory/safety anchor page
3. Arize event tracking
4. Evaluation metrics dashboard (optional)

---

## Technical Architecture Notes

### Role Detection
**Option 1**: Query parameter (`?role=patient` or `?role=doctor`)
**Option 2**: LiveKit identity prefix (`doctor-xxx`, `patient-xxx`)
**Option 3**: Separate token generation endpoints (`/getToken/doctor`, `/getToken/patient`)

**Recommendation**: Option 3 (separate endpoints) for security and clarity.

### Session Storage
**Current**: In-memory only (`storedPdf` in `server.js`)
**Needed**: Session storage for:
- Visit metadata (start/end, participants, role)
- Prescriptions issued
- Confusion events
- Safety check results
- Generated messages

**Options**:
- In-memory Map (simple, lost on restart)
- SQLite (persistent, local)
- PostgreSQL/MongoDB (production-ready)

**Recommendation**: Start with in-memory Map, add SQLite for persistence later.

### Drug Explanation Generation
**Options**:
1. Static mapping (drug name → explanation)
2. LLM generation (OpenAI/HuggingFace)
3. Hybrid (static for common drugs, LLM for others)

**Recommendation**: Start with static mapping for common drugs (NSAIDs, ACE inhibitors, etc.), add LLM fallback.

---

## Estimated Effort

- **Phase 1**: ~20-30 hours
- **Phase 2**: ~15-20 hours
- **Phase 3**: ~10-15 hours
- **Total**: ~45-65 hours of development

---

## Key Decisions Needed

1. **Session Persistence**: In-memory vs database?
2. **Role Detection**: Query param vs token-based?
3. **Patient Access**: How do patients access post-visit summary? (URL with session ID? Email link?)
4. **Message Delivery**: How are clinician notes and patient follow-ups delivered? (In-app? Email? SMS?)
5. **Arize Metrics**: Real-time dashboard or just data collection for later analysis?
