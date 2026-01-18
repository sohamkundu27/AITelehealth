# Phase 2 Testing Guide

## ✅ What's Been Implemented

1. **Visit session tracking** - Complete visit lifecycle
2. **Post-visit safety check** - Runs after call ends
3. **Message generation** - Clinician notes + patient follow-ups
4. **Post-visit summary page** - Patient-friendly summary
5. **Session storage** - In-memory storage with session IDs

---

## 🧪 How to Test

### Test 1: Complete Visit Flow

**Steps:**
1. Start server: `node server.js`
2. Start frontend: `npm run dev`
3. Open patient view: `http://localhost:5173?role=patient`
4. Upload a PDF (any medical PDF)
5. Start the call
6. **Check console**: Should see `[VisitManager] Visit started: visit-...`
7. Doctor (in separate browser): Say "I'm prescribing naproxen"
8. End the call (disconnect)
9. **Check console**: Should see:
   - `[VisitManager] Visit ended: visit-...`
   - `[VisitManager] Triggering post-visit safety check...`
   - `[Post-Visit] Safety check complete...`
10. **Expected**: Patient automatically redirected to summary page

**Verification:**
- ✅ Visit starts when call connects
- ✅ Prescriptions tracked during call
- ✅ Visit ends when disconnected
- ✅ Safety check runs automatically
- ✅ Patient redirected to summary page

---

### Test 2: Post-Visit Safety Check

**Scenario: ACE Inhibitor + NSAID (Renal Risk)**

**Steps:**
1. Upload a PDF that contains "Lisinopril" (or manually add to patient history)
2. Start call as patient
3. Doctor prescribes: "I'm prescribing naproxen twice daily for 7 days"
4. End call
5. Check summary page

**Expected Results:**
- ✅ Safety check detects ACE inhibitor + NSAID combination
- ✅ Clinician note mentions: "consider renal monitoring"
- ✅ Patient follow-up mentions: "watch for kidney issues"
- ✅ Summary page shows risk information

**Check Server Logs:**
```
[Post-Visit] Safety check for session visit-...
[Post-Visit] Prescriptions: 1
[Post-Visit] Clinician note: For patients on lisinopril, consider renal monitoring...
[Post-Visit] Patient follow-up: If pain lasts beyond... watch for kidney issues...
```

---

### Test 3: Summary Page Content

**Steps:**
1. Complete a visit (as in Test 1)
2. Check summary page shows:
   - ✅ Prescribed medications list
   - ✅ Important information (if risks detected)
   - ✅ Follow-up instructions
   - ✅ "Report Side Effects" button (placeholder)
   - ✅ "Start New Visit" button

**Verification:**
- All prescriptions displayed correctly
- Follow-up instructions are clear and actionable
- Page is visually appealing and readable

---

### Test 4: Direct Summary Access

**Steps:**
1. Complete a visit and note the session ID from console
2. Directly visit: `http://localhost:5173/visit-summary/[sessionId]`
3. **Expected**: Summary page loads with visit data

**If Session Not Found:**
- Visit: `http://localhost:5173/visit-summary/invalid-id`
- **Expected**: Error message shown

---

### Test 5: Multiple Prescriptions

**Steps:**
1. Start visit
2. Doctor prescribes multiple drugs:
   - "I'm prescribing naproxen"
   - "I'm prescribing metformin"
3. End visit
4. **Expected**: Summary shows all prescriptions

---

### Test 6: No Prescriptions

**Steps:**
1. Start visit
2. Don't mention any drugs
3. End visit
4. **Expected**: Summary shows "No medications were prescribed"

---

## 🔍 Debugging Tips

### Check Console Logs

**Visit Lifecycle:**
```
[VisitManager] Visit started: visit-1234567890-abc123 (patient)
[VisitManager] Visit ended: visit-1234567890-abc123
[VisitManager] Prescriptions: 1
[VisitManager] Confusion events: 5
```

**Post-Visit Safety Check:**
```
[Post-Visit] Safety check for session visit-...
[Post-Visit] Prescriptions: 1
[Post-Visit] Patient history: 2 drugs
[Post-Visit] Safety check complete for visit-...
[Post-Visit] Clinician note: For patients on...
[Post-Visit] Patient follow-up: If pain lasts...
```

### Check Server Storage

Add this to `server.js` temporarily to see stored sessions:
```javascript
console.log('Stored sessions:', Array.from(visitSessions.keys()));
```

### Common Issues

**Summary page not loading?**
- Check session ID is correct
- Check server logs for safety check completion
- Verify visit data was stored

**Safety check not running?**
- Check VisitManager is in component tree
- Check `onDisconnected` event fires
- Check network tab for POST to `/post-visit-safety-check`

**No redirect after visit?**
- Check patient role is set correctly
- Check session ID is returned from safety check
- Check browser console for errors

---

## 📊 Expected Behavior Summary

| Action | What Happens |
|--------|-------------|
| Call connects | Visit session starts |
| Drug mentioned | Prescription tracked |
| Call disconnects | Visit ends, safety check triggered |
| Safety check | Analyzes prescriptions, generates messages |
| Patient role | Auto-redirected to summary page |
| Summary page | Shows prescriptions, risks, follow-ups |

---

## ✅ Success Criteria

Phase 2 is working correctly if:

1. ✅ Visit starts when call connects
2. ✅ Prescriptions tracked during visit
3. ✅ Visit ends when disconnected
4. ✅ Post-visit safety check runs automatically
5. ✅ Safety check detects risks (ACE + NSAID)
6. ✅ Clinician notes generated (non-alert format)
7. ✅ Patient follow-ups generated (clear instructions)
8. ✅ Visit data stored with session ID
9. ✅ Patient redirected to summary page
10. ✅ Summary page shows all visit information

---

## 🎯 Key Test Scenarios

### Scenario 1: Standard Visit
- Prescription: Naproxen
- Patient history: None
- **Expected**: Basic summary, standard follow-up

### Scenario 2: Risk Detection
- Prescription: Naproxen
- Patient history: Lisinopril
- **Expected**: Renal risk detected, specific warnings

### Scenario 3: Multiple Drugs
- Prescriptions: Naproxen, Metformin
- **Expected**: All drugs shown, combined follow-up

### Scenario 4: No Prescriptions
- No drugs mentioned
- **Expected**: "No medications" message

---

## 🚀 Next Steps

Once Phase 2 is tested:
- Phase 3: Side effects reporting
- Phase 3: Patient memory enhancements
- Phase 3: Arize tracking integration
