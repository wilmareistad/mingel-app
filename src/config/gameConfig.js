/**
 * Game Configuration
 * Centralized constants for timers, themes, and game constraints
 * Update these values to affect the entire application
 */

// ── Timer Options (in seconds) ──────────────────────────────────────
export const QUESTION_TIMER_OPTIONS = [
  5, 10, 30, 60, 90, 120, 180, 240, 300, 360, 420,
  480, 540, 600, 660, 720, 780, 840, 900,
];

export const RESULTS_TIMER_OPTIONS = [
  5, 10, 30, 60, 90, 120, 180, 240, 300, 360, 420,
  480, 540, 600, 660, 720, 780, 840, 900,
];

export const DEFAULT_QUESTION_TIMER = 120; // seconds
export const DEFAULT_RESULTS_TIMER = 30; // seconds

// ── Game Constraints ───────────────────────────────────────────────
export const MAX_PARTICIPANTS = 200;
export const MAX_QUESTIONS = 100;
export const MIN_QUESTIONS = 1;

// ── Default Game Settings ──────────────────────────────────────────
export const DEFAULT_GAME_SETTINGS = {
  questionTimerSeconds: DEFAULT_QUESTION_TIMER,
  resultsTimerSeconds: DEFAULT_RESULTS_TIMER,
};

// ── Firebase Cost Estimates ────────────────────────────────────────
// These are for reference and optimization planning
// export const FIREBASE_DAILY_WRITE_LIMIT = 50_000;
// export const WRITE_COST_PER_GAME = {
//   players_100: {
//     questions_15: 4_560,
//     description: "100 players, 15 questions",
//   },
// };
