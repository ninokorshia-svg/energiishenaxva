import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  BarChart3, 
  Edit3, 
  Printer, 
  Trash2, 
  Share2, 
  Copy, 
  Check, 
  Lock, 
  Unlock, 
  AlertCircle, 
  Search, 
  ExternalLink, 
  BookOpen, 
  Award, 
  ChevronRight, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  RefreshCw,
  Sparkles,
  HelpCircle,
  Plus,
  Save,
  RotateCcw,
  QrCode
} from 'lucide-react';
import { QuizConfig, QuizQuestion, StudentSubmission, FormativeAssessment } from '../types/quiz';
import { 
  claimTeacherCode, 
  releaseTeacherCode, 
  sendTeacherHeartbeat, 
  fetchTeacherSubmissions, 
  clearTeacherSubmissions, 
  updateQuizConfig, 
  resetQuizConfig,
  fetchTeachersStatus 
} from '../services/api';
import { DEFAULT_QUIZ } from '../data/defaultQuiz';
import { GEORGIAN_OPTION_LETTERS, cleanOptionText } from '../utils/storage';

interface TeacherDashboardProps {
  currentTeacherCode: string;
  sessionId: string;
  quiz: QuizConfig;
  onQuizUpdated: (newQuiz: QuizConfig) => void;
  onTeacherCodeChanged: (code: string) => void;
  onLogout: () => void;
  isAuthenticated: boolean;
  onAuthenticated: (code: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentTeacherCode,
  sessionId,
  quiz,
  onQuizUpdated,
  onTeacherCodeChanged,
  onLogout,
  isAuthenticated,
  onAuthenticated
}) => {
  // Input code state for login
  const [selectedCode, setSelectedCode] = useState(currentTeacherCode || 'Teachers1');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active view tab: 'journal' | 'analytics' | 'editor' | 'sharing'
  const [activeTab, setActiveTab] = useState<'journal' | 'analytics' | 'editor' | 'sharing'>('journal');

  // Live submissions
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [isPolling, setIsPolling] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | FormativeAssessment>('all');

  // Detailed student submission modal
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);

  // Colleague sharing list
  const [teachersStatus, setTeachersStatus] = useState<Array<{ code: string; isOccupied: boolean; submissionsCount: number }>>([]);

  // Copy state & QR Modal state
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showColleagueShareModal, setShowColleagueShareModal] = useState(false);
  const [copiedColleagueLink, setCopiedColleagueLink] = useState(false);
  const [copiedColleague, setCopiedColleague] = useState<string | null>(null);

  // Quiz Editor Local State
  const [editorConfig, setEditorConfig] = useState<QuizConfig>(quiz);
  const [editorSaveSuccess, setEditorSaveSuccess] = useState('');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  // Sync editor config when parent quiz changes
  useEffect(() => {
    setEditorConfig(quiz);
  }, [quiz]);

  // Real-time polling for submissions
  useEffect(() => {
    if (!isAuthenticated || !currentTeacherCode) return;

    let isMounted = true;

    const pollSubmissions = async () => {
      try {
        const subs = await fetchTeacherSubmissions(currentTeacherCode);
        if (isMounted) {
          setSubmissions(subs);
          setLastSyncTime(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.warn('Poll error:', err);
      }
    };

    pollSubmissions();
    const interval = setInterval(pollSubmissions, 2500); // 2.5s real-time poll
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, currentTeacherCode]);

  // Heartbeat to keep code locked
  useEffect(() => {
    if (!isAuthenticated || !currentTeacherCode) return;
    const interval = setInterval(() => {
      sendTeacherHeartbeat(currentTeacherCode, sessionId);
    }, 25000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentTeacherCode, sessionId]);

  // Fetch teachers status for colleague sharing
  const loadTeachersStatus = async () => {
    const list = await fetchTeachersStatus();
    setTeachersStatus(list);
  };

  useEffect(() => {
    if (activeTab === 'sharing') {
      loadTeachersStatus();
    }
  }, [activeTab]);

  // Login / Claim teacher code
  const handleClaim = async (codeToClaim: string) => {
    setIsLoggingIn(true);
    setLoginError('');

    const res = await claimTeacherCode(codeToClaim, sessionId);
    setIsLoggingIn(false);

    if (res.success && res.teacherCode) {
      onAuthenticated(res.teacherCode);
      if (res.quiz) {
        onQuizUpdated(res.quiz);
      }
    } else {
      setLoginError(res.error || 'ეს კოდი უკვე დაკავებულია!');
    }
  };

  // Logout / Release code
  const handleRelease = async () => {
    await releaseTeacherCode(currentTeacherCode, sessionId);
    onLogout();
  };

  // Clear submissions list ("სიის გასუფთავება")
  const handleClearList = async () => {
    if (window.confirm('დარწმუნებული ხართ, რომ გსურთ მოსწავლეთა ნამუშევრების სიის გასუფთავება?')) {
      const ok = await clearTeacherSubmissions(currentTeacherCode);
      if (ok) {
        setSubmissions([]);
      }
    }
  };

  // Save edited quiz
  const handleSaveQuiz = async () => {
    const ok = await updateQuizConfig(currentTeacherCode, editorConfig);
    if (ok) {
      onQuizUpdated(editorConfig);
      setEditorSaveSuccess('ქვიზის ცვლილებები წარმატებით შეინახა!');
      setTimeout(() => setEditorSaveSuccess(''), 4000);
    }
  };

  // Reset quiz to default 8th grade physics test
  const handleResetQuiz = async () => {
    if (window.confirm('გსურთ ქვიზის პირვანდელ ფიზიკის VIII კლასის შაბლონზე დაბრუნება?')) {
      const defaultQ = await resetQuizConfig(currentTeacherCode);
      if (defaultQ) {
        setEditorConfig(defaultQ);
        onQuizUpdated(defaultQ);
        setEditorSaveSuccess('ქვიზი დაუბრუნდა ნაგულისხმევ VIII კლასის ფიზიკის შაბლონს!');
        setTimeout(() => setEditorSaveSuccess(''), 4000);
      }
    }
  };

  // Copy student quiz link & colleague share link
  // Students access the quiz ONLY via this link generated by the teacher
  const studentLink = `${window.location.origin}/?code=${encodeURIComponent(currentTeacherCode)}&student=true`;
  const colleagueLink = `${window.location.origin}/?view=teacher&code=${encodeURIComponent(currentTeacherCode)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(studentLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyColleagueLink = () => {
    navigator.clipboard.writeText(colleagueLink);
    setCopiedColleagueLink(true);
    setTimeout(() => setCopiedColleagueLink(false), 2500);
  };

  // Print Ready handler
  const handlePrint = () => {
    window.print();
  };

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchesSearch = sub.studentNameOrNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel = levelFilter === 'all' || sub.formativeAssessment === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [submissions, searchQuery, levelFilter]);

  // Analytics Computations
  const analytics = useMemo(() => {
    const total = submissions.length;
    if (total === 0) {
      return {
        total: 0,
        avgScore: 0,
        avgGrade: 0,
        avgPercentage: 0,
        supportCount: 0,
        indepCount: 0,
        creativeCount: 0,
        conceptPerformance: {
          'მუშაობა': { correct: 0, total: 0 },
          'სიმძლავრე': { correct: 0, total: 0 },
          'კინეტიკური ენერგია': { correct: 0, total: 0 },
          'პოტენციური ენერგია': { correct: 0, total: 0 },
          'ენერგიის გარდაქმნა / მ.ქ.კ.': { correct: 0, total: 0 }
        }
      };
    }

    const totalPointsSum = submissions.reduce((sum, s) => sum + s.totalPoints, 0);
    const avgScore = Number((totalPointsSum / total).toFixed(1));
    const avgGrade = Number((submissions.reduce((sum, s) => sum + s.gradeOutOf10, 0) / total).toFixed(1));
    const avgPercentage = Math.round(submissions.reduce((sum, s) => sum + s.percentage, 0) / total);

    const supportCount = submissions.filter(s => s.formativeAssessment === 'საჭიროებს მხარდაჭერას').length;
    const indepCount = submissions.filter(s => s.formativeAssessment === 'დამოუკიდებელი').length;
    const creativeCount = submissions.filter(s => s.formativeAssessment === 'გაფართოებული/შემოქმედებითი').length;

    const conceptStats: Record<string, { correct: number; total: number }> = {
      'მუშაობა': { correct: 0, total: 0 },
      'სიმძლავრე': { correct: 0, total: 0 },
      'კინეტიკური ენერგია': { correct: 0, total: 0 },
      'პოტენციური ენერგია': { correct: 0, total: 0 },
      'ენერგიის გარდაქმნა / მ.ქ.კ.': { correct: 0, total: 0 }
    };

    submissions.forEach(sub => {
      sub.answers.forEach(ans => {
        const q = quiz.questions.find(item => item.id === ans.questionId);
        if (q && conceptStats[q.conceptTag]) {
          conceptStats[q.conceptTag].total += 1;
          if (ans.isCorrect) {
            conceptStats[q.conceptTag].correct += 1;
          }
        }
      });
    });

    return {
      total,
      avgScore,
      avgGrade,
      avgPercentage,
      supportCount,
      indepCount,
      creativeCount,
      conceptPerformance: conceptStats
    };
  }, [submissions, quiz]);

  // If NOT authenticated, show teacher code entry
  if (!isAuthenticated) {
    return (
      <main className="min-h-[85vh] bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0px_#0f172a]">
          
          <div className="w-16 h-16 mx-auto bg-purple-100 border-3 border-slate-900 rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_#0f172a] text-purple-700 mb-4">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-center text-slate-900 mb-2">
            მასწავლებლის ავტორიზაცია
          </h2>
          <p className="text-xs sm:text-sm text-center text-slate-600 font-medium mb-6">
            აირჩიეთ ან შეიყვანეთ თქვენი უნიკალური კოდი (Teachers1-დან Teachers100-მდე)
          </p>

          {loginError && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border-2 border-rose-600 text-rose-900 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-[2px_2px_0px_#e11d48]">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="teacher-code-select" className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                სწრაფი არჩევა სიიდან:
              </label>
              <select
                id="teacher-code-select"
                value={selectedCode}
                onChange={e => setSelectedCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-3 border-slate-900 font-bold text-slate-900 bg-white focus:outline-none focus:ring-4 focus:ring-purple-300 shadow-[2px_2px_0px_#0f172a]"
              >
                {Array.from({ length: 100 }, (_, i) => `Teachers${i + 1}`).map(code => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="teacher-code-input" className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                ან ჩაწერეთ კოდი ხელით:
              </label>
              <input
                id="teacher-code-input"
                type="text"
                value={selectedCode}
                onChange={e => setSelectedCode(e.target.value)}
                placeholder="მაგ: Teachers1"
                className="w-full px-4 py-3 rounded-xl border-3 border-slate-900 font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-purple-300 shadow-[2px_2px_0px_#0f172a]"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={isLoggingIn}
            onClick={() => handleClaim(selectedCode)}
            className="w-full py-3.5 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-base border-3 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:shadow-[2px_2px_0px_#0f172a] active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoggingIn ? (
              <span>მოწმდება სტატუსი...</span>
            ) : (
              <>
                <Unlock className="w-5 h-5" />
                <span>პანელში შესვლა</span>
              </>
            )}
          </button>

          <p className="mt-4 text-[11px] text-center text-slate-500 font-medium">
            სისტემა ავტომატურად ამოწმებს კოდის სტატუსს. დაკავებული კოდით შესვლა იზღუდება.
          </p>
        </div>
      </main>
    );
  }

  // Authenticated Teacher Dashboard
  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      
      {/* Top Banner & Control Center */}
      <section className="bg-white border-b-4 border-slate-900 pt-6 pb-6 px-4 sm:px-6 lg:px-8 no-print shadow-sm">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-purple-100 border-2 border-purple-700 text-purple-900 font-black text-xs uppercase tracking-wider">
                  მასწავლებლის მართვის პანელი
                </span>
                <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-100 border border-emerald-400 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  სინქრონიზაცია აქტიურია ({lastSyncTime || 'ახლა'})
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {quiz.topic}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                აქტიური მასწავლებელი: <strong className="text-purple-700 font-mono">{currentTeacherCode}</strong> • კლასი: {quiz.grade}
              </p>
            </div>

            {/* Quick Actions: Share, Link, Logout */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Copy Student Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
                title="მოსწავლისთვის გასაგზავნი ინდივიდუალური ლინკის კოპირება"
              >
                {copiedLink ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'ლინკი დაკოპირდა!' : 'მოსწავლის ლინკი'}</span>
              </button>

              {/* QR Code / Multi-device Join Modal Trigger */}
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                title="QR კოდი მოსწავლეების ტელეფონებიდან და სხვადასხვა მოწყობილობებიდან შესასვლელად"
              >
                <QrCode className="w-4 h-4" />
                <span>QR კოდი (მობილურებისთვის)</span>
              </button>

              {/* Colleague Share Link Button - Requested: "მასწავლებელს შეეძლოს თავისი ნამუშევრის კოლეგებთან გაზიარება ლინკით და ეს ღილაკი გამოუჩნდეს მასწავლებლის გვერდს" */}
              <button
                type="button"
                onClick={() => {
                  setShowColleagueShareModal(true);
                  handleCopyColleagueLink();
                }}
                className="px-3.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                title="ნამუშევრის კოლეგებთან გაზიარება ლინკით"
              >
                <Share2 className="w-4 h-4 text-violet-200" />
                <span>კოლეგებთან გაზიარება (ლინკით)</span>
              </button>

              {/* Print Ready Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>ამობეჭდვა</span>
              </button>

              {/* Clear List Button */}
              <button
                type="button"
                onClick={handleClearList}
                className="px-3 py-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 font-black text-xs sm:text-sm border-2 border-rose-600 shadow-[2px_2px_0px_#e11d48] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                title="მოსწავლეთა ნამუშევრების სიის გასუფთავება"
              >
                <Trash2 className="w-4 h-4 text-rose-700" />
                <span>სიის გასუფთავება</span>
              </button>

              {/* Logout / Release Code */}
              <button
                type="button"
                onClick={handleRelease}
                className="px-3 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs sm:text-sm border-2 border-slate-900 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>გამოსვლა</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs - Various Distinct Colors per requirement */}
          <div className="flex flex-wrap gap-2 pt-2 border-t-2 border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('journal')}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm border-2 border-slate-900 transition-all flex items-center gap-2 shadow-[2px_2px_0px_#0f172a] ${
                activeTab === 'journal'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>ჟურნალი ({submissions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm border-2 border-slate-900 transition-all flex items-center gap-2 shadow-[2px_2px_0px_#0f172a] ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white hover:bg-slate-100 text-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>ანალიტიკა და სამოქმედო გეგმა</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm border-2 border-slate-900 transition-all flex items-center gap-2 shadow-[2px_2px_0px_#0f172a] ${
                activeTab === 'editor'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-white hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>ტესტის რედაქტირება (15 კითხვა)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sharing')}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm border-2 border-slate-900 transition-all flex items-center gap-2 shadow-[2px_2px_0px_#0f172a] ${
                activeTab === 'sharing'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>კოლეგებისთვის გაზიარება</span>
            </button>
          </div>

        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* ================= TAB 1: JOURNAL (სია ნუმერაციით, დეტალური ნამუშევარი) ================= */}
        {activeTab === 'journal' && (
          <div className="space-y-6">
            
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 no-print">
              <div className="bg-white border-3 border-slate-900 rounded-2xl p-4 shadow-[3px_3px_0px_#0f172a]">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                  შემოსული ნამუშევარი
                </span>
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {analytics.total}
                </span>
              </div>

              <div className="bg-white border-3 border-slate-900 rounded-2xl p-4 shadow-[3px_3px_0px_#0f172a]">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                  საშუალო ქულა
                </span>
                <span className="text-2xl font-black text-indigo-700 font-mono">
                  {analytics.avgScore} / 30
                </span>
                <span className="text-[11px] text-slate-500 font-bold block mt-0.5">
                  ({analytics.avgPercentage}%)
                </span>
              </div>

              <div className="bg-white border-3 border-slate-900 rounded-2xl p-4 shadow-[3px_3px_0px_#0f172a]">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                  საშუალო ნიშანი
                </span>
                <span className="text-2xl font-black text-purple-700 font-mono">
                  {analytics.avgGrade} / 10
                </span>
                <span className="text-[11px] text-slate-500 font-bold block mt-0.5">
                  განმსაზღვრელი
                </span>
              </div>

              <div className="bg-white border-3 border-slate-900 rounded-2xl p-4 shadow-[3px_3px_0px_#0f172a]">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                  შემოქმედებითი / გაფართ.
                </span>
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {analytics.creativeCount}
                </span>
                <span className="text-[11px] text-slate-500 font-bold block mt-0.5">
                  მოსწავლე
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white border-3 border-slate-900 rounded-2xl p-4 shadow-[4px_4px_0px_#0f172a] flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ძიება სახელით ან ნომრით..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border-2 border-slate-900 font-bold text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-black text-slate-600 whitespace-nowrap">დონე:</span>
                <select
                  value={levelFilter}
                  onChange={e => setLevelFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border-2 border-slate-900 font-bold text-xs sm:text-sm text-slate-900 bg-white"
                >
                  <option value="all">ყველა დონე</option>
                  <option value="საჭიროებს მხარდაჭერას">საჭიროებს მხარდაჭერას</option>
                  <option value="დამოუკიდებელი">დამოუკიდებელი</option>
                  <option value="გაფართოებული/შემოქმედებითი">გაფართოებული/შემოქმედებითი</option>
                </select>
              </div>
            </div>

            {/* Submissions Table / Numbered List */}
            <div className="bg-white border-4 border-slate-900 rounded-3xl overflow-hidden shadow-[6px_6px_0px_#0f172a]">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-base">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>მოსწავლეთა ნამუშევრების ჟურნალი</span>
                </div>
                <span className="text-xs font-bold text-slate-300">
                  სულ: {filteredSubmissions.length} ჩანაწერი
                </span>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-slate-400 mb-3">
                    <Users className="w-7 h-7" />
                  </div>
                  <h3 className="font-black text-slate-800 text-lg mb-1">
                    ჯერჯერობით ნამუშევარი არ არის შემოსული
                  </h3>
                  <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                    გაუზიარეთ მოსწავლის ინდივიდუალური ლინკი კლასს ({currentTeacherCode}). მოსწავლის მიერ გაცემული პასუხები აქ მყისიერად გამოჩნდება.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-900 bg-slate-50 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">მოსწავლე (სახელი / ნომერი)</th>
                        <th className="py-3 px-4">დრო</th>
                        <th className="py-3 px-4">ქულა (30-დან)</th>
                        <th className="py-3 px-4">ნიშანი (6-10)</th>
                        <th className="py-3 px-4">განმავითარებელი შეფასება</th>
                        <th className="py-3 px-4 text-right no-print">მოქმედება</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm font-medium">
                      {filteredSubmissions.map((sub, index) => {
                        let badgeBg = 'bg-slate-100 text-slate-800 border-slate-300';
                        if (sub.formativeAssessment === 'გაფართოებული/შემოქმედებითი') {
                          badgeBg = 'bg-emerald-100 text-emerald-900 border-emerald-400';
                        } else if (sub.formativeAssessment === 'დამოუკიდებელი') {
                          badgeBg = 'bg-indigo-100 text-indigo-900 border-indigo-400';
                        } else {
                          badgeBg = 'bg-amber-100 text-amber-900 border-amber-400';
                        }

                        return (
                          <tr
                            key={sub.id}
                            onClick={() => setSelectedSubmission(sub)}
                            className="hover:bg-purple-50/60 cursor-pointer transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                              {index + 1}
                            </td>
                            <td className="py-3.5 px-4 font-extrabold text-slate-900 flex items-center gap-2">
                              <span>{sub.studentNameOrNumber}</span>
                              {sub.authType === 'number' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300">
                                  ჟურნალი
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                              {new Date(sub.submittedAt).toLocaleTimeString()}
                            </td>
                            <td className="py-3.5 px-4 font-black font-mono text-slate-900">
                              {sub.totalPoints} / {sub.maxPoints}
                              <span className="text-xs text-slate-500 font-normal ml-1">
                                ({sub.percentage}%)
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-block px-2.5 py-0.5 rounded-lg bg-indigo-50 border-2 border-indigo-600 text-indigo-900 font-black text-xs font-mono">
                                {sub.gradeOutOf10} / 10
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-block px-2.5 py-0.5 rounded-lg border text-xs font-black ${badgeBg}`}>
                                {sub.formativeAssessment}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right no-print">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubmission(sub);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs border border-purple-400 transition-colors inline-flex items-center gap-1"
                              >
                                <span>დეტალები</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================= TAB 2: ANALYTICS & ACTION PLAN (კლასის საერთო ანალიზი, სამოქმედო გეგმა, რუბრიკა) ================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            
            {/* Top Qualitative Summary */}
            <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#0f172a]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 border-2 border-slate-900 flex items-center justify-center text-blue-700">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    კლასის საერთო შედეგების ტექსტური ანალიზი
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    ავტომატური პედაგოგიური დიაგნოსტიკა და სინთეზი
                  </p>
                </div>
              </div>

              {submissions.length === 0 ? (
                <p className="text-sm text-slate-600 italic">
                  ანალიზის გენერირებისთვის საჭიროა მოსწავლეთა მინიმუმ ერთი ნამუშევარი.
                </p>
              ) : (
                <div className="space-y-4 text-sm text-slate-800 leading-relaxed font-medium">
                  <p>
                    VIII კლასის ფიზიკის შემაჯამებელი ტესტირება თემაზე <em>„მექანიკური მოვლენები — მუშაობა, სიმძლავრე, კინეტიკური და პოტენციური ენერგია“</em> ჩააბარა <strong>{analytics.total}</strong> მოსწავლემ.
                  </p>
                  
                  <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-4 space-y-2">
                    <p>
                      <strong>კლასის საერთო აკადემიური დონე:</strong> საშუალო მაჩვენებელი შეადგენს <strong>{analytics.avgScore} / 30 ქულას ({analytics.avgPercentage}%)</strong>, რაც შეესაბამება <strong>{analytics.avgGrade}</strong> სასკოლო ნიშანს 10-ქულიან სკალაზე.
                    </p>
                    <p>
                      <strong>დონეების განაწილება:</strong> 
                      მოსწავლეთა {Math.round((analytics.creativeCount / analytics.total) * 100)}% ({analytics.creativeCount} მოსწავლე) იმყოფება <em>„გაფართოებულ/შემოქმედებით“</em> დონეზე; 
                      {Math.round((analytics.indepCount / analytics.total) * 100)}% ({analytics.indepCount} მოსწავლე) — <em>„დამოუკიდებელ“</em> დონეზე; 
                      ხოლო {Math.round((analytics.supportCount / analytics.total) * 100)}% ({analytics.supportCount} მოსწავლე) — <em>„საჭიროებს მხარდაჭერას“</em> დონეზე.
                    </p>
                  </div>

                  <p>
                    <strong>საგნობრივი ძლიერი მხარეები და სირთულეები:</strong> საბაზო კითხვებზე (მექანიკური მუშაობისა და სიმძლავრის განსაზღვრება, SI ერთეულები) მოსწავლეთა უმრავლესობა ავლენს მყარ ცოდნას. ძირითადი გამოწვევები გამოვლინდა III დონის სააზროვნო ამოცანებში, კერძოდ: <em>მექანიკური ენერგიის შენახვის კანონის გამოყენება</em> და <em>ამწე მექანიზმის სასარგებლო მოქმედების კოეფიციენტის (მ.ქ.კ.)</em> გამოთვლა.
                  </p>
                </div>
              )}
            </div>

            {/* Concept Mastery Breakdown */}
            <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#0f172a]">
              <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                საგნობრივი ცნებების დაუფლების დონე (კონცეპტუალური ბარათები):
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(analytics.conceptPerformance).map(([tag, stat]) => {
                  const percent = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                  let colorClass = 'bg-slate-50 border-slate-300';
                  let barColor = 'bg-slate-400';
                  if (stat.total > 0) {
                    if (percent >= 80) {
                      colorClass = 'bg-emerald-50 border-emerald-400';
                      barColor = 'bg-emerald-500';
                    } else if (percent >= 55) {
                      colorClass = 'bg-amber-50 border-amber-400';
                      barColor = 'bg-amber-500';
                    } else {
                      colorClass = 'bg-rose-50 border-rose-400';
                      barColor = 'bg-rose-500';
                    }
                  }

                  return (
                    <div key={tag} className={`p-4 rounded-2xl border-2 ${colorClass}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                          {tag}
                        </span>
                        <span className="font-black font-mono text-xs">
                          {stat.total > 0 ? `${percent}%` : 'მონაცემი არაა'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                        <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        სწორი: {stat.correct} / {stat.total} პასუხი
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Teacher Action Plan (მასწავლებლისთვის სამოქმედო გეგმა) */}
            <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#0f172a]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border-2 border-slate-900 flex items-center justify-center text-amber-800">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    მასწავლებლისთვის სამოქმედო გეგმა (შემდეგი გაკვეთილებისთვის)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    დიფერენცირებული სწავლებისა და კომპენსატორული აქტივობების რუკა
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-800 font-medium">
                <div className="border-l-4 border-amber-500 pl-4 py-1">
                  <h4 className="font-black text-slate-900">ნაბიჯი 1: შეცდომების ერთობლივი დისკუსია</h4>
                  <p className="text-slate-600 mt-0.5">
                    განსაკუთრებული ყურადღება დაეთმოს კითხვა #10 (კინეტიკური ენერგიისა და სიჩქარის კვადრატული დამოკიდებულება) და #15 (სრული და სასარგებლო სიმძლავრის განსხვავება მ.ქ.კ.-ის გაანგარიშებაში).
                  </p>
                </div>

                <div className="border-l-4 border-indigo-500 pl-4 py-1">
                  <h4 className="font-black text-slate-900">ნაბიჯი 2: დიფერენცირებული ჯგუფური მუშაობა</h4>
                  <p className="text-slate-600 mt-0.5">
                    <strong>ჯგუფი A (მხარდაჭერის საჭიროება):</strong> პრაქტიკული სავარჯიშოები ფორმულების მარტივ გარდაქმნაზე (A = F·s, N = A/t) ვიზუალური ბარათებით.<br />
                    <strong>ჯგუფი B (დამოუკიდებელი):</strong> ორნაბიჯიანი ამოცანები ენერგიის შენახვაზე (mgh = mv²/2).<br />
                    <strong>ჯგუფი C (გაფართოებული):</strong> რეალური ჰიდროელექტროსადგურებისა და ამწე მექანიზმების ენერგოეფექტურობის გამოთვლა.
                  </p>
                </div>

                <div className="border-l-4 border-emerald-500 pl-4 py-1">
                  <h4 className="font-black text-slate-900">ნაბიჯი 3: ფორმატიული შეფასების ინდივიდუალური უკუკავშირი</h4>
                  <p className="text-slate-600 mt-0.5">
                    თითოეულ მოსწავლეს გადაეცეს მათი ინდივიდუალური ბარათი ქვიზის განმარტებებით და მიეცეთ შესაძლებლობა ახსნან საკუთარი მსჯელობის ლოგიკა.
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendations Rubric (რეკომენდაციების რუბრიკა) */}
            <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#0f172a]">
              <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                რეკომენდაციების რუბრიკა დონეების მიხედვით
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="p-4 rounded-2xl border-3 border-amber-400 bg-amber-50">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-black text-[11px] uppercase mb-2">
                    საჭიროებს მხარდაჭერას (0–59%)
                  </span>
                  <h4 className="font-black text-slate-900 text-sm mb-1.5">საბაზო საფეხური</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    საჭიროებს მუდმივ მითითებებს ფორმულების შერჩევისას. რეკომენდაცია: დამხმარე ფორმულების შპარგალკა, ერთეულების გარდაქმნის დამატებითი ტრენაჟორი, მარტივი ერთსვლიანი ამოცანების განმეორება.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border-3 border-indigo-400 bg-indigo-50">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-200 text-indigo-900 font-black text-[11px] uppercase mb-2">
                    დამოუკიდებელი (60–84%)
                  </span>
                  <h4 className="font-black text-slate-900 text-sm mb-1.5">საშუალო საფეხური</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    თავისუფლად ფლობს საბაზო კანონებს, თუმცა უჭირს რამდენიმე ეტაპიანი ამოცანების კომპლექსური გადაწყვეტა. რეკომენდაცია: ამოცანის ალგორითმული დაშლა და ენერგიის გადაცემის ჯაჭვის ჩაწერა.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border-3 border-emerald-400 bg-emerald-50">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 font-black text-[11px] uppercase mb-2">
                    გაფართოებული (85–100%)
                  </span>
                  <h4 className="font-black text-slate-900 text-sm mb-1.5">მაღალი საფეხური</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    ავლენს ღრმა კონცეპტუალურ გაგებას, ადვილად ხსნის თვისობრივ და რაოდენობრივ ამოცანებს. რეკომენდაცია: ოლიმპიური ტიპის ამოცანები და საპროექტო კვლევითი აქტივობები (მაგ. მზისა და ქარის ენერგია).
                  </p>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ================= TAB 3: QUIZ EDITOR (ტესტის რედაქტირება, 15 კითხვა, ილუსტრაციები) ================= */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            
            <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#0f172a]">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    ქვიზის შინაარსის რედაქტირება (დინამიკური კონტენტი)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    აქ შეგიძლიათ შეცვალოთ თემა, 15-ვე კითხვა (5 მარტივი, 5 საშუალო, 5 რთული), სავარაუდო პასუხები და ილუსტრაციების ბმულები.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetQuiz}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs border-2 border-slate-900 transition-all flex items-center gap-1.5"
                    title="ნაგულისხმევი 8-ე კლასის ფიზიკის ტესტის აღდგენა"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ნაგულისხმევის აღდგენა</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveQuiz}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>შენახვა</span>
                  </button>
                </div>
              </div>

              {editorSaveSuccess && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-100 border-2 border-emerald-600 text-emerald-950 font-black text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>{editorSaveSuccess}</span>
                </div>
              )}

              {/* General Topic Form */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 p-4 bg-slate-50 rounded-2xl border-2 border-slate-900">
                <div className="sm:col-span-2">
                  <label htmlFor="editor-topic-input" className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    ტესტის თემა:
                  </label>
                  <input
                    id="editor-topic-input"
                    type="text"
                    value={editorConfig.topic}
                    onChange={e => setEditorConfig({ ...editorConfig, topic: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-900 font-bold text-sm bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="editor-grade-input" className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    კლასი / ასაკი:
                  </label>
                  <input
                    id="editor-grade-input"
                    type="text"
                    value={editorConfig.grade}
                    onChange={e => setEditorConfig({ ...editorConfig, grade: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-900 font-bold text-sm bg-white"
                  />
                </div>
              </div>

              {/* Question Selector Tabs (15 Questions: 1-5 Easy, 6-10 Medium, 11-15 Hard) */}
              <div className="mb-6">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  აირჩიეთ კითხვა რედაქტირებისთვის (სულ 15 საკითხი):
                </label>
                <div className="flex flex-wrap gap-2">
                  {editorConfig.questions.map((q, idx) => {
                    const isSelected = idx === selectedQuestionIndex;
                    let tagColor = 'bg-emerald-100 text-emerald-900 border-emerald-400';
                    if (q.level === 'medium') tagColor = 'bg-amber-100 text-amber-900 border-amber-400';
                    if (q.level === 'hard') tagColor = 'bg-rose-100 text-rose-900 border-rose-400';

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setSelectedQuestionIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 border-slate-900 transition-all ${
                          isSelected ? 'bg-slate-900 text-white ring-2 ring-purple-400 scale-105' : tagColor
                        }`}
                      >
                        #{idx + 1} ({q.points}ქ)
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Question Editor */}
              {editorConfig.questions[selectedQuestionIndex] && (() => {
                const q = editorConfig.questions[selectedQuestionIndex];

                const handleUpdateQ = (updates: Partial<QuizQuestion>) => {
                  const updatedQuestions = [...editorConfig.questions];
                  updatedQuestions[selectedQuestionIndex] = { ...q, ...updates };
                  setEditorConfig({ ...editorConfig, questions: updatedQuestions });
                };

                const handleUpdateOption = (optIndex: number, text: string) => {
                  const updatedOptions = [...q.options];
                  updatedOptions[optIndex] = { ...updatedOptions[optIndex], text };
                  handleUpdateQ({ options: updatedOptions });
                };

                return (
                  <div className="bg-slate-50 border-3 border-slate-900 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 text-sm">
                        კითხვა #{selectedQuestionIndex + 1} რედაქტირება ({q.level === 'easy' ? 'I დონე - 1 ქულა' : q.level === 'medium' ? 'II დონე - 2 ქულა' : 'III დონე - 3 ქულა'})
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        სირთულე: {q.level}
                      </span>
                    </div>

                    {/* Question text */}
                    <div>
                      <label htmlFor="editor-question-prompt" className="block text-xs font-black text-slate-700 mb-1">
                        კითხვის ტექსტი:
                      </label>
                      <textarea
                        id="editor-question-prompt"
                        value={q.question}
                        rows={2}
                        onChange={e => handleUpdateQ({ question: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-900 font-bold text-sm bg-white"
                      />
                    </div>

                    {/* Image URL & Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      <div className="sm:col-span-9">
                        <label htmlFor="editor-image-url" className="block text-xs font-black text-slate-700 mb-1">
                          უფასო ილუსტრაციის ბმული (Unsplash, Pexels, etc.):
                        </label>
                        <input
                          id="editor-image-url"
                          type="url"
                          value={q.imageUrl}
                          onChange={e => handleUpdateQ({ imageUrl: e.target.value })}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full px-3 py-2 rounded-xl border-2 border-slate-900 font-mono text-xs bg-white"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <span className="block text-xs font-black text-slate-700 mb-1">
                          ნახატის გადახედვა:
                        </span>
                        <div className="h-16 rounded-xl border-2 border-slate-900 overflow-hidden bg-slate-200">
                          {q.imageUrl ? (
                            <img src={q.imageUrl} alt="ილუსტრაცია" className="w-full h-full object-cover" />
                          ) : (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400">სურათი არაა</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 4 Options */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-2">
                        სავარაუდო პასუხები (მონიშნეთ სწორი რადიო ღილაკით):
                      </label>
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = opt.id === q.correctOptionId;
                          return (
                            <div key={opt.id} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct_opt_${q.id}`}
                                checked={isCorrect}
                                onChange={() => handleUpdateQ({ correctOptionId: opt.id })}
                                className="w-4 h-4 accent-emerald-600 cursor-pointer"
                              />
                              <span className="w-6 font-mono font-black text-xs text-slate-600">
                                {GEORGIAN_OPTION_LETTERS[optIdx] || String.fromCharCode(65 + optIdx)}:
                              </span>
                              <input
                                type="text"
                                value={opt.text}
                                onChange={e => handleUpdateOption(optIdx, e.target.value)}
                                className={`flex-1 px-3 py-1.5 rounded-xl border-2 font-bold text-sm bg-white ${
                                  isCorrect ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black' : 'border-slate-300'
                                }`}
                              />
                              {isCorrect && (
                                <span className="text-xs font-black text-emerald-700 whitespace-nowrap">
                                  ✓ სწორი
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Formative Feedback Explanations */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="editor-explanation-correct" className="block text-xs font-black text-emerald-800 mb-1">
                          განმარტება სწორ პასუხზე:
                        </label>
                        <textarea
                          id="editor-explanation-correct"
                          value={q.explanationCorrect}
                          rows={2}
                          onChange={e => handleUpdateQ({ explanationCorrect: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border-2 border-emerald-600 font-medium text-xs bg-emerald-50/50"
                        />
                      </div>
                      <div>
                        <label htmlFor="editor-explanation-incorrect" className="block text-xs font-black text-rose-800 mb-1">
                          მინიშნება/განმარტება შეცდომაზე:
                        </label>
                        <textarea
                          id="editor-explanation-incorrect"
                          value={q.explanationIncorrect}
                          rows={2}
                          onChange={e => handleUpdateQ({ explanationIncorrect: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border-2 border-rose-600 font-medium text-xs bg-rose-50/50"
                        />
                      </div>
                    </div>

                  </div>
                );
              })()}

            </div>

          </div>
        )}

        {/* ================= TAB 4: SHARING WITH COLLEAGUES (კოლეგებისთვის გაზიარება) ================= */}
        {activeTab === 'sharing' && (
          <div className="space-y-6">
            
            <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#0f172a]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-teal-100 border-2 border-slate-900 flex items-center justify-center text-teal-700">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    კოლეგებისთვის გაზიარება და კოდების სტატუსი
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    მასწავლებელს შეუძლია გაუზიაროს აპლიკაცია კოლეგას, რათა მან გამოიყენოს სხვა თავისუფალი კოდი (TeachersY).
                  </p>
                </div>
              </div>

              {/* Instructions Box */}
              <div className="bg-teal-50 border-2 border-teal-700 rounded-2xl p-4 mb-6 text-xs sm:text-sm text-teal-950 space-y-2">
                <p>
                  თქვენი მიმდინარე აქტიური კოდია: <strong>{currentTeacherCode}</strong>.
                </p>
                <p>
                  თუ თქვენი კოლეგა გეგმავს პარალელურ კლასში ტესტირების ჩატარებას, მან უნდა აირჩიოს ნებისმიერი ქვემოთ მითითებული <strong>თავისუფალი კოდი</strong> (მწვანე სტატუსით), რათა შედეგები ერთმანეთს არ გადაეჭდოს.
                </p>
              </div>

              {/* Available vs Occupied Codes Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-sm">
                    სისტემაში რეგისტრირებული კოდები (Teachers1 – Teachers100):
                  </h3>
                  <button
                    type="button"
                    onClick={loadTeachersStatus}
                    className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>განახლება</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 max-h-96 overflow-y-auto p-2 border-2 border-slate-200 rounded-2xl">
                  {teachersStatus.map(t => {
                    const isSelf = t.code === currentTeacherCode;
                    return (
                      <div
                        key={t.code}
                        className={`p-2.5 rounded-xl border-2 text-xs flex flex-col justify-between gap-1.5 ${
                          isSelf
                            ? 'bg-purple-100 border-purple-600 text-purple-950 font-black'
                            : t.isOccupied
                            ? 'bg-rose-50 border-rose-300 text-rose-800 font-medium'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold hover:bg-emerald-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono">{t.code}</span>
                          <span className={`w-2 h-2 rounded-full ${
                            isSelf ? 'bg-purple-600' : t.isOccupied ? 'bg-rose-500' : 'bg-emerald-500'
                          }`} />
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {isSelf ? 'თქვენი კოდი' : t.isOccupied ? 'დაკავებულია' : 'თავისუფალია'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* ================= QR CODE & MULTI-DEVICE JOIN MODAL ================= */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white border-4 border-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-[8px_8px_0px_#0f172a] text-center">
            
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="text-left">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 border border-indigo-400 text-indigo-900 font-black text-xs uppercase">
                  მრავალმოწყობილობიანი წვდომა
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  მოსწავლეთა მოწვევა
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-xl border-2 border-slate-900 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium mb-5 text-left">
              მოსწავლეებს შეუძლიათ გახსნან ტესტი საკუთარი მობილური ტელეფონებიდან, ტაბლეტებიდან ან კომპიუტერიდან კამერის მიშვერით:
            </p>

            {/* QR Code Container */}
            <div className="p-4 bg-slate-50 border-3 border-slate-900 rounded-2xl inline-block shadow-[4px_4px_0px_#0f172a] mb-5">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(studentLink)}`}
                alt="QR კოდი მოსწავლეებისთვის"
                className="w-52 h-52 mx-auto rounded-lg"
              />
            </div>

            <div className="bg-amber-50 border-2 border-amber-500 rounded-xl p-3 mb-4 text-left space-y-1">
              <span className="text-[11px] font-black text-amber-900 uppercase block">
                პირდაპირი ლინკი მოსწავლეებისთვის:
              </span>
              <p className="text-xs font-mono text-slate-800 break-all bg-white p-2 rounded border border-amber-300 font-bold select-all">
                {studentLink}
              </p>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'ლინკი დაკოპირდა!' : 'ლინკის კოპირება'}</span>
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.share({
                      title: 'VIII კლასის ფიზიკის ტესტირება',
                      text: `გამარჯობა მოსწავლეებო, შედით ბმულზე და გაიარეთ VIII კლასის ფიზიკის ტესტი:`,
                      url: studentLink
                    }).catch(() => {});
                  }}
                  className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm border-2 border-slate-900 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-4 h-4" />
                  <span>გაგზავნა (Share)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm border-2 border-slate-900 cursor-pointer"
              >
                დახურვა
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= COLLEAGUE SHARE MODAL (ნამუშევრის კოლეგებთან გაზიარება ლინკით) ================= */}
      {showColleagueShareModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white border-4 border-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-[8px_8px_0px_#0f172a]">
            
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-100 border-2 border-slate-900 flex items-center justify-center text-violet-700 shadow-[2px_2px_0px_#0f172a]">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-lg bg-violet-100 border border-violet-400 text-violet-900 font-black text-[11px] uppercase">
                    პედაგოგთა თანამშრომლობა
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">
                    ნამუშევრის კოლეგებთან გაზიარება
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowColleagueShareModal(false)}
                className="w-8 h-8 rounded-xl border-2 border-slate-900 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 font-medium mb-4 leading-relaxed">
              ეს ლინკი თქვენს კოლეგას საშუალებას აძლევს პირდაპირ შევიდეს მასწავლებლის პანელში, იხილოს თქვენ მიერ შედგენილი 15-ვე დავალება, კლასის საერთო ანალიტიკა და სამოქმედო გეგმა.
            </p>

            {/* Link Box */}
            <div className="bg-violet-50 border-2 border-violet-600 rounded-2xl p-4 mb-5 space-y-2">
              <div className="flex justify-between items-center text-xs font-black text-violet-950">
                <span>კოლეგისთვის გასაგზავნი ლინკი:</span>
                {copiedColleagueLink && (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    დაკოპირებულია!
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-900 break-all bg-white p-2.5 rounded-xl border border-violet-300 select-all font-bold">
                {colleagueLink}
              </p>
            </div>

            {/* Features Info Box */}
            <div className="bg-slate-50 border-2 border-slate-900 rounded-xl p-3.5 mb-5 space-y-2 text-xs font-medium text-slate-700">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                <p>კოლეგა შეძლებს თქვენი ტესტის შინაარსის (15 დავალების) სრულ გაცნობას.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                <p>კოლეგას შეუძლია გამოიყენოს სხვა თავისუფალი კოდი (მაგ: Teachers2) და იგივე ტესტი ჩაატაროს თავის კლასში.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleCopyColleagueLink}
                className="flex-1 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedColleagueLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedColleagueLink ? 'ლინკი დაკოპირდა!' : 'ლინკის კოპირება'}</span>
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.share({
                      title: 'VIII კლასის ფიზიკის ტესტი და ანალიტიკა',
                      text: `გამარჯობა, გიზიარებთ VIII კლასის ფიზიკის ტესტს: ${quiz.topic}`,
                      url: colleagueLink
                    }).catch(() => {});
                  }}
                  className="py-3 px-4 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-950 font-black text-xs sm:text-sm border-2 border-slate-900 cursor-pointer flex items-center gap-1.5"
                >
                  <Share2 className="w-4 h-4" />
                  <span>გაზიარება</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowColleagueShareModal(false)}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm border-2 border-slate-900 cursor-pointer"
              >
                დახურვა
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= DETAILED SUBMISSION MODAL (ნამუშევრის დეტალური დათვალიერება) ================= */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-4 border-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-[8px_8px_0px_#0f172a]">
            
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 border border-indigo-400 text-indigo-900 font-black text-xs">
                  მოსწავლის ნაშრომის დეტალური ბარათი
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  {selectedSubmission.studentNameOrNumber}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  თარიღი: {new Date(selectedSubmission.submittedAt).toLocaleString()} • ხანგრძლივობა: {Math.floor(selectedSubmission.durationSeconds / 60)} წუთი
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="w-8 h-8 rounded-xl border-2 border-slate-900 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-black"
              >
                ✕
              </button>
            </div>

            {/* Score summary in modal */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-50 border-2 border-slate-900 rounded-xl p-3 text-center">
                <span className="text-[11px] font-black text-slate-500 uppercase block">ქულა</span>
                <span className="text-xl font-black text-slate-900 font-mono">
                  {selectedSubmission.totalPoints} / {selectedSubmission.maxPoints}
                </span>
              </div>
              <div className="bg-indigo-50 border-2 border-indigo-700 rounded-xl p-3 text-center">
                <span className="text-[11px] font-black text-indigo-800 uppercase block">ნიშანი</span>
                <span className="text-xl font-black text-indigo-700 font-mono">
                  {selectedSubmission.gradeOutOf10} / 10
                </span>
              </div>
              <div className="bg-emerald-50 border-2 border-emerald-700 rounded-xl p-3 text-center">
                <span className="text-[11px] font-black text-emerald-800 uppercase block">დონე</span>
                <span className="text-xs font-black text-emerald-900 block mt-1">
                  {selectedSubmission.formativeAssessment}
                </span>
              </div>
            </div>

            {/* Answers breakdown */}
            <div className="space-y-3 mb-6">
              <h4 className="font-black text-slate-900 text-sm">
                პასუხები საკითხების მიხედვით (15 კითხვა):
              </h4>

              {quiz.questions.map((q, idx) => {
                const ans = selectedSubmission.answers.find(a => a.questionId === q.id);
                const isCorrect = ans?.isCorrect || false;
                const chosenOpt = q.options.find(o => o.id === ans?.selectedOptionId);
                const correctOpt = q.options.find(o => o.id === q.correctOptionId);

                return (
                  <div
                    key={q.id}
                    className={`p-3.5 rounded-xl border-2 ${
                      isCorrect ? 'bg-emerald-50/70 border-emerald-400' : 'bg-rose-50/70 border-rose-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-slate-900">
                        #{idx + 1}. {q.question}
                      </span>
                      <span className={`px-2 py-0.5 rounded ${
                        isCorrect ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                      }`}>
                        {isCorrect ? `+${q.points}ქ` : '0ქ'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 space-y-0.5">
                      <p>
                        არჩეული: <span className={isCorrect ? 'text-emerald-800 font-bold' : 'text-rose-800 font-bold'}>{chosenOpt ? cleanOptionText(chosenOpt.text) : 'არაა მონიშნული'}</span>
                      </p>
                      {!isCorrect && (
                        <p className="text-slate-500">
                          სწორი იყო: <span className="text-emerald-800 font-bold">{correctOpt ? cleanOptionText(correctOpt.text) : ''}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                დახურვა
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= PRINT READY VIEW (მხოლოდ ამობეჭდვის დროს გამოსატანი) ================= */}
      <div className="hidden print-only p-8 text-black bg-white">
        <h1 className="text-2xl font-black mb-2">VIII კლასის ფიზიკის ტესტირების შედეგები</h1>
        <p className="text-sm mb-4">
          თემა: {quiz.topic} • მასწავლებლის კოდი: {currentTeacherCode} • თარიღი: {new Date().toLocaleDateString()}
        </p>

        <div className="mb-6 border-b-2 border-black pb-4">
          <p className="font-bold">სტატისტიკა: სულ მოსწავლე: {analytics.total} | საშუალო ქულა: {analytics.avgScore}/30 | საშუალო ნიშანი: {analytics.avgGrade}/10</p>
        </div>

        <table className="w-full text-left border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-200 border-b border-black">
              <th className="p-2 border-r border-black">#</th>
              <th className="p-2 border-r border-black">მოსწავლე</th>
              <th className="p-2 border-r border-black">ქულა (30)</th>
              <th className="p-2 border-r border-black">ნიშანი (10)</th>
              <th className="p-2">განმავითარებელი შეფასება</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s, idx) => (
              <tr key={s.id} className="border-b border-black">
                <td className="p-2 border-r border-black">{idx + 1}</td>
                <td className="p-2 border-r border-black font-bold">{s.studentNameOrNumber}</td>
                <td className="p-2 border-r border-black">{s.totalPoints} / {s.maxPoints}</td>
                <td className="p-2 border-r border-black">{s.gradeOutOf10}</td>
                <td className="p-2">{s.formativeAssessment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </main>
  );
};
