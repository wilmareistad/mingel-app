# Dynamic Question Loading Architecture

## What Changed

The game no longer requires a static list of questions in the event document. Instead, it **fetches questions dynamically** from the database every time.

### Before (Static):
```javascript
// Event document in Firestore
{
  name: "My Event",
  questions: ["q1", "q2", "q3"],        // ← Static list
  currentQuestionIndex: 0,
  // ...
}

// Game would load question from this list
const questionId = event.questions[0];  // Get "q1"
const question = await getQuestion(questionId);
```

### After (Dynamic):
```javascript
// Event document in Firestore
{
  name: "My Event",
  currentQuestionIndex: 0,               // ← No questions array
  // ...
}

// Game fetches all questions from the database, sorted by ID
const allQuestions = await getDocs(collection(db, "questions"));
const question = allQuestions[0];       // Get first question from sorted list
```

## Benefits

✅ **Automatic Updates** - Add new questions to database, they appear in the game immediately  
✅ **No Button Needed** - No "Add Questions to Event" button required  
✅ **Consistent Ordering** - Questions sorted alphabetically by ID  
✅ **Simpler Event Creation** - Events don't need to manage a questions array  
✅ **Scalable** - Works with any number of questions  

## How It Works

1. **Create Event** - Just set `currentQuestionIndex: 0` (no questions array)
2. **Trigger Question** - Event status changes to "question"
3. **Load Question** - `getCurrentQuestion()` fetches all questions from database and returns the one at the current index
4. **Question Ordering** - Questions are sorted alphabetically by ID
   - "q1", "q10", "q2", "q3" → "q1", "q2", "q3", "q10"

## Changes Made

### ✅ `src/features/question/questionService.js`
- **`getCurrentQuestion(eventId, questionIndex)`** - Refactored to:
  - Fetch all questions from `questions` collection
  - Sort by ID alphabetically
  - Return the question at the given index
  - **No longer reads from event's questions array**

### ✅ `src/pages/CreateEvent.jsx`
- Removed `questions: []` from event creation
- Event now only has `currentQuestionIndex: 0`

### ✅ `src/pages/Lobby.jsx`
- Removed "ADD ALL QUESTIONS TO EVENT" button
- Removed `handleAddQuestions` function
- Removed import of `addAllQuestionsToEvent`

### ❌ Deleted
- `src/features/question/eventQuestionService.js` - No longer needed

## Testing

1. Add questions to Firebase (q1, q2, q3, etc.)
2. Create an event
3. Click "TEST: Trigger Question"
4. You should see the question from the database

**No buttons to click, no static lists to maintain - just dynamic loading!**

## Question Ordering

Questions are sorted by ID alphabetically. If you want specific ordering:
- Name your questions: `q01`, `q02`, `q03` instead of `q1`, `q2`, `q3`
- Or add an `order` field to questions and sort by that

Current implementation sorts by ID, so naming matters.
