# Phase 1 Testing Guide

## ✅ What's Been Implemented

1. **Role-based system** - Doctor vs Patient views
2. **Overshoot integration** - Confusion detection tracked in session
3. **Drug mention tracking** - All drug detections stored
4. **Auto-linking** - Confusion events automatically linked to recent drug mentions
5. **Patient-only clarification panel** - Shows when confusion + drug detected
6. **Patient-friendly explanations** - Simple drug explanations for common medications

---

## 🧪 How to Test

### Step 1: Start the Application

```bash
# Terminal 1: Start backend
node server.js

# Terminal 2: Start frontend
npm run dev
```

### Step 2: Test Role Detection

**Doctor View:**
- Open: `http://localhost:5173` (defaults to doctor)
- Or explicitly: `http://localhost:5173?role=doctor`
- Should see: Normal conflict check indicators, no patient panel

**Patient View:**
- Open: `http://localhost:5173?role=patient`
- Should see: Patient-only clarification panel when triggered

### Step 3: Test Confusion Detection

**With Real Overshoot AI:**
1. Upload a PDF (any medical PDF)
2. Start the call
3. Overshoot AI will start automatically
4. Make facial expressions that indicate confusion:
   - Knit your eyebrows
   - Tilt your head
   - Purse your lips
   - Stop blinking
5. Check the debug panel (bottom left) - should see confusion events

**With Demo Mode (if camera doesn't work):**
1. In the Overshoot widget (top right), click "Demo" button
2. Demo mode simulates confusion events every 4 seconds
3. Check debug panel to see events

### Step 4: Test Drug Detection + Confusion Linking

**Scenario: Doctor mentions a drug while patient shows confusion**

1. **As Doctor:**
   - Say: "I'm prescribing naproxen twice daily"
   - Or: "We'll start with ibuprofen"
   - The STT should detect the drug

2. **As Patient (in separate browser/tab):**
   - Make sure you're on `?role=patient`
   - Show confusion (or use demo mode)
   - Within 10 seconds of drug mention, the clarification panel should appear
   - Panel shows patient-friendly explanation of the drug

### Step 5: Test Debug Panel

**Enable Debug View:**
- Add `?debug=true` to URL: `http://localhost:5173?role=patient&debug=true`
- Debug panel appears in bottom left
- Shows:
  - Current role
  - Recent confusion events (last 60 seconds)
  - Recent drug mentions (last 60 seconds)
  - Whether panel should be triggered

---

## 🎯 Test Scenarios

### Scenario 1: Basic Confusion Detection
1. Open patient view: `?role=patient&debug=true`
2. Start call, enable Overshoot (or use demo mode)
3. **Expected:** Debug panel shows confusion events appearing
4. **Expected:** Events have confidence levels (LOW/MEDIUM/HIGH)

### Scenario 2: Drug Mention Tracking
1. Open doctor view
2. Say: "I'm prescribing metformin"
3. **Expected:** Drug appears in debug panel (if debug enabled)
4. **Expected:** Drug mention timestamp recorded

### Scenario 3: Confusion + Drug = Panel Trigger
1. Open patient view: `?role=patient`
2. Enable Overshoot demo mode (or show confusion)
3. In doctor view, say: "We'll use naproxen for the pain"
4. **Expected:** Within 10 seconds, patient panel appears
5. **Expected:** Panel shows explanation of naproxen
6. **Expected:** Panel is NOT visible to doctor

### Scenario 4: Panel Auto-Dismiss
1. Trigger panel (confusion + drug)
2. **Expected:** Panel auto-dismisses after 30 seconds
3. **Expected:** Can manually dismiss with × button

### Scenario 5: Multiple Drugs
1. Doctor mentions: "ibuprofen" then "naproxen"
2. Patient shows confusion
3. **Expected:** Panel shows most recent drug (naproxen)

---

## 🔍 Debugging Tips

### Check Console Logs
Open browser DevTools (F12) and check console:
- `[Overshoot] CONFUSION detected` - Confusion events
- `💊 Checking interactions for: [drug]` - Drug detections
- `📡 Broadcasted drug detection` - Drug shared across participants

### Debug Panel Shows:
- **Role:** Should be "patient" or "doctor"
- **Confusion Events:** List with state, confidence, drug context
- **Drug Mentions:** List with timestamps
- **Panel Trigger:** ✅ or ❌ based on conditions

### Common Issues:

**Panel not showing?**
- Check role is "patient" (not "doctor")
- Check debug panel shows confusion events
- Check drug mentions are recent (within 15 seconds)
- Check confusion confidence is not "LOW"

**Overshoot not working?**
- Check `VITE_OVERSHOOT_API_KEY` in `.env.local`
- Try demo mode as fallback
- Check browser console for errors

**Drug not detected?**
- Speak clearly: "I'm prescribing [drug name]"
- Check PrescriptionSTT widget (bottom left) shows "listening"
- Check console for drug detection logs

---

## 📊 Expected Behavior Summary

| Action | Doctor Sees | Patient Sees |
|--------|------------|--------------|
| Drug mentioned | Conflict check indicator | Drug tracked (silent) |
| Confusion detected | Nothing (silent) | Confusion tracked (silent) |
| Confusion + Drug | Nothing | **Clarification panel appears** |
| Panel content | N/A | Patient-friendly drug explanation |

---

## 🎨 Visual Indicators

- **Overshoot Widget** (top right): Shows AI status, confusion detection
- **PrescriptionSTT Widget** (bottom left): Shows listening status, transcripts
- **Conflict Check Indicator** (top center): Shows drug interaction checks (doctor)
- **Patient Clarification Panel** (right side): Shows drug explanations (patient only)
- **Debug Panel** (bottom left): Shows session state (when `?debug=true`)

---

## ✅ Success Criteria

Phase 1 is working correctly if:

1. ✅ Role detection works (doctor vs patient)
2. ✅ Overshoot tracks confusion events with confidence
3. ✅ Drug mentions are tracked with timestamps
4. ✅ Confusion events auto-link to recent drug mentions
5. ✅ Patient panel appears when confusion + drug detected
6. ✅ Panel only shows for patients (not doctors)
7. ✅ Panel shows patient-friendly explanations
8. ✅ Panel can be dismissed manually or auto-dismisses

---

## 🚀 Next Steps (Phase 2)

Once Phase 1 is tested and working:
- Post-visit safety review
- Follow-up message generation
- Patient summary page
