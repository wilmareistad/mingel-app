# Pulse - Real-Time Multiplayer Quiz Application

Pulse is a real-time, interactive multiplayer quiz application built with React and Firebase. Admins create events with curated questions and manage the game flow in real-time, while participants join via QR code or event code and answer questions synchronously with live scoring.

[Visit the deployed site](https://pulse-rho-five.vercel.app/)

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [User Flows](#user-flows)
- [Game States](#game-states)
- [Admin Controls](#admin-controls)
- [Timer System](#timer-system)
- [Player Management](#player-management)
- [Theming](#theming)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## Features

### 🎮 Real-Time Multiplayer
- Live participant synchronization via Firestore listeners
- Instant vote updates
- Multi-device support (phones, tablets, desktops)
- Mobile optimized for on-the-go participation

### 🎯 Admin Controls
- Create events with custom or pre-made questions
- Configure timer durations for questions and results
- Manage participants in real-time (kick players)
- Manual controls to skip or pause questions
- Live answer tracking and response percentages

### ⏱️ Intelligent Timer System
- Server-based timestamps (prevent cheating)
- Automatic phase transitions
- Visual countdown displays
- Admin can manually override anytime

### 🎨 Theme System
- **YRGO Mode** - Professional blue and red theme
- **Matrix Mode** - Matrix-style lime green on black
- Applies to entire UI including buttons, controls, and modals

### 📱 Avatar System
- Customizable player avatars with 5 parts:
  - Hair, Eyes, Nose, Mouth, Skin Tone
- Multiple options per feature
- Visual representation in lobby

### 🔐 Smart Player Lifecycle
- Auto-remove on tab close or browser back
- 15-minute inactivity timeout (AFK kick)
- Kicked modal notification
- Session-based isolation (not shared across browser tabs)

### 📊 Results & Scoring
- Immediate score calculation
- Correct/incorrect answer breakdown
- Per-question results review

## How It Works

### For Admins

1. **Create Event** - Set name, select questions (curated or custom), configure timers
2. **Share Event Code** - Participants scan QR code or enter event code
3. **Monitor Lobby** - See participants joining in real-time
4. **Start Game** - Click "Start Game" to begin first question
5. **Manage Flow** - Auto-advance on timer expiry or manually click "Next"
6. **Kick Players** - Remove participants before/during game
7. **View Results** - See answer analytics

### For Participants

1. **Join Event** - Scan QR or enter event code, create avatar
2. **Enter Lobby** - Wait for admin to start game
3. **Answer Questions** - Submit answers during question phase
4. **View Results** - See results after each question
5. **Repeat** - Continue through all questions

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Firebase account with Firestore database
- Environment variables configured

### Installation

```bash
# Clone repository
git clone https://github.com/wilmareistad/mingel-app.git

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Configuration

Set up Firebase in `src/services/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Project Structure

```
src/
├── pages/                 # Page components
│   ├── Home.jsx          # Landing page
│   ├── Join.jsx          # Event join flow
│   ├── Lobby.jsx         # Participant waiting area
│   ├── Game.jsx          # Question answering interface
│   ├── Results.jsx       # Results display
│   ├── AdminPanel.jsx    # Admin event list
│   ├── AdminSettings.jsx # Main admin control panel
│   ├── AdminLobby.jsx    # Admin lobby view
│   ├── CreateEvent.jsx   # Event creation
│   ├── Login.jsx         # Admin authentication
│   ├── Tutorial.jsx      # Onboarding guide
│   ├── NotFound.jsx      # 404 page
│   └── EventGone.jsx     # Event deleted page
├── components/           # Reusable components
│   ├── Header.jsx        # Navigation header
│   ├── GameTimer.jsx     # Question countdown
│   ├── ResultsTimer.jsx  # Results countdown
│   ├── ParticipantsPanel.jsx # Player management
│   ├── GameControls.jsx  # Question phase controls
│   ├── ResultsControls.jsx # Results phase controls
│   ├── QuestionDisplay.jsx # Question renderer
│   ├── ResultsDisplay.jsx # Results renderer
│   ├── AvatarViewer.jsx  # Avatar customization
│   ├── ToggleButton.jsx  # Arrow buttons (lime green in Matrix Mode)
│   ├── TimerControl.jsx  # Timer adjustment
│   ├── KickedModal.jsx   # Kick notification
│   └── ConfirmModal.jsx  # Confirmation dialogs
├── features/            # Business logic
│   ├── event/          # Event management services
│   ├── game/           # Game logic
│   ├── question/       # Question management
│   ├── user/           # User/participant logic
│   ├── customQuestion/ # Custom question creation
│   ├── auth/           # Authentication
│   └── admin/          # Admin utilities
├── hooks/              # React hooks
│   ├── useAutoLeaveGame.js    # Auto-removal on navigation
│   ├── useAFKKick.js          # Inactivity timeout
│   ├── useTheme.js            # Theme application
│   ├── useAdminEvent.js       # Admin event loading
│   ├── useCurrentQuestion.js  # Question fetching
│   ├── useResultsTimer.js     # Results countdown logic
│   ├── useGameControls.js     # Admin game control logic
│   └── useTutorialVisited.js  # Tutorial tracking
├── config/             # Configuration
│   ├── themes.js       # Color themes (YRGO, Matrix)
│   ├── gameConfig.js   # Game settings
│   └── qrConfig.js     # QR code settings
├── services/           # Firebase and utilities
│   └── firebase.js     # Firebase initialization
├── styles/             # Global styles
│   ├── modalBase.module.css
│   ├── App.module.css
│   └── ...
└── assets/             # Images, icons, SVGs
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite |
| **State Management** | React Hooks (useState, useEffect, useRef) |
| **Routing** | React Router v6 |
| **Styling** | CSS Modules |
| **Database** | Firebase Firestore |
| **Real-time Updates** | Firestore Listeners (onSnapshot) |
| **Authentication** | Firebase Authentication |
| **QR Codes** | QR Code generation library |
| **Utilities** | nanoid (ID generation) |

## User Flows

### Admin Flow

```
Home Page
  ↓
[Manage Game] → Login (if not authenticated)
  ↓
Admin Panel (event list)
  ↓
Create Event → Configure Questions & Timers
  ↓
Admin Settings (main control panel)
  ├─ Lobby Phase: Share code, wait for players
  ├─ Question Phase: Monitor answers, see progress
  ├─ Results Phase: Show results, advance to next
  └─ Repeat until all questions answered
  ↓
Reset Event
```

### Participant Flow

```
Home Page
  ↓
[Join Game] → Scan QR or Enter Event Code
  ↓
Join Page (create avatar)
  ↓
Lobby (waiting for admin to start)
  ↓
[Admin starts]
  ↓
Game Page (answer question)
  ↓
Lobby (wait for results)
  ↓
Results Page (view results)
  ↓
[Repeat for next question]
  ↓
Final Results Page
```

## Game States

### Lobby State
- Participants wait for admin to start
- Admin configures questions and timers
- Event code visible for sharing
- Real-time participant list

### Question State
- Question displayed to all participants
- Countdown timer visible
- Participants select answer and submit
- Admin sees answer progress
- Duration: configurable (10s - 5min)

### Results State
- Correct answer highlighted
- Participant responses shown
- Points awarded displayed
- Countdown to next question
- Admin can manually advance
- Duration: configurable (5s - 5min)

## Admin Controls

### Before Game
- **Event Name** - Click to rename
- **Question Timer** - Set duration (10s to 5min)
- **Results Timer** - Set duration (5s to 5min)
- **Questions** - Add/remove questions
- **Custom Questions** - Create new questions
- **Start Game** - Begin first question

### During Game
- **Answer Count** - See how many answered
- **Next Question** - Manually advance (skips timer)
- **Kick Player** - Remove participant mid-game
- **Reset Game** - Start over with same questions

## Timer System

Timers use **server timestamps** (not client-side intervals) to prevent cheating and ensure synchronization:

```
Phase Timer = questionTimerSeconds
              OR
              resultsTimerSeconds

Remaining = Duration - (CurrentTime - PhaseStartedAt)

Expires When: Remaining ≤ 0
Auto-Action: Phase transition or manual override
```

### Why Server Timestamps?
✅ Prevents client-side timer manipulation  
✅ All devices stay in sync  
✅ Survives network interruptions  
✅ Accurate to server time  

## Player Management

### Auto-Remove Scenarios
1. **Tab/Browser Close** - `beforeunload` event triggers removal
2. **Navigation Away** - Detected by useLocation, redirect + remove
3. **Unauthorized Route** - Auto-kick from Firestore
4. **15-Min Inactivity** - AFK timeout kicks player
5. **Manual Kick** - Admin clicks "Kick Player"

### Kicked Modal
- Appears when user returns to lobby after being kicked
- Shows "You've Been Kicked" message
- Close button redirects to home

## Theming

### YRGO Mode (Default)
- **Primary Color**: Blue (#001A52)
- **Secondary**: Red (#FFB6D9)
- **Background**: White
- **Buttons**: Blue with white text

### Matrix Mode
- **Primary Color**: Lime Green (#00FF41)
- **Background**: Black
- **Text**: Lime green
- **Arrows**: Lime green
- **Kick Button**: Lime green with black text

### How to Switch
- Set event theme when creating event
- Applied globally via CSS variables
- Components automatically adapt colors

## Development

### Code Standards
- **Single Source of Truth**: Firestore is authoritative
- **Real-time Listeners**: Use onSnapshot, never poll
- **Server Timestamps**: All timers use serverTimestamp()
- **Session Storage**: Per-tab isolation (not localStorage)
- **Component Separation**: Display vs. Logic split

### Key Hooks
- `useAutoLeaveGame(eventId)` - Auto-remove on navigation
- `useAFKKick(eventId)` - 15-min inactivity timeout
- `useTheme(themeValue)` - Apply theme to DOM
- `useAdminEvent(eventId)` - Load admin event data
- `useCurrentQuestion(event)` - Fetch current question
- `useResultsTimer(event, eventId)` - Results countdown logic
- `useGameControls(eventId)` - Admin game actions

### Building
```bash
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

## Environment Variables

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## File Structure Reference

- **Pages** - Full-page components (routes in App.jsx)
- **Components** - Reusable UI pieces
- **Features** - Business logic organized by domain
- **Hooks** - React hooks for common patterns
- **Config** - App configuration and constants
- **Services** - External service integration
- **Styles** - Global and module CSS
- **Assets** - Images, icons, SVGs

## Contributing

- Follow existing code style
- Use CSS modules for scoped styling
- Add console.log with emoji prefixes for debugging
- Update related tests
- Reference Project Plan.md for architecture

## Related Files

- **Project Plan.md** - Detailed architecture and game loop documentation
- **Game Loop.md** - Specific game state flow diagrams
- **GAME_LOOP.md** - Visual state transition diagrams

---

**Repository**: [github.com/wilmareistad/mingel-app](https://github.com/wilmareistad/mingel-app)  
**Deploy Branch**: `main`  
**License**: MIT

