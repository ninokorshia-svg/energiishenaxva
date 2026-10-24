export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type FormativeAssessment = 'საჭიროებს მხარდაჭერას' | 'დამოუკიდებელი' | 'გაფართოებული/შემოქმედებითი';

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: number;
  level: DifficultyLevel; // 5 easy (1 pt), 5 medium (2 pt), 5 hard (3 pt)
  points: number;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  imageUrl: string;
  imageAlt?: string;
  explanationCorrect: string;
  explanationIncorrect: string;
  conceptTag: 'მუშაობა' | 'სიმძლავრე' | 'კინეტიკური ენერგია' | 'პოტენციური ენერგია' | 'ენერგიის გარდაქმნა / მ.ქ.კ.';
}

export interface QuizConfig {
  id: string;
  topic: string;
  subject: string;
  grade: string;
  timeLimitMinutes: number;
  learningGoal: string;
  questions: QuizQuestion[];
}

export interface StudentAnswer {
  questionId: number;
  selectedOptionId: string;
  isCorrect: boolean;
  earnedPoints: number;
}

export interface StudentSubmission {
  id: string;
  teacherCode: string;
  studentNameOrNumber: string;
  authType: 'name' | 'number';
  deviceId: string;
  submittedAt: string;
  totalPoints: number; // max 30
  maxPoints: number;
  percentage: number;
  gradeOutOf10: number; // 6-10 scale
  formativeAssessment: FormativeAssessment;
  answers: StudentAnswer[];
  durationSeconds: number;
}

export interface TeacherSession {
  teacherCode: string; // e.g. Teachers1 .. Teachers100
  claimedAt: string;
  lastActiveAt: string;
  sessionId: string;
}
