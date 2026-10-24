import { QuizConfig, StudentSubmission } from '../types/quiz';
import { DEFAULT_QUIZ } from '../data/defaultQuiz';

export async function fetchQuizSession(teacherCode: string): Promise<{
  teacherCode: string;
  quiz: QuizConfig;
  active: boolean;
  totalSubmissions: number;
}> {
  try {
    const res = await fetch(`/api/session/${encodeURIComponent(teacherCode)}`);
    if (!res.ok) {
      throw new Error('სესიის ჩატვირთვა ვერ მოხერხდა');
    }
    return await res.json();
  } catch (err) {
    console.warn('Backend fetch fallback to default quiz:', err);
    return {
      teacherCode,
      quiz: DEFAULT_QUIZ,
      active: true,
      totalSubmissions: 0
    };
  }
}

export async function claimTeacherCode(teacherCode: string, sessionId: string): Promise<{
  success: boolean;
  teacherCode?: string;
  quiz?: QuizConfig;
  submissionsCount?: number;
  error?: string;
}> {
  try {
    const res = await fetch('/api/teacher/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherCode, sessionId })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'კოდის გააქტიურება ვერ მოხერხდა' };
    }
    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ქსელის შეცდომა';
    return { success: false, error: `სერვერთან კავშირის შეცდომა: ${message}` };
  }
}

export async function sendTeacherHeartbeat(teacherCode: string, sessionId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/teacher/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherCode, sessionId })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function releaseTeacherCode(teacherCode: string, sessionId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/teacher/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherCode, sessionId })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function updateQuizConfig(teacherCode: string, quizConfig: QuizConfig): Promise<boolean> {
  try {
    const res = await fetch('/api/teacher/update-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherCode, quizConfig })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function resetQuizConfig(teacherCode: string): Promise<QuizConfig | null> {
  try {
    const res = await fetch('/api/teacher/reset-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherCode })
    });
    if (res.ok) {
      const data = await res.json();
      return data.quiz;
    }
  } catch {
    // fallback
  }
  return DEFAULT_QUIZ;
}

export async function checkStudentStatus(
  teacherCode: string,
  deviceId: string,
  studentNameOrNumber: string
): Promise<{ isBlocked: boolean; submission?: StudentSubmission; message?: string }> {
  try {
    const res = await fetch('/api/student/check-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherCode, deviceId, studentNameOrNumber })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Status check warning:', err);
  }
  return { isBlocked: false };
}

export async function submitStudentQuiz(payload: {
  teacherCode: string;
  studentNameOrNumber: string;
  authType: 'name' | 'number';
  deviceId: string;
  answers: Array<{ questionId: number; selectedOptionId: string }>;
  durationSeconds: number;
}): Promise<{ success: boolean; submission?: StudentSubmission; error?: string }> {
  try {
    const res = await fetch('/api/student/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'ტესტის გაგზავნა ვერ მოხერხდა', submission: data.submission };
    }
    return { success: true, submission: data.submission };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ქსელის შეცდომა';
    return { success: false, error: `სერვერის შეცდომა: ${message}` };
  }
}

export async function fetchTeacherSubmissions(teacherCode: string): Promise<StudentSubmission[]> {
  try {
    const res = await fetch(`/api/teacher/submissions/${encodeURIComponent(teacherCode)}`);
    if (res.ok) {
      const data = await res.json();
      return data.submissions || [];
    }
  } catch (err) {
    console.warn('Failed to fetch submissions:', err);
  }
  return [];
}

export async function clearTeacherSubmissions(teacherCode: string): Promise<boolean> {
  try {
    const res = await fetch('/api/teacher/clear-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherCode })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchTeachersStatus(): Promise<Array<{ code: string; isOccupied: boolean; submissionsCount: number }>> {
  try {
    const res = await fetch('/api/teachers/status');
    if (res.ok) {
      const data = await res.json();
      return data.teachers || [];
    }
  } catch {
    // fallback
  }
  return [];
}
