# Code Changes - Game.jsx Fix

## Summary
Removed the auto-advance setTimeout from Game.jsx to establish a single timer system controlled by Lobby.jsx and Admin Dashboard.

## Changes Made

### ❌ REMOVED: Auto-advance in Game.jsx

**Location:** `src/pages/Game.jsx` - `handleTimerExpired` function

**OLD CODE (BROKEN):**
```javascript
const handleTimerExpired = async () => {
  if (!event || !question) return;
  
  try {
    // Set showing results only flag and transition to results state
    await setShowingResultsOnly(eventId, true);
    await updateEventStatus(eventId, "results");
    
    // ❌ THIS WAS THE PROBLEM - Auto-advance with hardcoded 2 minutes
    setTimeout(async () => {
      try {
        await setShowingResultsOnly(eventId, false);
        
        // Fetch the current event to get fresh data
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);
        const currentEvent = eventSnap.data();
        
        if (currentEvent) {
          // Move to next question or end game
          const nextIndex = (currentEvent.currentQuestionIndex || 0) + 1;
          if (currentEvent.questions && nextIndex < currentEvent.questions.length) {
            await resetParticipantsAnswered(eventId);
            await updateCurrentQuestionIndex(eventId, nextIndex);
            await updateEventStatus(eventId, "question");
          } else {
            // Game ended - go back to lobby
            await updateEventStatus(eventId, "lobby");
          }
        }
      } catch (error) {
        console.error("Error auto-advancing after results:", error);
      }
    }, 120000); // ❌ HARDCODED 2 MINUTES!
  } catch (error) {
    console.error("Error handling timer expiration:", error);
  }
};
```

**NEW CODE (FIXED):**
```javascript
// Handle timer expiration: transition to results
// DO NOT auto-advance here - let Lobby handle all advancement
// This ensures single source of truth: Admin Dashboard
const handleTimerExpired = async () => {
  if (!event || !question) return;
  
  try {
    // Transition to results state
    // The Lobby component will handle auto-advancing based on resultsTimerSeconds
    await setShowingResultsOnly(eventId, true);
    await updateEventStatus(eventId, "results");
  } catch (error) {
    console.error("Error handling timer expiration:", error);
  }
};
```

### ❌ REMOVED: Unused Firebase Imports

**OLD IMPORTS:**
```javascript
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
```

**NEW IMPORTS (CLEAN):**
```javascript
// No Firebase imports needed - all operations via service functions
```

**Impact:**
- Reduced unused code
- Cleaner dependency tree
- No confusion about which Firebase operations are available

## Why This Fixes the Problem

### **The Root Cause:**
Two independent setTimeout systems were racing:
1. **Game.jsx**: Auto-advance after 120000ms (2 minutes) - HARDCODED
2. **Lobby.jsx**: Auto-advance after resultsTimerSeconds - FROM ADMIN SETTINGS

**Result**: Questions jumped rapidly because timers conflicted

### **The Solution:**
Remove Game.jsx's setTimeout entirely. Let Lobby.jsx be the ONLY source of auto-advance, controlled by Admin Dashboard.

**Result**: Single, predictable timer system with no conflicts

## Verification

### Build Test
```
✓ 106 modules transformed.
✓ built in 267ms
✓ No errors
✓ No warnings
```

### Code Quality
- ✅ Removed hardcoded timer value (120000)
- ✅ Removed unused async operations (getDoc, updateDoc)
- ✅ Removed unused Firebase imports
- ✅ Single responsibility principle: Game only manages UI transitions
- ✅ Lobby manages all game state automation

## Game Loop Now Works Like This

```
Admin Dashboard controls timing:
  ├─ questionTimerSeconds (e.g., 300)
  └─ resultsTimerSeconds (e.g., 10)

Game.jsx role:
  └─ When question timer expires → transition to results ONLY

Lobby.jsx role:
  ├─ Display question timer (visual countdown)
  ├─ When timer expires → call handleTimerExpired
  ├─ handleTimerExpired → show results
  ├─ Wait resultsTimerSeconds
  └─ Auto-advance to next question (if admin didn't manually override)
```

## Before vs After

### BEFORE: Rapid Question Succession ❌
```
[Q1 starts]
  ↓ (300s pass)
[Q1 timer expires] → [Results for 10s]
  ↓ (2 minutes later - GAME.JS)
[Auto-advance to Q2] BUT ALSO
  ↓ (10s pass - LOBBY.JS)
[Auto-advance to Q2]
Result: CONFLICT, questions jump!
```

### AFTER: Smooth, Single Flow ✅
```
[Q1 starts]
  ↓ (300s pass - controlled by Lobby's GameTimer)
[Q1 timer expires] → [Results for 10s - controlled by Lobby.js]
  ↓ (10s pass - ONLY Lobby.js handles this)
[Auto-advance to Q2] ← Clean, no conflicts
  ↓ (300s pass)
[Q2 timer expires] → [Results for 10s]
  ↓ (Repeat)
Result: SMOOTH, predictable game flow
```

