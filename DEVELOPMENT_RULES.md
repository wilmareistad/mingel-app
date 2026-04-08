# Mingel App - Development Rules & Standards

**Last Updated:** April 8, 2026  
**Version:** 1.4

This document defines the rules and standards for developing Mingel. All developers must follow these rules to maintain code quality, prevent quota exhaustion, and avoid infinite loops.

---

## Table of Contents

1. [Documentation Rules](#documentation-rules)
   - [Markdown Documentation Standard](#-markdown-documentation-standard)
   - [AI Agent File Creation Rule](#-ai-agent-file-creation-rule)
   - [Git Commit/Push Permission Rule](#-git-commitpush-permission-rule)
2. [Anti-Pattern Rules](#anti-pattern-rules)
3. [Database Rules](#database-rules)
4. [React/Effect Rules](#reacteffect-rules)
5. [Firestore Rules](#firestore-rules)
   - [Query Standards](#-query-standards)
   - [Real-time Listener Standards](#-real-time-listener-standards)
   - [Write Standards](#-write-standards)
   - [Cleanup Standards](#-cleanup-standards)
   - [Answer Tracking Pattern](#-answer-tracking-pattern-answer-count--answered-users)
   - [Question Timer Pattern](#-question-timer-pattern-auto-transition-to-results)
   - [Auto-Advance Pattern](#-auto-advance-pattern-results-timer)
6. [Code Quality Rules](#code-quality-rules)

---

## Documentation Rules

### 📄 Markdown Documentation Standard

**RULE:** Only two markdown documents are allowed in the project root:
1. `DEVELOPMENT_RULES.md` - This file (all development standards)
2. `Project Plan.md` - Game loop architecture and flow diagrams

**All other documentation** must be embedded in code comments or this document.

**Violation Examples:**
- ❌ Creating `SETUP.md`, `API.md`, `COMPONENTS.md` as separate files
- ❌ Adding `BUGFIXES.md`, `CHANGELOG.md`, `QUOTA_FIXES.md`
- ❌ Creating `ARCHITECTURE.md`, `TESTING.md` as standalone files

**Solution:**
- ✅ Update relevant sections in `DEVELOPMENT_RULES.md`
- ✅ Add code comments explaining logic
- ✅ Use JSDoc comments for functions
- ✅ Commit messages explain what changed and why

**Why:** Multiple markdown files create confusion about which is current, waste time switching between docs, and are harder to maintain.

---

### 🤖 AI Agent File Creation Rule

**RULE:** AI agents MUST NOT create documentation files (.md), configuration files, or any other files unless explicitly requested by the developer.

**Violation Examples:**
- ❌ Creating `FIREBASE_REQUEST_ANALYSIS.md` to document findings
- ❌ Creating `RATE_LIMITING_OPTIMIZATION.md` to explain solutions
- ❌ Creating `IMPLEMENTATION_COMPLETE.md` as a summary
- ❌ Creating any `.md`, `.txt`, `.json`, or other file types as "documentation"

**What AI agents SHOULD do instead:**
- ✅ Implement the actual code fixes directly
- ✅ Add detailed comments in the code explaining patterns
- ✅ Use meaningful commit messages that document what changed and why
- ✅ If important insights exist, request permission to update `DEVELOPMENT_RULES.md`
- ✅ Include technical details in code comments, not separate files

**Example - WRONG:**
```
Agent creates FIREBASE_ANALYSIS.md explaining rate limiting issues
→ Then creates RATE_LIMITING_OPTIMIZATION.md with solution guide
→ Then creates IMPLEMENTATION_COMPLETE.md with testing checklist
Result: 3 new files cluttering the project root ❌
```

**Example - RIGHT:**
```
Agent adds detailed comment blocks in useGameControls.js explaining batch operations
Agent implements batchService.js with full JSDoc comments
Agent writes commit message: "feat: Implement batch operations for high-volume events

- Add batchService.js with batched writes for 100+ participants
- Parallelize cleanup operations in game loop
- Fix race condition in handleNextQuestion
- Support multiple concurrent events without rate limiting"
Result: Clean code, clear history, no extra files ✅
```

**Why:** 
- Project root stays clean and maintainable
- Documentation is co-located with code (easier to update)
- Commit messages provide full history of changes
- Developers can find answers by reading code, not searching files
- Reduces git clutter and improves repository signal-to-noise ratio

---

### 🔐 Git Commit/Push Permission Rule

**RULE:** AI agents MUST ask explicit permission from the developer before executing any git commit or git push commands.

**What Requires Permission:**
- ✋ `git commit` - Any commit operation
- ✋ `git push` - Any push to remote
- ✋ `git rebase` - Rebasing commits
- ✋ `git reset` - Resetting to previous state
- ✋ `git merge` - Merging branches

**What Does NOT Require Permission:**
- ✅ `git status` - Checking status
- ✅ `git log` - Viewing history
- ✅ `git diff` - Viewing changes
- ✅ `git add` - Staging files (if permission given for commit)

**Correct Pattern:**
```
Agent: "I've made the following changes:
- Modified src/hooks/useGameControls.js to add batch operations
- Updated src/features/event/batchService.js with new functions

Would you like me to commit and push these changes? Here's the proposed commit message:
'feat: Implement batch operations for high-volume events'"

Developer: "Yes, go ahead" OR "No, let me review first"
```

**Why:**
- Prevents accidental commits of incomplete work
- Gives developer time to review changes before they're pushed
- Protects against unwanted commits on wrong branch
- Maintains developer control over git history
- Prevents intermediate/experimental commits from polluting history

---

## Anti-Pattern Rules

### 🚨 CRITICAL: Prevent Infinite Loops

These patterns have caused quota exhaustion and must NEVER be used:

#### ❌ Rule 1: Listener that Updates Itself

**VIOLATION:**
```javascript
useEffect(() => {
  onSnapshot(eventRef, (docSnap) => {
    const data = docSnap.data();
    // ❌ VIOLATION: This triggers the listener again!
    updateDoc(eventRef, { lastSeen: Date.now() });
  });
}, []);
```

**Why it's bad:**
- Event updates → Listener fires → Update written → Event updates again
- Infinite loop → 50,000+ reads per hour
- Quota exhausted in ~6 minutes

**Solution:**
```javascript
// Separate concerns
useEffect(() => {
  const unsub = onSnapshot(eventRef, (docSnap) => {
    setEvent(docSnap.data()); // ✅ Just update state
  });
  return () => unsub();
}, [eventId]);

// Separate effect to handle changes
useEffect(() => {
  if (!event) return;
  // ✅ Now safe to update based on event changes
  handleEventChange();
}, [event?.status]);
```

---

#### ❌ Rule 2: Multiple Listeners Without Cleanup

**VIOLATION:**
```javascript
useEffect(() => {
  items.forEach(item => {
    // ❌ VIOLATION: New listener added every render
    onSnapshot(doc(db, "items", item.id), (doc) => {
      setData(doc.data());
    });
  });
  // ❌ VIOLATION: Missing cleanup - old listeners stack up
}, [items]); // ❌ Runs every time items changes
```

**Why it's bad:**
- If items changes 10 times, you have 10 listeners for each item
- 28 items × 10 renders = 280 active connections
- Quota exhausted in minutes
- Memory leak

**Solution:**
```javascript
useEffect(() => {
  const unsubscribers = [];

  items.forEach(item => {
    const unsub = onSnapshot(doc(db, "items", item.id), (doc) => {
      setData(prev => ({...prev, [item.id]: doc.data()}));
    });
    unsubscribers.push(unsub);
  });

  // ✅ Cleanup: unsubscribe all listeners
  return () => unsubscribers.forEach(unsub => unsub());
}, [items]); // ✅ Dependencies are specific
```

---

#### ❌ Rule 3: Polling with Continuous Fetching

**VIOLATION:**
```javascript
useEffect(() => {
  const loadAnswers = async () => {
    // ❌ VIOLATION: This is a Firestore READ
    const answers = await getQuestionAnswers(eventId, questionId);
    setVoteCount(answers.length);
  };

  // ❌ VIOLATION: Polling every 2 seconds = 30 reads/minute
  const interval = setInterval(loadAnswers, 2000);
  return () => clearInterval(interval);
}, [eventId, questionId]);
```

**Why it's bad:**
- 2-second polling = 30 reads per minute
- 30-second question = 15 reads just for vote count
- 10 questions = 150 reads per game
- Multiple concurrent events = quota exhausted

**Solution:**
```javascript
useEffect(() => {
  // ✅ Use real-time listener instead of polling
  const answersRef = collection(db, "events", eventId, "answers");
  const q = query(answersRef, where("questionId", "==", questionId));
  
  const unsub = onSnapshot(q, (snapshot) => {
    setVoteCount(snapshot.docs.length);
  });

  return () => unsub();
}, [eventId, questionId]);
```

**Result:** 30 reads/minute → 0 unnecessary reads

---

#### ❌ Rule 4: Expensive Operations Inside Listeners

**VIOLATION:**
```javascript
useEffect(() => {
  onSnapshot(eventRef, (docSnap) => {
    // ❌ VIOLATION: Each listener fire = 2 reads
    const question = getCurrentEventQuestion(); // READ #1
    const answered = hasUserAnswered();         // READ #2 (with query)
  });
}, []); // Event updates every 100ms during timers
```

**Why it's bad:**
- Event updates 10 times per second (100ms intervals)
- Each update = 2 reads
- = 20 reads per second = 1,200 reads per minute
- Quota destroyed in 40 minutes

**Solution:**
```javascript
// Effect 1: Just listen for events
useEffect(() => {
  const unsub = onSnapshot(eventRef, (docSnap) => {
    setEvent(docSnap.data()); // ✅ Just update state
  });
  return () => unsub();
}, [eventId]);

// Effect 2: Fetch expensive data only when needed
useEffect(() => {
  if (!event?.currentQuestionIndex) return;
  fetchCurrentQuestion(); // ✅ Only when question index changes
}, [event?.currentQuestionIndex]); // ✅ Specific dependency
```

---

#### ❌ Rule 5: Missing Dependency Arrays

**VIOLATION:**
```javascript
useEffect(() => {
  // ❌ VIOLATION: No dependency array - runs EVERY RENDER
  addDoc(collection(db, "items"), { data: "test" });
});

// ❌ VIOLATION: Runs even when dependencies haven't changed
useEffect(() => {
  const unsub = onSnapshot(eventRef, handleEvent);
  return () => unsub();
}); // No dependency array
```

**Why it's bad:**
- Runs on every render
- Creates new documents/subscriptions constantly
- 1,000 writes in 1 minute

**Solution:**
```javascript
useEffect(() => {
  const unsub = onSnapshot(eventRef, handleEvent);
  return () => unsub();
}, [eventId]); // ✅ REQUIRED: Specify dependencies
```

---

#### ❌ Rule 6: Fetching in Loop Intervals

**VIOLATION:**
```javascript
const checkAndAdvance = async () => {
  // ❌ VIOLATION: getDoc() called every 100ms
  const eventSnap = await getDoc(eventRef);
  const currentEvent = eventSnap.data();
  // During 10-second results: 100 reads!
};

const interval = setInterval(checkAndAdvance, 100);
```

**Why it's bad:**
- Results phase = 10 seconds
- 100ms interval = 100 checks
- Each check = 1 read
- = 100 reads per results phase
- Multiple events = 1,000s of unnecessary reads

**Solution:**
```javascript
const checkAndAdvance = async () => {
  // ✅ Use event data from state (already current via listener)
  // ✅ NO FIRESTORE READ NEEDED
  if (event) {
    const nextIndex = (event.currentQuestionIndex || 0) + 1;
    if (nextIndex < event.questions.length) {
      // Auto-advance logic
    }
  }
};

const interval = setInterval(checkAndAdvance, 100); // Still 100ms check, but 0 DB reads
```

**Result:** 100 reads per results phase → 0 reads

---

### ✅ GOOD: Safe Patterns

#### ✅ Pattern 1: Listener with Proper Cleanup

```javascript
useEffect(() => {
  // ✅ Single listener, properly cleaned up
  const unsub = onSnapshot(eventRef, (docSnap) => {
    setEvent(docSnap.data());
    // ✅ Just read and update state
    // ❌ Don't write back to Firestore here
  });

  return () => unsub(); // ✅ Always cleanup
}, [eventId]); // ✅ Specific dependency
```

---

#### ✅ Pattern 2: Separate Listener and Action Effects

```javascript
// Effect 1: Listen to data
useEffect(() => {
  const unsub = onSnapshot(eventRef, (docSnap) => {
    setEvent(docSnap.data());
  });
  return () => unsub();
}, [eventId]);

// Effect 2: React to data changes (safe to do expensive operations)
useEffect(() => {
  if (!event?.status) return;
  // ✅ This effect is independent
  // ✅ Only runs when event.status actually changes
  handleStatusChange(event.status);
}, [event?.status]); // ✅ Only depend on what matters
```

---

#### ✅ Pattern 3: Guard Against Multiple Callback Fires

```javascript
const callbackFiredRef = useRef(false);

useEffect(() => {
  const unsub = onSnapshot(docRef, (docSnap) => {
    // ✅ Only fires callback once per phase
    if (docSnap.data().status === "complete" && !callbackFiredRef.current) {
      callbackFiredRef.current = true;
      handleCompletion(); // ✅ Called exactly once
    }
  });

  return () => unsub();
}, []);

// Reset guard when entering new phase
useEffect(() => {
  callbackFiredRef.current = false;
}, [event?.status]);
```

---

#### ✅ Pattern 4: Use Real-time Listeners Instead of Polling

```javascript
// ✅ Good: Real-time listener
const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
  setItems(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
});

return () => unsubscribe();

// ❌ Bad: Polling every 2 seconds
const interval = setInterval(async () => {
  const snapshot = await getDocs(collectionRef);
  setItems(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
}, 2000);
```

---

## Database Rules

### 📊 Firestore Read/Write Limits

**Firebase Free Tier:** 50,000 reads/day  
**Firebase Spark Plan:** 50,000 reads/day  
**Firebase Blaze Plan:** Pay-as-you-go ($6 per million reads)

**RULE:** Assume maximum 50,000 reads/day. Never exceed this in development.

**Calculation:**
- 1 day = 86,400 seconds
- 50,000 reads ÷ 86,400 seconds = 0.58 reads/second average
- In practice: Allow bursts up to ~5 reads/second, then rest
- **Conservative estimate:** 1-2 concurrent events max in development

**Why:** Exceeding quota causes:
- Service completely blocked
- App becomes unusable
- All Firestore operations fail
- Cannot test or debug

---

### 🚫 Firestore Anti-Patterns

**NEVER DO:**
- ❌ Query inside listener (causes N+1 reads)
- ❌ Fetch document in 100ms loop
- ❌ Poll for updates every 2 seconds
- ❌ Create multiple queries with same data
- ❌ Subscribe to same collection multiple times

**ALWAYS DO:**
- ✅ Use one listener per piece of data
- ✅ Cache query results in state
- ✅ Use real-time listeners instead of polling
- ✅ Unsubscribe from listeners on cleanup
- ✅ Batch operations when possible

---

### 📈 Expected Read Patterns

**Per game with 10 questions and 4 participants:**

| Operation | Reads | Frequency | Total |
|-----------|-------|-----------|-------|
| Fetch current question | 1 | 10 questions | 10 |
| Answer submission | 1 | 40 answers (4 × 10) | 40 |
| Firestore listener (event) | 0* | Continuous | 0 |
| Answer count (listener) | 0* | Continuous | 0 |
| Auto-advance check | 0** | Every 100ms × results phases | 0 |
| **TOTAL PER GAME** | | | **~50 reads** |

*Real-time listeners don't count as reads - they're free after initial setup  
**Local calculations don't fetch from DB

---

## React/Effect Rules

### ⚛️ useEffect Standards

**RULE:** Every `useEffect` must have:
1. A specific dependency array (never empty unless documented)
2. A cleanup function if managing subscriptions
3. A comment explaining what it does

**VIOLATION:**
```javascript
// ❌ No dependency array
useEffect(() => {
  doSomething();
});

// ❌ Empty dependency array (only valid for setup)
useEffect(() => {
  onSnapshot(ref, handleUpdate); // ❌ Missing cleanup
}, []);

// ❌ Vague dependencies
useEffect(() => {
  fetchData();
}, [event]); // ❌ What about event triggers this?
```

**CORRECT:**
```javascript
// ✅ Comment explains purpose
// Listen for event updates (status changes, timers, etc.)
useEffect(() => {
  const unsub = onSnapshot(eventRef, (doc) => {
    setEvent(doc.data());
  });

  return () => unsub(); // ✅ Cleanup
}, [eventId]); // ✅ Specific dependency
```

---

### useRef Rules

**RULE:** `useRef` must be used ONLY for:
1. Tracking if callback has fired (prevent duplicates)
2. Storing previous values for comparison
3. DOM references

**VIOLATION:**
```javascript
// ❌ Using ref to store state that should trigger renders
const countRef = useRef(0);
countRef.current++; // ❌ Component won't re-render
```

**CORRECT:**
```javascript
// ✅ Using ref to prevent duplicate callback fires
const timerExpiredRef = useRef(false);

useEffect(() => {
  if (remaining === 0 && !timerExpiredRef.current) {
    timerExpiredRef.current = true;
    handleExpire(); // ✅ Fires exactly once
  }
}, [remaining]);
```

---

### Dependency Array Rules

**RULE:** Every dependency used in effect must be listed, except:
- Constants (never change)
- Functions from outside (should be memoized)
- Objects created inside effect

**VIOLATION:**
```javascript
useEffect(() => {
  // ❌ event used but not in dependency array
  const status = event.status;
  updateStatus(status);
}, []); // ❌ Will use stale event value
```

**CORRECT:**
```javascript
useEffect(() => {
  const status = event.status;
  updateStatus(status);
}, [event?.status]); // ✅ Only depend on what changes
```

---

## Firestore Rules

### 🔥 Query Standards

**RULE:** All queries must be indexed if querying multiple fields.

**VIOLATION:**
```javascript
// ❌ Querying multiple fields without index
const q = query(
  answersRef,
  where("questionId", "==", questionId),
  where("correct", "==", true)
);
```

**CORRECT:**
```javascript
// ✅ Composite index created in Firebase Console
const q = query(
  answersRef,
  where("questionId", "==", questionId),
  where("correct", "==", true)
);
```

---

### 🔄 Real-time Listener Standards

**RULE:** Use `onSnapshot` for data that needs real-time updates, `getDoc` only for one-time fetches.

**VIOLATION:**
```javascript
// ❌ Polling with repeated getDoc calls
const interval = setInterval(async () => {
  const snap = await getDoc(eventRef);
  setEvent(snap.data());
}, 1000);
```

**CORRECT:**
```javascript
// ✅ Real-time listener (instant updates, no polling)
const unsub = onSnapshot(eventRef, (snap) => {
  setEvent(snap.data());
});

return () => unsub();
```

---

### ✍️ Write Standards

**RULE:** All writes must be atomic (single `updateDoc` call) to prevent race conditions.

**VIOLATION:**
```javascript
// ❌ Multiple writes (race condition risk)
await setShowingResultsOnly(eventId, true);
await updateEventStatus(eventId, "results");
await updateTimestamp(eventId, Date.now());
```

**CORRECT:**
```javascript
// ✅ Single atomic write
const eventRef = doc(db, "events", eventId);
await updateDoc(eventRef, {
  showingResultsOnly: true,
  status: "results",
  phaseStartedAt: serverTimestamp()
});
```

---

### 🗑️ Cleanup Standards

**RULE:** All listeners must be unsubscribed in effect cleanup.

**VIOLATION:**
```javascript
useEffect(() => {
  onSnapshot(ref, handleUpdate);
  // ❌ No cleanup - listener persists after unmount
}, []);
```

**CORRECT:**
```javascript
useEffect(() => {
  const unsub = onSnapshot(ref, handleUpdate);
  return () => unsub(); // ✅ Cleanup on unmount
}, []);
```

---

### 📊 Answer Tracking Pattern (Answer Count & Answered Users)

**Problem:** Tracking answer counts and user answered status efficiently without quota exhaustion.

**Key Insight:** Participants collection has a `hasAnswered` property - use real-time listener on participants, not polling on answers collection!

#### ✅ CORRECT: Efficient Answer Tracking via Participants Listener

**When to use:** Tracking how many participants have answered the current question during question phase.

```javascript
useEffect(() => {
  if (!eventId || event?.status !== "question") return;

  // ✅ EFFICIENT: Listen to participants collection (real-time updates)
  const unsubscribeParticipants = listenToParticipants(eventId, (participants) => {
    // Count participants who have answered
    const answeredCount = participants.filter(p => p.hasAnswered).length;
    setVoteCount(answeredCount);
    
    // Optional: Track who has answered (for UI indicators)
    const answeredUserIds = participants
      .filter(p => p.hasAnswered)
      .map(p => p.id);
    setAnsweredUsers(answeredUserIds);
  });

  return () => unsubscribeParticipants();
}, [eventId, event?.status]);
```

**Cost Analysis:**
- **Real-time listener:** 1 read when participant submits answer, updates instantly
- **Polling every 2 seconds:** 30 reads per minute = 300 reads per 10-minute question
- **Savings:** 99% reduction in reads

#### ❌ WRONG: Polling on Answers Collection

```javascript
// ❌ VIOLATION: Polling answers for count = 600 reads per event
useEffect(() => {
  if (event?.status !== "question") return;

  const loadAnswerCount = async () => {
    // ❌ This is a READ - triggered 30 times per minute
    const answers = await getQuestionAnswers(eventId, currentQuestion.id);
    setVoteCount(answers.length);
  };

  // ❌ Poll every 2 seconds = 300 reads per 10-minute question
  const interval = setInterval(loadAnswerCount, 2000);
  return () => clearInterval(interval);
}, [eventId, currentQuestion?.id]);
```

#### 📋 When to Fetch Answers Collection

Only fetch answers when you need answer DETAILS (not count):
- When results phase starts (display which options won)
- When admin wants to see detailed answer breakdowns
- When exporting game data

```javascript
// ✅ CORRECT: Fetch answers only when showing results
useEffect(() => {
  if (event?.status !== "results" || !currentQuestion) return;

  const fetchAnswerDetails = async () => {
    // ✅ Single fetch when results phase starts (~10 reads total)
    const answers = await getQuestionAnswers(eventId, currentQuestion.id);
    setAnswerDetails(answers);
    
    // Calculate breakdown
    const breakdown = calculateAnswerBreakdown(answers);
    setAnswerBreakdown(breakdown);
  };

  fetchAnswerDetails();
}, [event?.status, currentQuestion?.id, eventId]);
```

#### 🎯 Implementation in AdminSettings.jsx

Admin dashboard needs two things:

1. **Answer count during question phase** → Use participants listener ✅
2. **Answer details during results phase** → Fetch once when needed ✅

```javascript
// Effect 1: Track answer count in real-time
useEffect(() => {
  if (!eventId) return;

  const unsubscribeParticipants = listenToParticipants(eventId, (updatedParticipants) => {
    setParticipants(updatedParticipants);
    
    // During question phase: count who answered
    if (event?.status === "question" && currentQuestion) {
      const answeredCount = updatedParticipants.filter(p => p.hasAnswered).length;
      setVoteCount(answeredCount);
    }
  });

  return () => unsubscribeParticipants();
}, [eventId, event?.status, currentQuestion?.id]);

// Effect 2: Fetch answer details only in results phase
useEffect(() => {
  if (event?.status !== "results" || !currentQuestion) return;

  const loadAnswerBreakdown = async () => {
    const answers = await getQuestionAnswers(eventId, currentQuestion.id);
    // Process answers for display...
  };

  loadAnswerBreakdown();
}, [event?.status, currentQuestion?.id, eventId]);
```

#### 🚀 Optimization: resetParticipantsAnswered() with Real-time Data

**Problem:** Resetting participant answered status between questions needs participant list. If you fetch it fresh each time = extra read.

**Solution:** Pass the participants array from real-time listener instead of fetching:

```javascript
// ❌ OLD: Extra read on every question advance
await resetParticipantsAnswered(eventId); // Fetches all participants = 1 read

// ✅ NEW: Use data from real-time listener
const unsubParticipants = listenToParticipants(eventId, (updatedParticipants) => {
  setParticipants(updatedParticipants);
});

// Later, when advancing to next question:
await resetParticipantsAnswered(eventId, participants); // No extra read!
```

**Cost Savings:**
- Old: 1 read per question advance × 10 questions = 10 reads
- New: 0 reads (uses real-time listener data)
- **Savings: 10 reads per event**

#### ⏱️ Question Timer Pattern (Auto-Transition to Results)

**Problem:** Need to auto-transition from question phase to results phase when timer expires, but can't use polling loop with getDoc (Rule #6 violation).

**Solution:** Calculate time locally using 100ms interval + useRef guard + atomic Firestore write.

```javascript
// ✅ CORRECT: Local time calculation + atomic state transition
useEffect(() => {
  if (!event || event.status !== "question") {
    setQuestionTimeLeft(0);
    questionTimerExpiredRef.current = false;
    return;
  }

  const updateQuestionTimeLeft = () => {
    const durationSeconds = event.questionTimerSeconds || 30;
    const questionPhaseStartedAt = event.phaseStartedAt?.toMillis?.() || event.phaseStartedAt;

    if (!questionPhaseStartedAt) {
      setQuestionTimeLeft(durationSeconds);
      return;
    }

    const now = Date.now();
    const elapsedMs = now - questionPhaseStartedAt;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const remaining = Math.max(0, durationSeconds - elapsedSeconds);

    setQuestionTimeLeft(remaining);

    // ✅ SAFE: useRef guard prevents duplicate fires
    if (remaining === 0 && !questionTimerExpiredRef.current) {
      questionTimerExpiredRef.current = true;
      console.log(`⏱️ Question timer expired! Auto-advancing to results...`);

      // ✅ ATOMIC WRITE: Single updateDoc call
      const eventRef = doc(db, "events", eventId);
      updateDoc(eventRef, {
        status: "results",
        resultsPhaseStartedAt: serverTimestamp(),
      }).catch(error => {
        console.error("❌ Failed to auto-advance to results:", error);
        questionTimerExpiredRef.current = false;
      });
    }
  };

  // Update every 100ms (local calculation, no DB reads)
  updateQuestionTimeLeft();
  const interval = setInterval(updateQuestionTimeLeft, 100);

  return () => clearInterval(interval);
}, [event?.status, event?.phaseStartedAt, event?.questionTimerSeconds, eventId]);

// Reset guard when entering new question phase
useEffect(() => {
  if (event?.status === "question") {
    questionTimerExpiredRef.current = false;
  }
}, [event?.status, event?.phaseStartedAt]);
```

**Cost Analysis:**
- Loop runs: 100 times per 30-second question = 100 iterations
- Database reads per iteration: **0** (uses event data from listener)
- Total reads: **0** ✅
- Total writes: 1 (single atomic updateDoc call)

**Why this is safe:**
1. ✅ No Firestore reads in loop (uses event listener data)
2. ✅ useRef guard prevents duplicate callback fires
3. ✅ Atomic write prevents race conditions
4. ✅ serverTimestamp ensures synchronized timing
5. ✅ Specific dependencies (only when phase/time changes)
6. ✅ Cleanup function clears interval

**Integration with Results Timer:**
After this effect transitions to results phase, the Results Timer pattern takes over:
```
Question Phase → [Timer Expires] → Atomic write status="results"
                                        ↓
Results appear (listener fires instantly) → Results Timer Pattern takes over
Results Phase → [Timer Expires] → handleNextQuestion() calls updateToQuestionPhase()
                                        ↓
Atomic write: {status:"question", currentQuestionIndex, phaseStartedAt}
                                        ↓
Question fetching effect triggers (has both status && index)
                                        ↓
Next Question loads → Back to Question Phase
```

**🚨 CRITICAL: Race Condition Prevention in handleNextQuestion()**

When advancing to the next question, MUST use `updateToQuestionPhase()` which combines both writes atomically:

```javascript
// ❌ WRONG: Two separate writes = race condition
await updateCurrentQuestionIndex(eventId, nextIndex);  // Listener fires with index but status still "results"
await updateEventStatus(eventId, "question");          // Listener fires again with status but index already changed

// ✅ CORRECT: Single atomic write
await updateToQuestionPhase(eventId, nextIndex);  // Both currentQuestionIndex and status update together
```

**Why this matters:**
- If you split the writes, listener fires TWICE with inconsistent state
- Question fetching effect depends on `event?.status` AND `event?.currentQuestionIndex`
- If listener fires with mismatched values, effect might not trigger correctly
- Result: Game gets stuck between question/results phase

---

#### 🎯 Effect Separation Pattern (Prevent Excessive Re-runs)

**Problem:** When multiple concerns are in one effect, changing ANY dependency re-runs the ENTIRE effect, causing expensive operations (like `getCurrentEventQuestion()`) to execute excessively.

**Wrong Approach:** One bloated effect with all dependencies
```javascript
// ❌ WRONG: Reruns loadQuestion() whenever ANY of these change
useEffect(() => {
  if (event?.status !== "question") {
    navigate(`/lobby/${eventId}`);
    return;
  }

  async function loadQuestion() {
    const q = await getCurrentEventQuestion(event.id, event.currentQuestionIndex);
    setQuestion(q);
  }

  loadQuestion();
  
  const unsub = listenToParticipants(eventId, (participants) => {
    setParticipants(participants);
  });

  return () => unsub();
}, [event, user, eventId, navigate]); // ❌ Runs on ANY event change!
```

**Result:** When `event.phaseStartedAt` updates (100ms timer loop), entire effect reruns, `loadQuestion()` fires 60+ times for the SAME question!

**Solution:** Separate by concern into THREE focused effects

```javascript
// Effect 1: Handle navigation away from question status
useEffect(() => {
  if (!event) return;

  if (event.status !== "question") {
    navigate(`/lobby/${eventId}`);
    return;
  }
}, [event?.status, eventId, navigate]); // ✅ Only runs when status changes

// Effect 2: Load question ONLY when currentQuestionIndex changes
useEffect(() => {
  if (!event || event.status !== "question") {
    setQuestion(null);
    return;
  }

  async function loadQuestion() {
    const q = await getCurrentEventQuestion(event.id, event.currentQuestionIndex);
    setQuestion(q);
  }

  loadQuestion();
}, [event?.status, event?.currentQuestionIndex, eventId, user, navigate]); // ✅ Specific to question loading

// Effect 3: Listen to participants for state changes (independent concern)
useEffect(() => {
  if (!eventId) return;

  const unsub = listenToParticipants(eventId, (participants) => {
    setParticipants(participants);
  });

  return () => unsub();
}, [eventId]); // ✅ Only reruns when eventId changes
```

**Why this works:**
- Effect 1: Only responds to actual status changes (question → results)
- Effect 2: Only loads new question when index actually changes
- Effect 3: Participants listener is independent, doesn't affect question loading
- Result: Each operation runs only when truly necessary ✅

**Problem:** Timer expiration guards (`useRef`) need to reset when entering a **new** phase, but NOT when just updating within the same phase.

**Wrong Approach:** Reset guard on every status change
```javascript
// ❌ WRONG: Resets on every timestamp update
useEffect(() => {
  if (event?.status === "results") {
    resultsTimerExpiredRef.current = false; // Fires on every resultsPhaseStartedAt change!
  }
}, [event?.status, event?.resultsPhaseStartedAt]); // ❌ Timestamp dependency
```

**Solution:** Track which phase you're currently in using `currentQuestionIndex + timestamp combo`

```javascript
// ✅ CORRECT: Only reset when entering a truly NEW phase
const resultsPhaseIdRef = useRef(null);

useEffect(() => {
  if (event?.status === "results") {
    // Create unique identifier for this phase
    const currentPhaseId = `${event?.currentQuestionIndex}_${event?.resultsPhaseStartedAt}`;
    
    // Only reset if it's a different phase
    if (currentPhaseId !== resultsPhaseIdRef.current) {
      console.log(`🔵 Entering NEW results phase, resetting guard`);
      resultsPhaseIdRef.current = currentPhaseId;
      resultsTimerExpiredRef.current = false; // ✅ Reset once per new phase
    }
  }
}, [event?.status, event?.currentQuestionIndex, event?.resultsPhaseStartedAt]);
```

**Why this matters:**
- Without phase tracking: Guard resets multiple times during same phase → callback fires multiple times
- Result: `handleNextQuestion()` executes multiple times → questions skip
- With phase tracking: Guard resets exactly once when entering new phase → callback fires exactly once
- Result: Each question advances normally


#### 🤖 Auto-Advance Pattern (Results Timer)

**Problem:** Need to auto-advance to next question when results timer expires, but can't use polling loop with getDoc (Rule #6 violation).

**Solution:** Calculate time locally using 100ms interval + useRef guard + event listener data.

```javascript
// ✅ CORRECT: Local time calculation + auto-advance
useEffect(() => {
  if (!event || event.status !== "results") return;

  const updateResultsTimeLeft = () => {
    const durationSeconds = event.resultsTimerSeconds || 10;
    const resultsPhaseStartedAt = event.resultsPhaseStartedAt?.toMillis?.() || event.resultsPhaseStartedAt;

    if (!resultsPhaseStartedAt) {
      setResultsTimeLeft(durationSeconds);
      return;
    }

    const now = Date.now();
    const elapsedMs = now - resultsPhaseStartedAt;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const remaining = Math.max(0, durationSeconds - elapsedSeconds);

    setResultsTimeLeft(remaining);

    // ✅ SAFE: useRef guard prevents duplicate fires
    if (remaining === 0 && !resultsTimerExpiredRef.current) {
      resultsTimerExpiredRef.current = true;
      handleNextQuestion(); // Advance to next question
    }
  };

  // Update every 100ms (local calculation, no DB reads)
  updateResultsTimeLeft();
  const interval = setInterval(updateResultsTimeLeft, 100);

  return () => clearInterval(interval);
}, [event?.status, event?.resultsPhaseStartedAt, event?.resultsTimerSeconds]);

// Reset guard when entering new results phase
useEffect(() => {
  if (event?.status === "results") {
    resultsTimerExpiredRef.current = false;
  }
}, [event?.status, event?.resultsPhaseStartedAt]);
```

**Cost Analysis:**
- Loop runs: 100 times per 10-second results = 100 iterations
- Database reads per iteration: **0** (uses event data from listener)
- Total reads: **0** ✅
- Total writes: 1 (auto-advance call makes 1 write)

**Why this is safe:**
1. ✅ No Firestore reads in loop (uses event listener data)
2. ✅ useRef guard prevents duplicate callback fires
3. ✅ Specific dependencies (only when phase/time changes)
4. ✅ Cleanup function clears interval

---

## Code Quality Rules

### 📝 Commenting Standards

**RULE:** Complex logic must have comments explaining WHY, not WHAT.

**BAD:**
```javascript
// ❌ Obvious from code, doesn't explain why
const remaining = Math.max(0, duration - elapsed);
```

**GOOD:**
```javascript
// ✅ Explains why this matters
// Ensure remaining is never negative (would break UI countdown)
const remaining = Math.max(0, duration - elapsed);
```

---

### 🏷️ Naming Standards

**RULE:** Variables must be descriptive and include context.

**VIOLATION:**
```javascript
// ❌ Vague names
const t = 300;
const p = [];
const f = false;
```

**CORRECT:**
```javascript
// ✅ Descriptive names
const questionTimerSeconds = 300;
const participants = [];
const hasAnswered = false;
```

---

### 🧪 Console Logging Standards

**RULE:** Use meaningful emoji prefixes and log strategically (not on every render).

**GOOD PATTERNS:**
```javascript
console.log(`🟡 Q${index} timer started (${duration}s)`);
console.log(`🔴 Q${index} timer EXPIRED!`);
console.log(`🟢 Results timer expired, auto-advancing...`);
console.log(`❌ Error auto-advancing:`, error);
console.log(`✅ Updated to question phase ${nextIndex}`);
```

**Emoji Guide:**
- 🟡 Starting/tracking
- 🔴 Expiration/critical
- 🟢 Success/completion
- 🔵 Information
- ❌ Errors
- ✅ Confirmation

---

### 🎯 Commit Message Standards

**RULE:** Every commit must explain WHAT changed and WHY.

**VIOLATION:**
```
bad commit messages:
- "fix stuff"
- "updates"
- "code cleanup"
```

**CORRECT:**
```
Fix: Replace 2s polling with real-time listener for answer counts
- Reduces reads from 30/min to 0/min
- Improves responsiveness (instant updates)
- Prevents quota exhaustion

Fix: Separate event listener from question fetching
- Event listener only updates state (0 reads)
- Question fetch only when index changes (1 read per question)
- Prevents 600+ reads/minute during timers
```

---

### 🔍 Code Review Checklist

Before committing, ensure:

- [ ] No polling loops (use real-time listeners)
- [ ] No getDoc/getDocs in useEffect callbacks
- [ ] All listeners cleaned up in return statement
- [ ] Dependency arrays are specific and complete
- [ ] No infinite loops or recursive updates
- [ ] Atomic writes (single updateDoc calls)
- [ ] useRef guards for callback firing
- [ ] Meaningful console logs with emoji
- [ ] Commit message explains changes
- [ ] Build passes with 0 errors
- [ ] No new markdown files created (only update DEVELOPMENT_RULES.md)

---

## Quota Management

### 📊 Monitoring Quota

**Check quota at:** [Firebase Console](https://console.firebase.google.com/)

**Weekly review:**
- How many reads did I use?
- Is there a pattern (e.g., 1,000 reads at 2pm)?
- Did I exceed safe limits?

**If approaching quota:**
1. Identify which features use most reads
2. Replace polling with listeners
3. Move getDoc calls out of effects
4. Cache data in state

---

### 🚨 Emergency: Quota Exceeded

**If quota is exceeded:**

1. **Immediately:**
   - Stop developing/testing
   - Firestore is completely blocked
   - App is unusable

2. **Recovery:**
   - Wait 24 hours for quota reset, OR
   - Upgrade to Blaze plan (pay-as-you-go)

3. **Prevention for next time:**
   - Review what caused spike
   - Implement safeguards from this document
   - Add quota monitoring to CI/CD

---

## Summary

**The Golden Rule:** ✨

> **Make one listener per piece of data. Calculate everything else locally. Update listeners only when state actually changes.**

This prevents:
- ✅ Infinite loops
- ✅ Quota exhaustion
- ✅ Memory leaks
- ✅ Stale data bugs
- ✅ Performance issues

**Follow these rules. Your future self will thank you.** 🙏
