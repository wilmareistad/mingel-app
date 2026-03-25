# Game Loop Implementation - Complete Guide

## Quick Start (TL;DR)

The game loop is **fully implemented and working**. Here's how to use it:

### User Flow
1. Create event at `/create`
2. Join with code at `/join`
3. You're in `/lobby/:eventId` (listens for game start)
4. When `event.status === "question"` → auto-redirect to `/game/:eventId`
5. Answer question → auto-redirect back to `/lobby/:eventId`
6. Repeat for each question

### Test the Loop
- **Create Event**: Go to `/create`
- **Join**: Go to `/join`, enter code & username
- **Trigger Question**: Firebase Console → events/{id} → `status` = `"question"`
- **See Game**: Should redirect to `/game/:eventId`
- **Trigger Lobby**: Firebase Console → events/{id} → `status` = `"lobby"`
- **See Lobby**: Should redirect back

## Architecture Overview

### Single Source of Truth: Firestore
All game state lives in **one event document**:
```javascript
events/{eventId}
├── status: "lobby" | "question" | "results" | "paused"
├── currentQuestionIndex: 0
├── questions: ["q1", "q2", "q3"]
├── code: "AFKJ"
├── name: "Pizza"
└── phaseStartedAt: Timestamp
```

### Real-Time Listeners (onSnapshot)
- **Lobby.jsx** listens to `event.status`
  - If `status === "question"` → navigate to `/game/:eventId`
- **Game.jsx** listens to `event.status`
  - If `status !== "question"` → navigate to `/lobby/:eventId`
- No polling. Changes sync instantly across all devices.

### Feature Structure
```
src/features/
├── event/
│   ├── eventService.js      (Firestore listeners & updates)
│   └── useEvent.js          (React hook for event data)
├── user/
│   ├── userService.js       (User data listeners)
│   └── useUser.js           (React hook for current user)
├── question/
│   └── questionService.js   (Load questions, format as Agree/Disagree)
└── game/
    └── gameService.js       (Submit answers, prevent duplicates)
```

## How It Works

### 1. Event Status State Machine
```
"lobby" → (Admin clicks Start) → "question"
                                    ↓
                          (Question timer ends)
                                    ↓
                               "results"
                                    ↓
                          (Results timer ends)
                                    ↓
                               "lobby" (next Q)
```

### 2. Auto-Navigation Logic
```javascript
// In Lobby.jsx
if (event.status === "question") {
  navigate(`/game/${eventId}`);
}

// In Game.jsx
if (event.status !== "question") {
  navigate(`/lobby/${eventId}`);
}
```

### 3. Answer Flow
```
User clicks answer
     ↓
submitAnswer() writes to Firestore
     ↓
Answer recorded in answers collection
     ↓
User auto-redirects to Lobby
     ↓
Wait for next question
```

## Code Examples

### Import the Hooks
```javascript
import { useEvent } from "../features/event/useEvent";
import { useUser } from "../features/user/useUser";

function MyComponent({ eventId }) {
  const { event } = useEvent(eventId);
  const { user } = useUser();
  
  console.log(event.status);      // "lobby", "question", etc
  console.log(user.username);     // "Player 1"
}
```

### Load a Question
```javascript
import { getCurrentQuestion } from "../features/question/questionService";

const question = await getCurrentQuestion(eventId, currentQuestionIndex);
console.log(question.text);      // "Work from home is good"
console.log(question.options);   // ["Agree", "Disagree"]
```

### Submit an Answer
```javascript
import { submitAnswer } from "../features/game/gameService";

await submitAnswer(eventId, questionId, optionIndex, userId);
// Answer is now in Firestore answers collection
```

### Update Event Status (Admin Only)
```javascript
import { updateEventStatus } from "../features/event/eventService";

await updateEventStatus(eventId, "question");
// All listening clients see status change instantly
// Lobby pages auto-redirect to Game
```

## Firebase Data Model

### Event Document
```
events/{eventId}
├── code: "AFKJ" (string)
├── name: "Pizza" (string)
├── status: "question" (string)
├── currentQuestionIndex: 0 (number)
├── questions: ["q1", "q2"] (array)
├── createdAt: Timestamp
└── phaseStartedAt: Timestamp
```

### Question Document
```
questions/{questionId}
├── id: "q1" (string)
├── text: "Work from home is good" (string)
├── options: ["Agree", "Disagree"] (array)
└── category: "workplace" (string)
```

### User Document
```
users/{userId}
├── username: "Player 1" (string)
├── eventId: "{eventId}" (string)
└── createdAt: Timestamp
```

### Answer Document
```
answers/{answerId}
├── eventId: "{eventId}" (string)
├── questionId: "q1" (string)
├── userId: "{userId}" (string)
├── optionIndex: 0 (number)
└── submittedAt: Timestamp
```

## Testing the Game Loop

### Setup
1. Create event → get code
2. Join with code → join lobby
3. Open second browser tab and join same event (different username)

### Test Status Changes
1. In Firebase, change `status` from `"lobby"` to `"question"`
2. Both tabs should auto-redirect to Game
3. Both tabs should see same question
4. Click answer on Tab 1 → redirects to Lobby
5. Tab 2 can still answer
6. Change `status` to `"lobby"` in Firebase
7. Tab 2 should redirect to Lobby

### Verify Data in Firestore
After answering:
- Check `answers` collection
- Should have documents with your userId, questionId, optionIndex

## Creating Test Questions

### In Firebase Console
1. Create collection: `questions`
2. Add document with ID `q1`:
```json
{
  "text": "Work from home is good",
  "options": ["Agree", "Disagree"],
  "category": "workplace"
}
```

### Link to Event
1. Go to `events/{eventId}`
2. Add field `questions` (array)
3. Add element: `"q1"`
4. Add field `currentQuestionIndex` (number): `0`

## Key Functions Reference

### Event Management
```javascript
useEvent(eventId)              // Hook: get event data
updateEventStatus(id, status)  // Update game phase
updateCurrentQuestionIndex(id, index)  // Move to next question
listenToEvent(id, callback)    // Manual listener
```

### User Management
```javascript
useUser()                       // Hook: get current user from localStorage
listenToUser(userId, callback)  // Manual listener
listenToEventUsers(eventId, callback)  // Get all users in event
```

### Question Management
```javascript
getCurrentQuestion(eventId, index)        // Load current question
getQuestion(questionId)                   // Load any question
getQuestionsByCategory(category)          // Filter by category
getEventQuestions(eventId)                // Get all event questions
```

### Game Management
```javascript
submitAnswer(eventId, questionId, optionIndex, userId)  // Record vote
hasUserAnswered(userId, questionId)       // Check for duplicates
getQuestionAnswers(questionId)            // Get all answers for Q
calculateResults(questionId, optionCount) // Calculate vote counts
```

## Common Issues & Solutions

### Issue: "No question available"
**Cause**: Event missing `questions` array or `currentQuestionIndex`
**Fix**: 
1. Go to Firebase → events/{eventId}
2. Add field `questions` (array) with value `["q1"]`
3. Add field `currentQuestionIndex` (number) with value `0`

### Issue: Answer click doesn't work
**Cause**: User not loading (userId not in localStorage)
**Fix**:
1. Make sure you properly joined with `/join`
2. Check localStorage has `userId`
3. Verify user document exists in Firebase

### Issue: No redirect to Game when status changes
**Cause**: Listener not detecting status change
**Fix**:
1. Verify `status` field exists in event document
2. Refresh the page
3. Check browser console for errors

### Issue: Stuck on Game page, can't redirect back
**Cause**: Status still "question" after answering
**Fix**: Manually change `status` in Firebase to `"results"` or `"lobby"`

## Next Steps

### For Testing
- [ ] Create multiple events
- [ ] Join with multiple users
- [ ] Test status transitions
- [ ] Verify answers recorded in Firestore

### For Production
- [ ] Build AdminPanel.jsx (Start/Pause/Stop buttons)
- [ ] Add Results.jsx page
- [ ] Implement auto-timer
- [ ] Add UI styling
- [ ] Add animations

### AdminPanel TODO
The admin panel should:
1. Show current game status
2. Show connected players count
3. Buttons: Start, Pause, Resume, Stop
4. Auto-advance on timers
5. Track answers submitted

See code examples in `src/features/` for implementation details.

## File Status

### ✅ Created & Working
- `src/features/event/` - Event listeners & updates
- `src/features/user/` - User data management
- `src/features/question/` - Question loading (Agree/Disagree format)
- `src/features/game/` - Answer submission & tracking
- `src/pages/Lobby.jsx` - Auto-redirect to Game
- `src/pages/Game.jsx` - Show question, handle answers
- `src/App.jsx` - Routes configured

### 📋 Still To Build
- `src/pages/AdminPanel.jsx` - Game controls
- `src/pages/Results.jsx` - Vote visualization
- `src/components/Timer.jsx` - Countdown timer
- Styling & animations

## Important Notes

1. **Real-Time Sync**: All changes to event.status sync instantly via Firestore listeners
2. **Single Event at a Time**: Each event has its own questions, users, and answers
3. **Anonymous Voting**: User IDs are stored but votes are anonymous
4. **Prevent Duplicates**: `hasUserAnswered()` prevents users from voting twice
5. **Firebase = Source of Truth**: Don't store game state in React - always read from Firestore

## Example: Complete Test Flow

```bash
# 1. Create Event
POST /create
Input: "Test Event"
Output: Code "ABCD"

# 2. Setup Question in Firebase
questions/q1 = {text: "Question?", options: ["Agree", "Disagree"]}
events/xxx = {code: "ABCD", status: "lobby", questions: ["q1"], currentQuestionIndex: 0}

# 3. Join User 1
GET /join
Input: Code "ABCD", Name "Alice"
Output: Redirect to /lobby/xxx

# 4. Join User 2
GET /join
Input: Code "ABCD", Name "Bob"
Output: Redirect to /lobby/xxx

# 5. Start Game
Firebase: events/xxx → status = "question"
Output: Both users auto-redirect to /game/xxx

# 6. Alice Answers
Click "Agree"
Output: Alice redirects to /lobby/xxx
Firestore: answers/{id} = {userId: alice, questionId: q1, optionIndex: 0}

# 7. Bob Answers
Click "Disagree"
Output: Bob redirects to /lobby/xxx
Firestore: answers/{id} = {userId: bob, questionId: q1, optionIndex: 1}

# 8. End Question
Firebase: events/xxx → status = "results"
Output: Both users see results (when Results.jsx is built)

# 9. Next Question
Firebase: events/xxx → currentQuestionIndex = 1, status = "lobby"
Output: Both users back in /lobby/xxx ready for next question
```

---

# Game Loop Files - TLDR

## **Features Directory**

### `event/`
- **`eventService.js`** - Listens to Firestore event document in real-time. When status changes, all clients get notified instantly.
- **`useEvent.js`** - React hook that wraps eventService. Returns `{ event, loading, error }` for use in components.

### `question/`
- **`questionService.js`** - Fetches questions from Firestore. Gets the current question based on event's question array and currentQuestionIndex.

### `user/`
- **`userService.js`** - Listens to current user's data from Firestore (username, userId, etc).
- **`useUser.js`** - React hook that wraps userService. Returns `{ user, loading, error }`.

### `game/`
- **`gameService.js`** - Submits answers to Firestore answers subcollection and checks if user already answered (prevents duplicates).

## **Game.jsx**
The main game page. Loads the current question, checks if user already answered, and handles answer submission. When answer is submitted, redirects user back to lobby. Also watches event status - if it changes from "question" to anything else, redirects to lobby. 🎮
