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

### Single Source of Truth: Admin Dashboard

All timing configuration happens via Admin Settings:
- `questionTimerSeconds` - How long each question displays (default: 300s)
- `resultsTimerSeconds` - How long results display (default: 10s)

### Game State Machine

```
LOBBY
  ↓ (Admin clicks "Start Game")
QUESTION (Timer: questionTimerSeconds)
  ├─ Players answer OR timer expires
  ↓
RESULTS (Timer: resultsTimerSeconds)
  ├─ If admin clicks "Next Question" → immediate advance
  ├─ If timer expires without admin action → auto-advance
  ↓
QUESTION (Next question)
  └─ Repeat until all questions answered
```

### Component Responsibilities

| Component | Role | Does NOT Do |
|-----------|------|-----------|
| **AdminSettings.jsx** | Configure timers, start/stop game | Handle auto-advance |
| **Lobby.jsx** | Listen to status, display countdown, auto-advance | Display questions |
| **Game.jsx** | Display questions, submit answers, transition to results | Handle advancement |
| **GameTimer.jsx** | Show visual countdown | Make decisions |
| **Results.jsx** | Display vote counts | Control timing |

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
Clears database:
  - Delete all answers
  - Reset all participants (hasAnswered = false)
  - Increment currentQuestionIndex
  - Set status = "question"
  
Players auto-navigate to /game/:eventId
  ↓
See next question
  ↓
Cycle repeats
```

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
    // ONLY transition to results
    // Lobby handles ALL advancement
    await setShowingResultsOnly(eventId, true)
    await updateEventStatus(eventId, "results")
  } catch (error) {
    console.error("Error handling timer expiration:", error)
  }
}
```

**Why this is correct:**
- Single responsibility: display questions, transition on timer
- No auto-advance logic
- No hardcoded timers

### Lobby.jsx - Master Controller

```javascript
const handleTimerExpired = async () => {
  if (!event) return
  
  if (event.status === "question") {
    // Transition to results
    await setShowingResultsOnly(eventId, true)
    await updateEventStatus(eventId, "results")
    
    // Get admin-configured timer
    const resultsTimerSeconds = event.resultsTimerSeconds || 10
    
    // Schedule auto-advance
    setTimeout(async () => {
      // Delete answers, increment question, set status = "question"
    }, resultsTimerSeconds * 1000)
  }
}
```

**Why this is correct:**
- Exclusive auto-advance handler
- Admin-controlled timing
- No conflicts

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
- Set on Admin Dashboard
- Range: 5-900 seconds
- Default: 300 seconds (5 minutes)

**Results Timer** (How long results display)
- Set on Admin Dashboard  
- Range: 5-60 seconds
- Default: 10 seconds

**When do changes take effect?**
- ✅ Immediately for NEXT question
- ❌ Current question timer already running

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

