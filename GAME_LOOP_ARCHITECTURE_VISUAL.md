# Game Loop Architecture - Visual Guide

## Before (BROKEN) ❌

```
                          CONFLICT!
                            ↙ ↖
        ┌─────────────────────┬─────────────────────┐
        │                     │                     │
    GAME.jsx              LOBBY.jsx           Admin Dashboard
    (Timer 1)             (Timer 2)           (Controls)
        │                     │                     │
    setTimeout             handleTimer         Settings:
    120000ms (2min)        + resultsTimer      - questionTimerSeconds
        │                     │                     │
        ├─────────────────────┼─────────────────────┤
        │                     │                     │
        └─> Auto-advance ◄────┴─> Auto-advance     │
                ↓                       ↓          │
            (After 2 min)        (After 10 sec)  │
                                                  │
            RESULT: CONFLICT - Questions jump!  │
                                                  │
                    ❌ Admin settings ignored
```

## After (FIXED) ✅

```
┌──────────────────────────────────────────────────┐
│         ADMIN DASHBOARD (Single Source)          │
│     - questionTimerSeconds: 300 (5 min)         │
│     - resultsTimerSeconds: 10 (10 sec)          │
└────────────────────┬─────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ↓                         ↓
    LOBBY.jsx               GAME.jsx
    (Master)               (Simple)
        │                     │
        │                     ├─ Display Q on Game page
        ├─ Show countdown     ├─ On timer expire:
        ├─ On timer expire:   │  └─> Set status: "results"
        │  ├─> Set status:    │  └─> That's it!
        │  │   "results"      │
        │  ├─> Wait 10 sec    │
        │  └─> Auto-advance   │
        │      (or wait for   │
        │       manual click)  │
        │                     │
        └─────────────────────┘
               ONE TIMER
              EVERYTHING
             CONTROLLED HERE


    ✅ No conflicts
    ✅ Admin settings respected
    ✅ Predictable behavior
```

## Game Loop State Machine (FIXED) ✅

```
                    START GAME
                       │
                       ↓
            ╔═══════════════════════╗
            ║  QUESTION PHASE       ║
            ║  Status: "question"   ║
            ║  Display: /game page  ║
            ║  Timer: questionTimer ║
            ║         Seconds       ║
            ╚═══════════════════════╝
                       │
                       │ (User answers or timer expires)
                       ↓
            ╔═══════════════════════╗
            ║  RESULTS PHASE        ║
            ║  Status: "results"    ║
            ║  Display: /results    ║
            ║  Timer: resultsTimer  ║
            ║         Seconds       ║
            ╚═══════════════════════╝
                       │
        ┌──────────────┴──────────────┐
        │                             │
    Results Timer            Admin Click
    Expires?                 "Next Question"?
        │                             │
        ├─→ YES ─→ Auto-advance ←─ NO ←─┤
        │                             │
        └──────────────┬──────────────┘
                       │
                       ↓
        ╔═══════════════════════╗
        ║  Delete Answers       ║
        ║  Reset Participants   ║
        ║  Increment Question   ║
        ║  Status: "question"   ║
        ╚═══════════════════════╝
                       │
                       │ (LOOP BACK)
                       ↓
           [QUESTION PHASE] ← Loop continues
```

## Code Responsibility

```
┌─────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD (AdminSettings.jsx)                    │
│  • questionTimerSeconds = 300 seconds default           │
│  • resultsTimerSeconds = 10 seconds default             │
│  • "Start Game" button                                  │
│  • "Next Question" button                               │
│  • "Reset Game" button                                  │
└──────────────────────────────────────┬──────────────────┘
                                       │
                                       ↓
┌──────────────────────────────────────────────────────────┐
│  LOBBY.jsx (Master Controller)                          │
│  ├─ handleTimerExpired()                                │
│  │  ├─ Transition to results                            │
│  │  ├─ setTimeout(resultsTimerSeconds)                  │
│  │  └─ Auto-advance OR wait for manual click            │
│  │                                                      │
│  └─ GameTimer component (Visual feedback)               │
│     ├─ Shows countdown                                  │
│     └─ Calls handleTimerExpired on 0                    │
└──────────────────────────────────────┬──────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ↓                          ↓                          ↓
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  GAME.jsx           │  │  RESULTS.jsx        │  │  GAMETIMER.jsx      │
│  (Question Display) │  │  (Results Display)  │  │  (Visual Timer)     │
│                     │  │                     │  │                     │
│ • handleTimerEx...  │  │ • Shows vote counts │  │ • Countdown display │
│   └─ When timer=0:  │  │ • Auto-navigates    │  │ • Calls callback at │
│     └─ Set results  │  │   when status OK    │  │   time=0            │
│                     │  │                     │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
        ↑                        ↑                        ↑
        └────────────────────────┴────────────────────────┘
         All controlled by Lobby.js timing
```

## Data Flow During Game

```
USER STARTS GAME
       │
       ↓
    Admin: "Start Game"
       │
       ↓
    Lobby: currentQuestionIndex = 0
    Lobby: status = "question"
       │
       ↓
    Game Page: Loads Q0, displays on screen
       │
       ↓
    Lobby's GameTimer: Starts countdown (300s)
       │
       ├─ If player answers before timer expires:
       │  └─ Redirect to /lobby (simple!)
       │
       └─ If timer reaches 0:
          └─ Lobby: handleTimerExpired()
             ├─ status = "results"
             ├─ showingResultsOnly = true
             ├─ setTimeout(10000)
             │
             └─ After 10 seconds:
                ├─ Delete all answers
                ├─ currentQuestionIndex++
                ├─ status = "question"
                └─ Loop back to Game Page


RESULT: SMOOTH, PREDICTABLE GAME FLOW ✅
```

## Key Points

### ✅ What Works Now
- Questions display for full duration without interruption
- Results display for configured duration
- Auto-advance is smooth and predictable
- Admin can override auto-advance with manual click
- No timer conflicts
- Admin settings are respected

### ❌ What No Longer Happens
- Rapid question succession
- Conflicting timers
- Hardcoded 2-minute wait
- Admin settings being ignored
- Unpredictable game behavior

### 🎮 From Player Perspective
1. See question
2. Have time to answer (200-600 seconds, admin-controlled)
3. Click answer → Redirected to lobby
4. See results (10 seconds, admin-controlled)
5. See next question automatically
6. Repeat until all questions done

### 👨‍💼 From Admin Perspective
1. Click "Start Game"
2. Game runs automatically using dashboard timers
3. Can click "Next Question" to override auto-advance
4. Can click "End Game" to stop
5. Can click "Reset Game" to start over
6. Full control via Admin Dashboard

