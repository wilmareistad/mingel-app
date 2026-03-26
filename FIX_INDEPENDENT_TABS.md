# Fixed: Independent Tab Answers & Question Deletion Issues

## Issues Fixed

### 1. **Total Votes Only Showing 1 (Independent Tabs Not Working)**

**Root Cause:** The `hasAnswered` flag in participants was being set globally and never reset between questions. Once a user answered any question, their `hasAnswered` remained `true`, preventing them from answering subsequent questions.

**Solution:** 
- Added `resetParticipantsAnswered(eventId)` call when triggering a new question
- This resets all participants' `hasAnswered` flags to `false` before showing the question
- Now each user can answer each question independently

**Code Change:**
```javascript
// OLD: Just changed status
await updateDoc(doc(db, "events", eventId), {
  status: "question"
});

// NEW: Reset answers first
await resetParticipantsAnswered(eventId);  // ← NEW
await updateDoc(doc(db, "events", eventId), {
  status: "question"
});
```

### 2. **Question Index Stuck After Deletion**

**Root Cause:** Questions are fetched dynamically and sorted by ID. If you delete a question, the index shifts but the event's `currentQuestionIndex` wasn't updated, causing it to point to a different question than before.

**Solution:**
- Question now returns `totalQuestions` and `currentIndex` in metadata
- Game page displays "Question X of Y" indicator so you can see what's happening
- If you delete questions from Firebase, the index will now load the correct sorted question

**Example:**
- If you had: q1, q2, q3 sorted as [q1, q2, q3]
- Delete q1: Now sorted as [q2, q3]
- Index 0 now points to q2 (showing "Question 1 of 2")
- This is by design - the index is positional, not tied to a specific question ID

## Changes Made

### `src/pages/Lobby.jsx`
- Added import of `resetParticipantsAnswered`
- Updated `handleTestQuestion()` to call `resetParticipantsAnswered(eventId)` before changing status

### `src/features/question/questionService.js`
- Enhanced `getCurrentQuestion()` to return `totalQuestions` and `currentIndex` in response
- Helps track question progression

### `src/pages/Game.jsx`
- Added question counter: "Question X of Y"
- Shows current question index and total available questions
- Makes it obvious when questions are added/deleted

## Testing

### Test Case 1: Independent Tabs
1. Open two tabs with two different users
2. Click "TEST: Trigger Question" in Lobby
3. Both users go to Game page
4. **User 1 answers** → Should see confirmation and return to Lobby
5. **User 2 should still be able to answer** (not stuck, not redirected)
6. Lobby shows "Answers: 2/2 participants"
7. ✅ Expected: Both users can answer independently

### Test Case 2: Question Deletion
1. Create event with questions: q1, q2, q3
2. Trigger question (shows q1, "Question 1 of 3")
3. Delete q1 from Firebase
4. Trigger next question (shows q2, "Question 1 of 2")
5. ✅ Expected: Index updates correctly as questions are sorted

## Key Insight

**Questions are indexed by position, not by ID:**
- Index 0 = first question when sorted alphabetically by ID
- If you delete questions, indices shift to maintain positional ordering
- This is intentional - it allows you to manage questions freely

If you want specific question ordering, recommend naming them:
- `q01_question1`, `q02_question2`, `q03_question3` 
- This ensures they sort in the order you want
