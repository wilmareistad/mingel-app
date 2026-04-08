# Firebase Request Analysis & Game Loop Evaluation

## 🚨 CRITICAL FINDINGS

### 1. **GAME LOOP IS BROKEN - Race Condition in Question Transition**

**Location:** `src/hooks/useGameControls.js` - `handleNextQuestion()` function

**The Problem:**
```javascript
// BROKEN FLOW:
const handleNextQuestion = useCallback(async () => {
  const eventSnap = await getDoc(eventRef);           // ✅ Gets currentQuestionIndex
  const currentEvent = eventSnap.data();
  
  // ... operations ...
  
  const nextIndex = (currentEvent.currentQuestionIndex || 0) + 1;  // ✅ Uses STALE data!
  await updateToQuestionPhase(eventId, nextIndex);     // ❌ May skip questions or repeat
}, [eventId, participants, showMessage]);
```

**Why It's Broken:**
1. You fetch the CURRENT `currentQuestionIndex` from Firestore
2. You perform 4 separate async operations (setShowingResultsOnly, deleteAnswersForEvent, resetParticipantsAnswered, updateToQuestionPhase)
3. **Between steps 1 and 2, a race condition exists**: If another admin or process modifies `currentQuestionIndex`, your incremented value becomes invalid
4. **Example scenario:**
   - Admin A reads: `currentQuestionIndex = 2`
   - Admin A increments: `nextIndex = 3`
   - **[RACE CONDITION WINDOW]** - Another source updates the question index
   - Admin A writes: `currentQuestionIndex = 3` (potentially wrong!)

**Impact on Game Loop:**
- ❌ Questions may be skipped
- ❌ Questions may repeat
- ❌ Game state becomes inconsistent
- ❌ Players see wrong questions

---

### 2. **Firebase Request Volume Analysis**

#### **Per Question Transition (handleNextQuestion):**
```
1. getDoc(eventRef)                    [1 read]
2. setShowingResultsOnly(eventId)      [1 write]
3. deleteAnswersForEvent(eventId)      [N reads + M writes] (N = num answers)
4. resetParticipantsAnswered(eventId) [1 read getEventParticipants + N writes] (N = num participants)
5. updateToQuestionPhase(eventId)      [1 write]
─────────────────────────────────────────────────────
TOTAL: 3+ reads + (4 + N + M) writes  ← 😱 EXPENSIVE!
```

#### **Per Game Start (handleStartGame):**
```
1. resetParticipantsAnswered(eventId) [1 read + N writes]
2. updateCurrentQuestionIndex(eventId) [1 write]
3. updateEventStatus(eventId)          [1 write]
─────────────────────────────────────────────────────
TOTAL: 1 read + (N + 2) writes
```

#### **Per Results Phase End (handleEndQuestion):**
```
1. setShowingResultsOnly(eventId)      [1 write]
2. updateEventStatus(eventId)          [1 write]
─────────────────────────────────────────────────────
TOTAL: 2 writes
```

#### **Real-Time Listeners (Always Active):**
```
1. useAdminEvent hook:
   - onAuthStateChanged() listener      [always on]
   - onSnapshot(event doc)              [always on]

2. AdminSettings component:
   - listenToParticipants()             [always on]

3. useQuestionTimer hook:
   - 100ms interval updates             [no DB reads, safe]
   - updateDoc on timer expire          [1 write per question]

4. useResultsTimer hook:
   - 100ms interval updates             [no DB reads, safe]
   - No DB writes (callback handles it)
─────────────────────────────────────────────────────
BASELINE: 3 active listeners + periodic writes
```

#### **Example: Full 5-Question Game with 10 Participants**

```
Lobby Phase:
  - 3 real-time listeners active (no cost)
  - Admin sets timer: 1 write per adjustment
  
Game Start:
  - 1 getParticipants() read
  - 10 updateParticipantAnswered() writes
  - 2 status update writes
  ≈ 13 operations
  
Per Question (× 5 questions):
  - 1 getDoc() read
  - deleteAnswersForEvent(): 0-10 reads, 0-10 writes (depends on answers)
  - resetParticipantsAnswered(): 1 read, 10 writes
  - setShowingResultsOnly(): 1 write
  - updateToQuestionPhase(): 1 write
  - Timer expires: 1 write (auto-transition to results)
  ≈ 3-4 reads + 15-25 writes per question
  
Results Phase (× 5 times):
  - Timer expires: callback calls handleNextQuestion()
  - (same as above)
  
─────────────────────────────────────────────────────
TOTAL FOR 5-QUESTION GAME: ~40-50 reads + ~150-200 writes ⚠️
```

---

### 3. **Inefficiencies Identified**

#### **A. Double Read in resetParticipantsAnswered()**
```javascript
// ❌ BAD: Always reading even when you have participants array
await resetParticipantsAnswered(eventId, participants);
// But inside the function:
let participantsList = participants;
if (!participants) {
  participantsList = await getEventParticipants(eventId);  // ← Extra read if empty array!
}
```

**Issue:** If `participants` is an empty array `[]`, the condition `if (!participants)` is FALSE (empty array is truthy), but the function only works with non-empty arrays. Logic is backwards.

#### **B. useCurrentQuestion Dependency Array**
```javascript
useEffect(() => {
  // ...
  fetchCurrentQuestion();
}, [event?.status, event?.currentQuestionIndex, event?.questions, event?.customQuestions]);
```

**Issue:** Depends on `event?.questions` and `event?.customQuestions` arrays, which trigger re-fetches even when only other event fields change (status changes, timer updates, etc.)

#### **C. AdminSettings Participant Listener**
```javascript
useEffect(() => {
  const unsubscribeParticipants = listenToParticipants(eventId, (updatedParticipants) => {
    setParticipants(updatedParticipants);
    if (event?.status === "question" && currentQuestion) {
      const answeredCount = updatedParticipants.filter(p => p.hasAnswered).length;
      setVoteCount(answeredCount);
    }
  });
  return () => unsubscribeParticipants();
}, [eventId, event?.status, currentQuestion?.id, setVoteCount]);
```

**Issue:** Listener is recreated every time `currentQuestion?.id` changes, causing unsubscribe/resubscribe cycle. Should use a separate effect.

---

### 4. **Requests Breakdown by Hook**

| Hook | Reads | Writes | Real-Time | Frequency |
|------|-------|--------|-----------|-----------|
| useAdminEvent | 0 | 0 | 2 listeners | Continuous |
| useCurrentQuestion | 1 per index change | 0 | None | Per question change |
| useQuestionTimer | 0 | 1 on expire | None | Per question |
| useResultsTimer | 0 | 0 | None | Per results phase |
| useGameControls | 3-4 | 15-25 | None | Per transition |
| listenToParticipants | 0 | 0 | 1 listener | Continuous |

---

## 🔧 Solutions Required

### **PRIORITY 1: Fix Race Condition in Game Loop**

**Current Broken Code:**
```javascript
const handleNextQuestion = useCallback(async () => {
  const eventSnap = await getDoc(eventRef);
  const currentEvent = eventSnap.data();
  
  // ... cleanup operations ...
  
  const nextIndex = (currentEvent.currentQuestionIndex || 0) + 1;
  await updateToQuestionPhase(eventId, nextIndex);
}, [eventId, participants, showMessage]);
```

**Recommended Fix - Use Server-Side Transaction:**
```javascript
const handleNextQuestion = useCallback(async () => {
  try {
    const eventSnap = await getDoc(eventRef);
    const currentEvent = eventSnap.data();
    
    // Cleanup operations (safe to do separately)
    await Promise.all([
      setShowingResultsOnly(eventId, false),
      deleteAnswersForEvent(eventId),
      resetParticipantsAnswered(eventId, participants)
    ]);
    
    // ✅ NEW: Re-fetch to ensure fresh data before transition
    const freshSnap = await getDoc(eventRef);
    const freshEvent = freshSnap.data();
    
    const nextIndex = (freshEvent.currentQuestionIndex || 0) + 1;
    const totalQuestions = (freshEvent.questions?.length || 0) + (freshEvent.customQuestions?.length || 0);
    
    if (nextIndex >= totalQuestions) {
      showMessage("All questions completed!");
    } else {
      await updateToQuestionPhase(eventId, nextIndex);
      showMessage("Next question displayed.");
    }
  } catch (error) {
    console.error("Error moving to next question:", error);
    showMessage("Error moving to next question");
  }
}, [eventId, participants, showMessage]);
```

**Even Better - Use Firestore Transactions (if available):**
```javascript
// This requires firestore.runTransaction() which offers atomic writes
import { runTransaction } from "firebase/firestore";

const handleNextQuestion = useCallback(async () => {
  try {
    await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await transaction.get(eventRef);
      const currentEvent = eventSnap.data();
      
      const nextIndex = (currentEvent.currentQuestionIndex || 0) + 1;
      const totalQuestions = (currentEvent.questions?.length || 0) + (currentEvent.customQuestions?.length || 0);
      
      if (nextIndex < totalQuestions) {
        transaction.update(eventRef, {
          currentQuestionIndex: nextIndex,
          status: "question",
          phaseStartedAt: serverTimestamp(),
          showingResultsOnly: false
        });
      }
    });
    
    // Then do cleanup operations after transaction completes
    await Promise.all([...]);
  } catch (error) {
    console.error("Error:", error);
  }
}, [eventId, participants, showMessage]);
```

---

### **PRIORITY 2: Reduce Request Volume**

#### **A. Fix resetParticipantsAnswered Logic**
```javascript
// ❌ Current
if (!participants) {
  participantsList = await getEventParticipants(eventId);
}

// ✅ Fixed
if (!participants || participants.length === 0) {
  participantsList = await getEventParticipants(eventId);
}
```

#### **B. Consolidate Cleanup Operations**
Current flow does 4 separate operations. Could batch them:
```javascript
// Instead of:
await setShowingResultsOnly(eventId, false);
await deleteAnswersForEvent(eventId);
await resetParticipantsAnswered(eventId, participants);

// Do in parallel:
await Promise.all([
  setShowingResultsOnly(eventId, false),
  deleteAnswersForEvent(eventId),
  resetParticipantsAnswered(eventId, participants)
]);
```

#### **C. Fix useCurrentQuestion Dependency**
```javascript
// ❌ Current - fetches when questions array changes
useEffect(() => {
  // ...
}, [event?.status, event?.currentQuestionIndex, event?.questions, event?.customQuestions]);

// ✅ Fixed - only fetch when index changes
useEffect(() => {
  // ...
}, [event?.status, event?.currentQuestionIndex]);
```

---

### **PRIORITY 3: Prevent Listener Recreation**

```javascript
// ❌ Current - recreates listener on every currentQuestion change
useEffect(() => {
  const unsubscribeParticipants = listenToParticipants(eventId, (updatedParticipants) => {
    setParticipants(updatedParticipants);
    if (event?.status === "question" && currentQuestion) {
      const answeredCount = updatedParticipants.filter(p => p.hasAnswered).length;
      setVoteCount(answeredCount);
    }
  });
  return () => unsubscribeParticipants();
}, [eventId, event?.status, currentQuestion?.id, setVoteCount]);

// ✅ Better approach - split into two effects
useEffect(() => {
  if (!eventId) return;
  const unsubscribeParticipants = listenToParticipants(eventId, setParticipants);
  return () => unsubscribeParticipants();
}, [eventId]);

// Separate effect for vote counting
useEffect(() => {
  if (event?.status === "question") {
    const answeredCount = participants.filter(p => p.hasAnswered).length;
    setVoteCount(answeredCount);
  } else {
    setVoteCount(0);
  }
}, [participants, event?.status]);
```

---

## 📊 Summary Table

| Issue | Severity | Reads | Writes | Type | Fix Effort |
|-------|----------|-------|--------|------|-----------|
| Race condition in game loop | 🔴 CRITICAL | N/A | N/A | Logic | Medium |
| Extra read in resetParticipantsAnswered | 🟠 High | 1 extra per game | 0 | Logic | Low |
| useCurrentQuestion bad deps | 🟠 High | 1 extra per update | 0 | Logic | Low |
| Listener recreation | 🟡 Medium | 0 | 0 | Performance | Low |
| Sequential write operations | 🟡 Medium | 0 | Same | Performance | Low |

---

## ✅ Verification Checklist

After fixing, verify:
- [ ] Single question game completes without race conditions
- [ ] Multi-question game cycles through all questions in order
- [ ] No questions are skipped or repeated
- [ ] Firebase console shows expected operation count (no spikes)
- [ ] Participants see correct question on their screens
- [ ] Timer auto-transitions work smoothly
- [ ] No console errors or warnings

