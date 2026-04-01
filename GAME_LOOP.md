# 🎮 GAME LOOP - COMPREHENSIVE DOCUMENTATION

## The Problem That Was Fixed

**Issue:** Questions were changing too rapidly when clicking "Start Game"

**Root Cause:** Two conflicting timer systems:
- Game.jsx had a hardcoded 2-minute auto-advance timer
- Lobby.jsx had an admin-controlled auto-advance timer
- Both fired independently, causing rapid question changes

**Solution:** Removed the conflicting setTimeout from Game.jsx. Now Lobby.jsx is the **exclusive** handler of all game advancement logic.

---

## Architecture Overview

### Single Source of Truth: Admin Settings

**CRITICAL:** AdminSettings.jsx is the authoritative source for BOTH:
1. **Timer Configuration** (questionTimerSeconds, resultsTimerSeconds)
2. **Game Loop Advancement** (auto-advance after timers expire)

This ensures that when an admin adjusts the question timer, it applies to:
- The currently running question
- All future questions in the game

### Game State Machine

```
LOBBY
  ↓ (Admin clicks "Start Game")
QUESTION (Timer: questionTimerSeconds from AdminSettings)
  ├─ Players answer OR timer expires
  ↓ (When timer expires OR admin clicks "End Question")
RESULTS (Timer: resultsTimerSeconds from AdminSettings)
  ├─ If admin clicks "Next Question" → immediate advance
  ├─ If timer expires without admin action → AdminSettings auto-advances
  ↓
QUESTION (Next question)
  └─ Repeat until all questions answered or admin ends game
```

### Component Responsibilities

| Component | Role | Controls | Does NOT Do |
|-----------|------|----------|-----------|
| **AdminSettings.jsx** | Single source of truth | Game state, timers, auto-advance logic | Display questions to players |
| **Lobby.jsx** | Player-side controller | Navigation, question validation | Make game decisions |
| **Game.jsx** | Question display | Display UI, collect answers | Handle advancement |
| **GameTimer.jsx** | Visual countdown | Display timer, trigger expiration callback | Make decisions |
| **Results.jsx** | Results display | Show vote counts | Control timing |

---

## How It Works - Detailed Flow

### Phase 1: Question Display

```
Admin clicks "Start Game"
  ↓
Sets in database:
  - status = "question"
  - currentQuestionIndex = 0
  - phaseStartedAt = Date.now()

Lobby listener detects status change
  ↓
Navigates players to /game/:eventId
  ↓
GameTimer displays countdown (questionTimerSeconds)
  ↓
Players see question and can answer
```

### Phase 2: Timer Expires

```
GameTimer in Lobby reaches 0 seconds
  ↓
Calls Lobby's handleTimerExpired()
  ↓
Sets in database:
  - status = "results"
  - showingResultsOnly = true

Players auto-navigate to /results/:eventId
  ↓
Results page shows vote counts
```

### Phase 3: Auto-Advance (If admin doesn't manually advance)

```
resultsTimerSeconds passes (10 seconds default)
  ↓
Lobby's setTimeout fires
  ↓
### Phase 3: Auto-Advance (AdminSettings Controls This)

```
resultsTimerSeconds passes (10 seconds default)
  ↓ (AdminSettings effect detects resultsTimeLeft === 0)
  ↓
AdminSettings calls:
  - setShowingResultsOnly(false)
  - Delete all answers
  - Reset all participants (hasAnswered = false)
  - Increment currentQuestionIndex
  - Set status = "question"
  
Lobby listener detects status change
  ↓
Players auto-navigate to /game/:eventId
  ↓
See next question
  ↓
Cycle repeats with current timer settings
```

**Why AdminSettings handles auto-advance:**
- Admin might change timer during results display
- AdminSettings monitors the resultsPhaseStartedAt timestamp
- When timer reaches 0, AdminSettings auto-advances with current settings
- This ensures admin changes take effect immediately

### Alternative: Manual Advance (If admin clicks "Next Question")

```
Admin clicks "Next Question" during results
  ↓
Immediately:
  - Delete all answers
  - Reset all participants
  - Increment currentQuestionIndex
  - Set status = "question"
  
Players auto-navigate to /game/:eventId
  ↓
See next question immediately
```

---

## Key Implementation Details

### Game.jsx - Simple and Clean

```javascript
const handleTimerExpired = async () => {
  if (!event || !question) return
  
  try {
    // ONLY notify that question timer expired
    // setShowingResultsOnly(true) sets resultsPhaseStartedAt
    // AdminSettings and Lobby handle everything else
    await setShowingResultsOnly(eventId, true)
  } catch (error) {
    console.error("Error handling timer expiration:", error)
  }
}
```

**Why this is correct:**
- ✅ Single responsibility: display questions, signal timer expiration
- ✅ No auto-advance logic (prevents conflicts)
- ✅ No hardcoded timers
- ✅ Respects admin timer changes

### Lobby.jsx - Player Navigation Controller

```javascript
const handleTimerExpired = async () => {
  if (!event) return
  
  if (event.status === "question") {
    // Signal that question timer expired
    // AdminSettings and Game will handle results transition
    await setShowingResultsOnly(eventId, true)
  }
}

// Listen to game state changes and navigate players accordingly
useEffect(() => {
  onSnapshot(eventRef, async (docSnap) => {
    const eventData = docSnap.data()
    
    // When showingResultsOnly becomes true → update status
    if (eventData.showingResultsOnly && eventData.status !== "results") {
      await updateEventStatus(eventId, "results")
      navigate(`/results/${eventId}`)
    }
    
    // When status becomes "question" → navigate to game
    if (eventData.status === "question") {
      navigate(`/game/${eventId}`)
    }
  })
})
```

**Why this is correct:**
- ✅ Only manages player navigation
- ✅ Responds to state changes set by AdminSettings
- ✅ Does NOT control auto-advance timing
- ✅ Works with any timer configuration

### AdminSettings.jsx - Game Loop Master

```javascript
// Monitor results timer and auto-advance when it expires
useEffect(() => {
  if (event.status !== "results" || !event.showingResultsOnly) return
  
  const durationSeconds = event.resultsTimerSeconds || 10
  const elapsed = (Date.now() - event.resultsPhaseStartedAt) / 1000
  const remaining = Math.max(0, durationSeconds - elapsed)
  
  // When remaining time reaches 0, auto-advance
  if (remaining === 0) {
    setShowingResultsOnly(false)
    deleteAnswersForEvent(eventId)
    updateCurrentQuestionIndex(eventId, nextIndex)
    updateEventStatus(eventId, "question")
  }
}, [event])
```

**Why this is correct:**
- ✅ AdminSettings is SINGLE SOURCE OF TRUTH
- ✅ Controls both timer config AND auto-advance logic
- ✅ Respects admin timer changes immediately
- ✅ All game loop decisions flow from AdminSettings

---

## Admin Controls

### Available Actions

| Button | Effect | Timing |
|--------|--------|--------|
| **Start Game** | Begin game, show first question | Immediate |
| **Next Question** | Skip to next question, ignore auto-advance | Immediate |
| **End Question & Show Results** | Force results display | Immediate |
| **End Game & Show Results** | Finish game | Immediate |
| **Reset Game** | Clear answers, return to Q1, status=lobby | Immediate |

### Configuration

**Question Timer** (How long question displays)
- Set on Admin Dashboard (AdminSettings.jsx)
- Range: 5-900 seconds
- Default: 300 seconds (5 minutes)
- **Change takes effect immediately for current/next question**

**Results Timer** (How long results display)
- Set on Admin Dashboard (AdminSettings.jsx)
- Range: 5-60 seconds
- Default: 10 seconds
- **Change takes effect immediately for current results display**

**When do changes take effect?**
- ✅ Immediately when changed (affects current timer if still running)
- ✅ Next timer cycle uses new value
- ✅ Admin sees real-time countdown update

---

## Player Experience

### What Players See

1. Join game → See Lobby
2. Wait for admin to start
3. See countdown timer in Lobby
4. When timer expires → Redirected to Question page
5. See question and answer options
6. Click answer → Auto-redirected to Lobby
7. See results page
8. After result timer → Auto-redirected to Lobby with next question
9. Repeat for each question

### What Players Can Do

✅ Answer questions  
✅ See results  
✅ Leave game  
❌ Start/stop game  
❌ Change questions
❌ Modify timing  

---

## Database Structure

### Event Document

```javascript
events/{eventId}
├── code: "ABCD"                    // Event code
├── name: "Quiz Night"              // Event name
├── status: "question"              // State: lobby|question|results
├── currentQuestionIndex: 0         // Which question showing
├── questions: ["q1", "q2"]         // Question IDs
├── customQuestions: []             // Custom question IDs
├── questionTimerSeconds: 300       // Admin-configured timer
├── resultsTimerSeconds: 10         // Admin-configured timer
├── phaseStartedAt: Timestamp       // When phase started
├── showingResultsOnly: false       // Results display flag
└── adminId: "uid123"               // Admin's user ID
```

### Answer Document

```javascript
answers/{eventId}/
  ├── {questionId}/
      ├── {userId1}/
      │   ├── optionIndex: 0
      │   └── submittedAt: Timestamp
      └── {userId2}/
          ├── optionIndex: 1
          └── submittedAt: Timestamp
```

---

## Testing the Game Loop

### Quick Test (5 minutes)

1. Create event, get code
2. Join event as admin
3. Join same event as player (different browser/window)
4. Click "Start Game"
5. Verify:
   - [ ] Player redirects to Question page
   - [ ] Timer counts down
   - [ ] When timer expires → Results appear
6. Click "Next Question"
7. Verify:
   - [ ] Next question appears immediately
   - [ ] No waiting

### Comprehensive Test

1. **Multiple Players:**
   - Open 3+ browser windows
   - Join same event
   - All should see same question simultaneously

2. **Manual Override:**
   - During results, click "Next Question" before timer expires
   - Should advance immediately

3. **Different Timers:**
   - Change `questionTimerSeconds` to 30 seconds
   - Change `resultsTimerSeconds` to 5 seconds
   - Start game
   - Verify timing matches your settings

4. **Reset Functionality:**
   - During any phase, click "Reset Game"
   - Confirm modal
   - Verify:
     - [ ] All answers deleted
     - [ ] Question index reset to 0
     - [ ] Status = "lobby"
     - [ ] Ready to start new game

---

## Code Examples

### Get Event Data

```javascript
import { useEvent } from "../features/event/useEvent"

function MyComponent({ eventId }) {
  const { event } = useEvent(eventId)
  
  console.log(event.status)                  // "question"
  console.log(event.questionTimerSeconds)    // 300
  console.log(event.resultsTimerSeconds)     // 10
}
```

### Update Admin Settings

```javascript
import { updateTimerDuration, updateResultsTimerDuration } from "../features/event/eventService"

// Set question timer to 120 seconds
await updateTimerDuration(eventId, 120)

// Set results timer to 5 seconds
await updateResultsTimerDuration(eventId, 5)
```

### Submit Answer

```javascript
import { submitAnswer } from "../features/game/gameService"

await submitAnswer(eventId, questionId, optionIndex, userId)
```

---

## Troubleshooting

### Problem: Questions change too fast

**Check:**
- [ ] Game.jsx handleTimerExpired has NO setTimeout
- [ ] Lobby.jsx handleTimerExpired is the ONLY setTimeout
- [ ] No hardcoded timer values (all from admin settings)

**Fix:** Verify Game.jsx code matches section "Key Implementation Details"

### Problem: Questions don't advance

**Check:**
- [ ] Lobby.jsx handleTimerExpired exists
- [ ] resultsTimerSeconds is set in admin settings
- [ ] Firestore connection working (check browser console)

**Fix:** Manually click "Next Question" to test if that works

### Problem: Timer doesn't count down

**Check:**
- [ ] GameTimer component is rendered in Lobby
- [ ] event.status === "question" condition is met
- [ ] phaseStartedAt timestamp exists in database

**Fix:** Refresh page and check browser console for errors

### Problem: Players not synchronized

**Check:**
- [ ] Firestore connection working
- [ ] Real-time listeners active (check Network tab)
- [ ] Event document has correct status value

**Fix:** Manually set status in Firebase console, should sync instantly

---

## Files Involved

| File | Role |
|------|------|
| `src/pages/AdminSettings.jsx` | Configure timers and game control |
| `src/pages/Lobby.jsx` | Master timer and auto-advance logic |
| `src/pages/Game.jsx` | Display questions and transition |
| `src/pages/Results.jsx` | Display vote counts |
| `src/components/GameTimer.jsx` | Visual countdown |
| `src/features/event/eventService.js` | Firestore operations |

---

## Quick Reference

### Game Loop Status Values

```
"lobby"   - Game not running, players in lobby
"question" - Question displaying, timer counting
"results" - Results showing, timer counting
```

### Timers

```
questionTimerSeconds: How long question displays (default 300s)
resultsTimerSeconds: How long results display (default 10s)
```

### Key Database Fields

```
event.status - Current game phase
event.currentQuestionIndex - Which question
event.phaseStartedAt - When current phase started
event.questionTimerSeconds - Admin-set question duration
event.resultsTimerSeconds - Admin-set results duration
event.showingResultsOnly - Results display flag
```

---

## Success Indicators ✅

- [ ] Questions display for exact duration (admin-configured)
- [ ] Results display for exact duration (admin-configured)
- [ ] No rapid question changes
- [ ] Auto-advance works automatically
- [ ] Manual override with "Next Question" works
- [ ] Multiple players stay synchronized
- [ ] Reset button clears all data
- [ ] Build passes (106 modules, 0 errors)

---

## Git History

**Commit:** `e5575e9` - "FIX: Implement single-timer game loop architecture"

**Changes:**
- Removed auto-advance setTimeout from Game.jsx
- Removed hardcoded 120000ms timer
- Removed unused Firebase imports
- Game.jsx now only handles UI, Lobby.jsx handles all timing

---

**Last Updated:** April 1, 2026  
**Status:** ✅ Production Ready  
**Branch:** develop

