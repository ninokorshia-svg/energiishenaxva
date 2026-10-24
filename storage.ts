import type { QuizQuestion, QuizOption } from '../types/quiz';

// Device and session helpers

export function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem('quiz_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem('quiz_device_id', deviceId);
    }
    return deviceId;
  } catch {
    return 'dev_fallback_' + Date.now();
  }
}

export function getTeacherSessionId(): string {
  try {
    let sessId = sessionStorage.getItem('teacher_session_id');
    if (!sessId) {
      sessId = 'sess_' + Math.random().toString(36).substring(2, 12);
      sessionStorage.setItem('teacher_session_id', sessId);
    }
    return sessId;
  } catch {
    return 'sess_fallback_' + Date.now();
  }
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const GEORGIAN_OPTION_LETTERS = ['ა', 'ბ', 'გ', 'დ'];

export function cleanOptionText(text: string): string {
  if (!text) return '';
  // Removes leading 'ა)', 'ბ)', 'A)', '1)' etc.
  return text.replace(/^[ა-ჰa-zA-Z0-9][\)\.]\s*/, '').trim();
}

export interface RandomizedQuestion extends QuizQuestion {
  shuffledOptions: QuizOption[];
}

/**
 * Randomizes both questions order AND ensures that the correct options
 * are evenly and unpredictably distributed among all 4 choices (ა, ბ, გ, დ)
 * on every quiz attempt.
 */
export function randomizeQuizQuestions(questions: QuizQuestion[]): RandomizedQuestion[] {
  // 1. Thoroughly shuffle the order of questions
  const shuffledQuestions = shuffleArray(questions);

  // 2. Distribute correct answer positions evenly among 0, 1, 2, 3 (ა, ბ, გ, დ)
  const numQuestions = shuffledQuestions.length;
  const targetPositions: number[] = [];
  for (let i = 0; i < numQuestions; i++) {
    targetPositions.push(i % 4);
  }
  const shuffledPositions = shuffleArray(targetPositions);

  return shuffledQuestions.map((q, qIndex) => {
    const correctOpt = q.options.find(o => o.id === q.correctOptionId);
    const incorrectOpts = shuffleArray(q.options.filter(o => o.id !== q.correctOptionId));

    const targetPos = shuffledPositions[qIndex] % (q.options.length || 4);

    // Place correct option at targetPos, and others around it
    const finalOptions: QuizOption[] = [];
    let incIdx = 0;
    for (let pos = 0; pos < q.options.length; pos++) {
      if (pos === targetPos && correctOpt) {
        finalOptions.push(correctOpt);
      } else if (incIdx < incorrectOpts.length) {
        finalOptions.push(incorrectOpts[incIdx++]);
      } else if (correctOpt && !finalOptions.includes(correctOpt)) {
        finalOptions.push(correctOpt);
      }
    }

    return {
      ...q,
      shuffledOptions: finalOptions
    };
  });
}
