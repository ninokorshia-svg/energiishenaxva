import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Award, 
  HelpCircle, 
  AlertCircle, 
  Sparkles, 
  Clock, 
  BookOpen, 
  GraduationCap, 
  Lock,
  Layers,
  ChevronRight,
  Flame,
  Lightbulb
} from 'lucide-react';
import { QuizConfig, QuizQuestion, QuizOption, StudentSubmission, FormativeAssessment } from '../types/quiz';
import { 
  randomizeQuizQuestions, 
  GEORGIAN_OPTION_LETTERS, 
  cleanOptionText, 
  RandomizedQuestion 
} from '../utils/storage';
import { checkStudentStatus, submitStudentQuiz } from '../services/api';

interface StudentQuizProps {
  quiz: QuizConfig;
  teacherCode: string;
  deviceId: string;
  onStudentIdentified?: (ident: string) => void;
}

export const StudentQuiz: React.FC<StudentQuizProps> = ({
  quiz,
  teacherCode,
  deviceId,
  onStudentIdentified
}) => {
  // Step: 'welcome' | 'quiz' | 'result' | 'blocked'
  const [step, setStep] = useState<'welcome' | 'quiz' | 'result' | 'blocked'>('welcome');

  // Student auth choice
  const [authType, setAuthType] = useState<'name' | 'number'>('name');
  const [studentInput, setStudentInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [blockedSubmission, setBlockedSubmission] = useState<StudentSubmission | null>(null);

  // Randomized questions for the student session
  const [questions, setQuestions] = useState<RandomizedQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answers record: questionId -> selectedOptionId
  const [answers, setAnswers] = useState<Record<number, string>>({});
  
  // Timer
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<StudentSubmission | null>(null);

  // Check if device or user already submitted on mount or input change
  useEffect(() => {
    async function verifyInitialStatus() {
      if (!teacherCode) return;
      const status = await checkStudentStatus(teacherCode, deviceId, '');
      if (status.isBlocked && status.submission) {
        setBlockedSubmission(status.submission);
        setStep('blocked');
      }
    }
    verifyInitialStatus();
  }, [teacherCode, deviceId]);

  // Timer interval while on quiz step
  useEffect(() => {
    if (step !== 'quiz') return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, startTime]);

  // Initialize randomized questions
  const startQuiz = async () => {
    const trimmed = studentInput.trim();
    if (!trimmed) {
      setAuthError(authType === 'name' ? 'გთხოვთ მიუთითოთ სახელი და გვარის ინიციალი (მაგ. ნიკა ბ.)' : 'გთხოვთ შეიყვანოთ ჟურნალის ნომერი');
      return;
    }

    if (authType === 'name' && trimmed.length < 3) {
      setAuthError('გთხოვთ ჩაწეროთ სახელი და გვარის ინიციალი სწორად');
      return;
    }

    setIsCheckingStatus(true);
    setAuthError('');

    try {
      const status = await checkStudentStatus(teacherCode, deviceId, trimmed);
      if (status.isBlocked && status.submission) {
        setBlockedSubmission(status.submission);
        setStep('blocked');
        setIsCheckingStatus(false);
        return;
      }
    } catch {
      // proceed
    } finally {
      setIsCheckingStatus(false);
    }

    // Notify parent
    onStudentIdentified?.(trimmed);

    // Randomize questions AND options with balanced correct answer positions (ა, ბ, გ, დ)
    const randomized = randomizeQuizQuestions(quiz.questions);

    setQuestions(randomized);
    setCurrentIndex(0);
    setAnswers({});
    setStartTime(Date.now());
    setElapsedSeconds(0);
    setStep('quiz');
  };

  const currentQ = questions[currentIndex];
  const selectedOptionId = currentQ ? answers[currentQ.id] : undefined;
  const isCurrentAnswered = selectedOptionId !== undefined;

  // Handle option select (CANNOT BE CHANGED once chosen)
  const handleSelectOption = (optionId: string) => {
    if (!currentQ || isCurrentAnswered) return; // Answer is locked once chosen

    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: optionId
    }));
  };

  // Calculate live points
  const liveScore = useMemo(() => {
    let earned = 0;
    questions.forEach(q => {
      const selected = answers[q.id];
      if (selected && selected === q.correctOptionId) {
        earned += q.points;
      }
    });
    return earned;
  }, [questions, answers]);

  const maxScore = useMemo(() => {
    return questions.reduce((sum, q) => sum + q.points, 0) || 30;
  }, [questions]);

  // Finish quiz & submit to teacher
  const handleFinishQuiz = async () => {
    setIsSubmitting(true);
    const answersPayload = questions.map(q => ({
      questionId: q.id,
      selectedOptionId: answers[q.id] || ''
    }));

    const result = await submitStudentQuiz({
      teacherCode,
      studentNameOrNumber: studentInput.trim(),
      authType,
      deviceId,
      answers: answersPayload,
      durationSeconds: elapsedSeconds
    });

    setIsSubmitting(false);

    if (result.success && result.submission) {
      setSubmissionResult(result.submission);
      setStep('result');
    } else if (result.submission) {
      setBlockedSubmission(result.submission);
      setStep('blocked');
    } else {
      // Local fallback representation
      const verifiedAnswers = questions.map(q => {
        const sel = answers[q.id] || '';
        const isCorrect = sel === q.correctOptionId;
        return {
          questionId: q.id,
          selectedOptionId: sel,
          isCorrect,
          earnedPoints: isCorrect ? q.points : 0
        };
      });

      const totalPoints = verifiedAnswers.reduce((sum, a) => sum + a.earnedPoints, 0);
      const percentage = Math.round((totalPoints / maxScore) * 100);
      let gradeOutOf10 = Math.round((totalPoints / maxScore) * 10);
      if (gradeOutOf10 < 1) gradeOutOf10 = 1;

      let formativeAssessment: FormativeAssessment = 'საჭიროებს მხარდაჭერას';
      if (percentage >= 85) formativeAssessment = 'გაფართოებული/შემოქმედებითი';
      else if (percentage >= 60) formativeAssessment = 'დამოუკიდებელი';

      const fallbackSub: StudentSubmission = {
        id: `sub_local_${Date.now()}`,
        teacherCode,
        studentNameOrNumber: studentInput.trim(),
        authType,
        deviceId,
        submittedAt: new Date().toISOString(),
        totalPoints,
        maxPoints: maxScore,
        percentage,
        gradeOutOf10,
        formativeAssessment,
        answers: verifiedAnswers,
        durationSeconds: elapsedSeconds
      };

      setSubmissionResult(fallbackSub);
      setStep('result');
    }
  };


  // Format seconds mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Render: Blocked View (Prevent duplicate submissions from same device or name)
  if (step === 'blocked' && blockedSubmission) {
    return (
      <main className="min-h-[85vh] bg-gradient-to-br from-purple-100 via-violet-50 to-purple-50 py-10 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0px_#4c1d95] text-center">
          <div className="w-16 h-16 mx-auto bg-amber-100 border-3 border-slate-900 rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_#0f172a] text-amber-600 mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
            ტესტი უკვე შევსებულია!
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-medium mb-6">
            ტესტის ერთხელ შევსებისა და გაგზავნის შემდეგ, იმავე მოწყობილობიდან ან იმავე სახელით/ნომრით მეორედ შესვლა დაბლოკილია.
          </p>

          <div className="bg-slate-50 border-3 border-slate-900 rounded-2xl p-5 mb-6 text-left space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 font-bold">მოსწავლე:</span>
              <span className="font-extrabold text-slate-900">{blockedSubmission.studentNameOrNumber}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 font-bold">შედეგი:</span>
              <span className="font-extrabold text-indigo-700 font-mono text-base">
                {blockedSubmission.totalPoints} / {blockedSubmission.maxPoints} ქულა ({blockedSubmission.percentage}%)
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 font-bold">ნიშანი:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 border-2 border-indigo-700 text-indigo-900 font-black">
                {blockedSubmission.gradeOutOf10} / 10
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 font-bold">განმავითარებელი შეფასება:</span>
              <span className="font-bold text-slate-800">{blockedSubmission.formativeAssessment}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            თუ საჭიროა ტესტის ხელახალი შევსება, მიმართეთ თქვენს მასწავლებელს ({teacherCode}).
          </p>
        </div>
      </main>
    );
  }

  // Render: Welcome Screen (Check-in & Instructions)
  if (step === 'welcome') {
    return (
      <main className="min-h-[88vh] bg-gradient-to-br from-purple-100 via-violet-50 to-purple-50 py-10 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-10 shadow-[8px_8px_0px_#4c1d95]">
          
          {/* Header Badge */}
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-200 border-2 border-slate-900 text-purple-950 font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_#4c1d95]">
              <Flame className="w-3.5 h-3.5 text-purple-700 fill-purple-700" />
              ფიზიკის ტესტირება
            </span>
            <span className="text-xs font-black text-purple-900 bg-purple-50 border-2 border-purple-300 px-2.5 py-1 rounded-xl">
              კლასი: {quiz.grade}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">
            {quiz.topic}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base font-medium mb-6">
            {quiz.learningGoal}
          </p>

          {/* Assessment Instructions Card */}
          <div className="bg-purple-50/80 border-3 border-purple-900 rounded-2xl p-4 sm:p-5 mb-6 space-y-2.5 shadow-[3px_3px_0px_#4c1d95]">
            <h2 className="text-sm font-extrabold text-purple-950 uppercase tracking-wide flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-700" />
              ტესტის წესები და შეფასების ინსტრუქცია:
            </h2>
            <ul className="text-xs sm:text-sm text-slate-700 space-y-1.5 list-disc list-inside font-medium leading-relaxed">
              <li>ტესტი შეიცავს <strong>15 კითხვას</strong> (5 მარტივი [1 ქ], 5 საშუალო [2 ქ], 5 რთული/სააზროვნო [3 ქ]).</li>
              <li>მაქსიმალური ჯამური ქულა: <strong>30 ქულა</strong>.</li>
              <li>კითხვები და პასუხების ვარიანტები გამოდის <strong>შემთხვევითი თანმიმდევრობით</strong>.</li>
              <li>შეგიძლიათ კითხვებზე წინ და უკან თავისუფლად გადასვლა.</li>
              <li><strong>ყურადღება:</strong> გაცემული პასუხის შეცვლა შეუძლებელია! არჩევისთანავე მიიღებთ განმარტებით უკუკავშირს.</li>
              <li>ტესტის დასრულებისთანავე მიიღებთ <strong>6–10 ქულიან ნიშანს</strong> და სამდონიან განმავითარებელ შეფასებას.</li>
              <li>ტესტის ერთხელ გაგზავნის შემდეგ მეორედ შესვლა იბლოკება.</li>
            </ul>
          </div>

          {/* Identification Form */}
          <div className="space-y-4 mb-6">
            <label className="block text-sm font-black text-slate-900">
              აირჩიეთ იდენტიფიკაციის ფორმა:
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAuthType('name')}
                className={`p-3.5 rounded-xl border-3 border-slate-900 text-left font-bold text-sm transition-all flex items-center gap-2 shadow-[2px_2px_0px_#0f172a] ${
                  authType === 'name'
                    ? 'bg-amber-300 text-slate-900 ring-2 ring-amber-400'
                    : 'bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${authType === 'name' ? 'bg-slate-900' : 'bg-white'}`}>
                  {authType === 'name' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span>სახელი + გვარის პირველი ასო</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthType('number')}
                className={`p-3.5 rounded-xl border-3 border-slate-900 text-left font-bold text-sm transition-all flex items-center gap-2 shadow-[2px_2px_0px_#0f172a] ${
                  authType === 'number'
                    ? 'bg-amber-300 text-slate-900 ring-2 ring-amber-400'
                    : 'bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${authType === 'number' ? 'bg-slate-900' : 'bg-white'}`}>
                  {authType === 'number' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span>ჟურნალში ჩემი ნომერი</span>
              </button>
            </div>

            <div>
              <label htmlFor="student-input" className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                {authType === 'name' ? 'ჩაწერეთ სახელი და გვარის ინიციალი:' : 'შეიყვანეთ თქვენი ნომერი ჟურნალში:'}
              </label>
              <input
                id="student-input"
                type={authType === 'number' ? 'number' : 'text'}
                value={studentInput}
                onChange={e => setStudentInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && startQuiz()}
                placeholder={authType === 'name' ? 'მაგ: გიორგი ბ.' : 'მაგ: 14'}
                className="w-full px-4 py-3.5 rounded-xl border-3 border-slate-900 font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-300 shadow-[2px_2px_0px_#0f172a]"
              />
              {authError && (
                <p className="mt-1.5 text-xs font-bold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {authError}
                </p>
              )}
            </div>
          </div>

          {/* Action Button: "დაწყების" ღილაკი */}
          <button
            type="button"
            disabled={isCheckingStatus}
            onClick={startQuiz}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-lg border-3 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:shadow-[2px_2px_0px_#0f172a] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isCheckingStatus ? (
              <span>მოწმდება სტატუსი...</span>
            ) : (
              <>
                <span>ტესტის დაწყება</span>
                <ArrowRight className="w-5 h-5 stroke-[3]" />
              </>
            )}
          </button>
        </div>
      </main>
    );
  }

  // Render: Active Quiz View
  if (step === 'quiz' && currentQ) {
    const answeredCount = Object.keys(answers).length;
    const isLastQuestion = currentIndex === questions.length - 1;
    const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

    return (
      <main className="min-h-[88vh] bg-gradient-to-br from-purple-100 via-violet-50 to-indigo-100/70 py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Top Progress & Stats Bar */}
          <div className="bg-white border-3 border-slate-900 rounded-2xl p-4 shadow-[4px_4px_0px_#4c1d95] mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-purple-900 text-purple-200 font-black text-sm">
                კითხვა {currentIndex + 1} / {questions.length}
              </span>
              
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black border-2 ${
                currentQ.level === 'easy'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                  : currentQ.level === 'medium'
                  ? 'bg-amber-100 text-amber-900 border-amber-400'
                  : 'bg-rose-100 text-rose-900 border-rose-400'
              }`}>
                {currentQ.level === 'easy' ? 'I დონე: მარტივი (1 ქ)' : currentQ.level === 'medium' ? 'II დონე: საშუალო (2 ქ)' : 'III დონე: სააზროვნო (3 ქ)'}
              </span>

              <span className="hidden md:inline-block px-2.5 py-1 rounded-lg bg-purple-100 border border-purple-300 text-purple-900 text-xs font-bold">
                თემა: {currentQ.conceptTag}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-black text-slate-700">
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{formatTime(elapsedSeconds)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-purple-100 px-2.5 py-1 rounded-lg border-2 border-purple-400 text-purple-950 font-black">
                <Award className="w-4 h-4 text-purple-700" />
                <span>მიმდინარე: {liveScore} / {maxScore} ქულა</span>
              </div>
            </div>
          </div>

          {/* Linear Progress Bar */}
          <div className="w-full bg-purple-200/80 h-2.5 rounded-full mb-6 border-2 border-slate-900 overflow-hidden shadow-inner">
            <div 
              className="bg-purple-600 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* MAIN QUESTION CARD - Light purple theme with distinct frame */}
          <div className="bg-[#faf7ff] border-4 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0px_#4c1d95] mb-6">
            
            {/* Question Header & Image */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center mb-6">
              
              <div className={currentQ.imageUrl ? "md:col-span-8 space-y-3" : "md:col-span-12 space-y-3"}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-200 border-2 border-slate-900 text-xs font-black text-purple-950 shadow-[2px_2px_0px_#0f172a]">
                    <span className="w-2 h-2 rounded-full bg-purple-700 animate-pulse" />
                    დავალება #{currentIndex + 1}
                  </span>
                  <span className="text-xs font-black text-purple-900 bg-white border-2 border-slate-900 px-2.5 py-1 rounded-xl shadow-[2px_2px_0px_#0f172a]">
                    {currentQ.points} ქულა
                  </span>
                </div>

                {/* QUESTION IN FRAME (კითხვა ჩარჩოში ღია იისფერი ფონით) */}
                <div className="bg-purple-50/90 border-3 border-purple-900 rounded-2xl p-5 sm:p-6 shadow-[4px_4px_0px_#4c1d95] transition-all">
                  <div className="flex items-center gap-2 text-xs font-black text-purple-800 uppercase tracking-wider mb-2">
                    <BookOpen className="w-4 h-4 text-purple-700" />
                    <span>კითხვა:</span>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 leading-snug">
                    {currentQ.question}
                  </h3>
                </div>
              </div>

              {currentQ.imageUrl && (
                <div className="md:col-span-4">
                  <div className="rounded-2xl border-3 border-purple-900 overflow-hidden shadow-[4px_4px_0px_#4c1d95] bg-purple-100/50 aspect-video md:aspect-square flex items-center justify-center">
                    <img
                      src={currentQ.imageUrl}
                      alt={currentQ.imageAlt || 'ფიზიკის ილუსტრაცია'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Answer Options - Document requirement:
                "პასუხის გაცემამდე ვარიანტები არ არის შეფერადებული.
                 პასუხის გაცემისას: სწორი — მწვანედ, არასწორი — წითლად.
                 ყურადღება: გაცემული პასუხის შეცვლა შეუძლებელია." */}
            <div className="space-y-3 mb-6">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                აირჩიეთ ერთი სწორი პასუხი (არჩევის შემდეგ პასუხი ფიქსირდება):
              </p>

              {currentQ.shuffledOptions.map((opt, idx) => {
                const isSelected = selectedOptionId === opt.id;
                const isCorrect = opt.id === currentQ.correctOptionId;

                let buttonClass = 'bg-white hover:bg-purple-50/70 border-3 border-slate-900 text-slate-900 shadow-[3px_3px_0px_#4c1d95] cursor-pointer active:translate-x-0.5 active:translate-y-0.5';

                if (isCurrentAnswered) {
                  // After answer is given:
                  if (isCorrect) {
                    // Correct answer turns GREEN
                    buttonClass = 'bg-emerald-100 border-4 border-emerald-600 text-emerald-950 font-black shadow-[4px_4px_0px_#047857] ring-2 ring-emerald-400';
                  } else if (isSelected && !isCorrect) {
                    // Selected wrong answer turns RED
                    buttonClass = 'bg-rose-100 border-4 border-rose-600 text-rose-950 font-black shadow-[4px_4px_0px_#b91c1c] ring-2 ring-rose-400';
                  } else {
                    // Other unselected options fade
                    buttonClass = 'bg-slate-50 border-2 border-slate-300 text-slate-400 opacity-60 cursor-not-allowed';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isCurrentAnswered}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full text-left p-4 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-between gap-3 ${buttonClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl border-2 border-slate-900 flex items-center justify-center font-black text-sm bg-purple-100 text-purple-950 shrink-0">
                        {GEORGIAN_OPTION_LETTERS[idx] || String.fromCharCode(65 + idx)}
                      </span>
                      <span>{cleanOptionText(opt.text)}</span>
                    </div>

                    {isCurrentAnswered && (
                      <div className="shrink-0">
                        {isCorrect && (
                          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-200/80 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>სწორია (+{currentQ.points}ქ)</span>
                          </div>
                        )}
                        {isSelected && !isCorrect && (
                          <div className="flex items-center gap-1.5 text-xs font-black text-rose-800 bg-rose-200/80 px-2.5 py-1 rounded-lg">
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>არასწორია (0ქ)</span>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* FORMATIVE FEEDBACK CARD - Document requirement 4:
                "მოსწავლემ პასუხის არჩევის შემდეგ უნდა მიიღოს მოკლე, გასაგები და განმავითარებელი უკუკავშირი.
                 სწორი პასუხის შემთხვევაში: მიუთითე რომ სწორია და მოკლედ ახსენი რატომ.
                 არასწორი პასუხის შემთხვევაში: არ გამოიყენო დამამცირებელი ფორმულირება, აუხსენი შეცდომის მიზეზი, მიეცი მინიშნება." */}
            {isCurrentAnswered && (
              <div className={`p-4 sm:p-5 rounded-2xl border-3 border-slate-900 animate-fadeIn ${
                selectedOptionId === currentQ.correctOptionId
                  ? 'bg-emerald-50 text-emerald-950 shadow-[4px_4px_0px_#059669]'
                  : 'bg-amber-50 text-amber-950 shadow-[4px_4px_0px_#d97706]'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl border-2 border-slate-900 flex items-center justify-center shrink-0 ${
                    selectedOptionId === currentQ.correctOptionId ? 'bg-emerald-300 text-emerald-950' : 'bg-amber-300 text-amber-950'
                  }`}>
                    {selectedOptionId === currentQ.correctOptionId ? (
                      <Sparkles className="w-5 h-5" />
                    ) : (
                      <Lightbulb className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base mb-1">
                      {selectedOptionId === currentQ.correctOptionId ? 'ყოჩაღ, სწორი მსჯელობაა!' : 'საინტერესო ცდაა! დააკვირდით მინიშნებას:'}
                    </h4>
                    <p className="text-xs sm:text-sm font-medium leading-relaxed">
                      {selectedOptionId === currentQ.correctOptionId
                        ? currentQ.explanationCorrect
                        : currentQ.explanationIncorrect}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Navigation Controls:
              Document Requirement:
              - "მოსწავლეს შეეძლოს კითხვებზე წინ და უკან გადასვლა"
              - "ღილაკი „წინა კითხვა“ — ნარინჯისფერი" (Orange button!) */}
          <div className="flex items-center justify-between gap-4">
            
            {/* Previous Question Button - Orange (ნარინჯისფერი) */}
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              className={`px-5 py-3.5 rounded-2xl font-black text-sm border-3 border-slate-900 shadow-[4px_4px_0px_#0f172a] transition-all flex items-center gap-2 ${
                currentIndex === 0
                  ? 'opacity-40 cursor-not-allowed bg-amber-200 text-slate-500'
                  : 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer active:translate-x-0.5 active:translate-y-0.5'
              }`}
            >
              <ArrowLeft className="w-4 h-4 stroke-[3]" />
              <span>წინა კითხვა</span>
            </button>

            {/* Indicator of answered questions */}
            <span className="text-xs font-black text-slate-700 bg-white border-2 border-slate-900 px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_#0f172a]">
              პასუხგაცემული: {answeredCount} / {questions.length}
            </span>

            {/* Next or Finish Button */}
            {!isLastQuestion ? (
              <button
                type="button"
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-6 py-3.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-black text-sm border-3 border-slate-900 shadow-[4px_4px_0px_#4c1d95] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>შემდეგი კითხვა</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinishQuiz}
                className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm border-3 border-slate-900 shadow-[4px_4px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>იგზავნება...</span>
                ) : (
                  <>
                    <span>ტესტის დასრულება და გაგზავნა</span>
                    <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[3]" />
                  </>
                )}
              </button>
            )}

          </div>

          {/* Quick Question Jump Navigator */}
          <div className="mt-8 bg-white/90 border-2 border-purple-900 rounded-2xl p-3 shadow-[3px_3px_0px_#4c1d95]">
            <p className="text-[11px] font-black text-purple-900 uppercase tracking-wider mb-2">
              კითხვებზე სწრაფი გადასვლა:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isCurrent = idx === currentIndex;
                let bg = 'bg-purple-50 text-purple-950 hover:bg-purple-100';
                if (ans) {
                  bg = ans === q.correctOptionId ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white';
                }
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-8 h-8 rounded-lg font-black text-xs border-2 border-slate-900 flex items-center justify-center transition-all ${bg} ${
                      isCurrent ? 'ring-2 ring-purple-600 scale-110 font-black' : 'hover:scale-105'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </main>
    );
  }

  // Render: Final Results Screen
  if (step === 'result' && submissionResult) {
    return (
      <main className="min-h-[88vh] bg-gradient-to-br from-purple-100 via-violet-50 to-purple-50 py-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto bg-white border-4 border-slate-900 rounded-3xl p-6 sm:p-10 shadow-[8px_8px_0px_#4c1d95]">
          
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-400 border-4 border-slate-900 flex items-center justify-center shadow-[4px_4px_0px_#0f172a] transform -rotate-3 mb-4">
              <Award className="w-10 h-10 text-slate-900" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">
              ტესტირება წარმატებით დასრულდა!
            </h2>
            <p className="text-slate-600 font-bold text-sm">
              მოსწავლე: <span className="text-slate-900 underline">{submissionResult.studentNameOrNumber}</span> • კოდი: {teacherCode}
            </p>
          </div>

          {/* Key Metric Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Score */}
            <div className="bg-amber-50 border-3 border-slate-900 rounded-2xl p-4 text-center shadow-[3px_3px_0px_#0f172a]">
              <span className="block text-xs font-black text-amber-800 uppercase tracking-wider mb-1">
                ქულა
              </span>
              <span className="text-3xl font-black text-slate-900 font-mono">
                {submissionResult.totalPoints} / {submissionResult.maxPoints}
              </span>
              <span className="block text-xs font-bold text-slate-500 mt-1">
                {submissionResult.percentage}%
              </span>
            </div>

            {/* School Grade */}
            <div className="bg-indigo-50 border-3 border-slate-900 rounded-2xl p-4 text-center shadow-[3px_3px_0px_#0f172a]">
              <span className="block text-xs font-black text-indigo-800 uppercase tracking-wider mb-1">
                სასკოლო ნიშანი
              </span>
              <span className="text-3xl font-black text-indigo-700 font-mono">
                {submissionResult.gradeOutOf10} / 10
              </span>
              <span className="block text-xs font-bold text-slate-500 mt-1">
                ავტომატური განმსაზღვრელი
              </span>
            </div>

            {/* Formative Level */}
            <div className="bg-emerald-50 border-3 border-slate-900 rounded-2xl p-4 text-center shadow-[3px_3px_0px_#0f172a]">
              <span className="block text-xs font-black text-emerald-800 uppercase tracking-wider mb-1">
                განმავითარებელი დონე
              </span>
              <span className="text-sm font-black text-emerald-900 block mt-2">
                {submissionResult.formativeAssessment}
              </span>
              <span className="block text-[11px] font-bold text-emerald-700 mt-1">
                სამდონიანი შეფასება
              </span>
            </div>
          </div>

          {/* Pedagogical Formative Feedback Note */}
          <div className="bg-slate-50 border-3 border-slate-900 rounded-2xl p-5 mb-8">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              პედაგოგიური რეკომენდაცია მოსწავლეს:
            </h3>
            <p className="text-sm text-slate-700 font-medium leading-relaxed">
              {submissionResult.percentage >= 85
                ? 'ბრწყინვალე შედეგია! თქვენ სიღრმისეულად გაიაზრეთ მექანიკური მუშაობის, სიმძლავრისა და ენერგიის შენახვის ფუნდამენტური კანონები. შეგიძლიათ გადახვიდეთ უფრო კომპლექსურ საინჟინრო ამოცანებზე.'
                : submissionResult.percentage >= 60
                ? 'კარგი საფუძველი გაქვთ! თქვენ დამოუკიდებლად უმკლავდებით საბაზო და საშუალო სირთულის საკითხებს. რეკომენდებულია გაიმეოროთ მექანიკური ენერგიის შენახვისა და მ.ქ.კ.-ის გამოთვლის კომპლექსური ფორმულები.'
                : 'საჭიროა თემის კიდევ ერთხელ დამუშავება. ყურადღება გაამახვილეთ ძირითად ფორმულებზე (A = F·s, N = A/t, Ek = mv²/2, Ep = mgh) და სცადეთ ეტაპობრივი ამოცანების ამოხსნა.'}
            </p>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-4 mb-8">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              ნამუშევრის დეტალური განხილვა (15 საკითხი):
            </h3>

            <div className="space-y-3">
              {questions.map((q, i) => {
                const ans = submissionResult.answers.find(a => a.questionId === q.id);
                const isCorrect = ans ? ans.isCorrect : false;
                const chosenOpt = q.options.find(o => o.id === ans?.selectedOptionId);
                const correctOpt = q.options.find(o => o.id === q.correctOptionId);

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border-2 border-slate-900 ${
                      isCorrect ? 'bg-emerald-50/70' : 'bg-rose-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        #{i + 1}. {q.question}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-black shrink-0 ${
                        isCorrect ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                      }`}>
                        {isCorrect ? `+${q.points} ქულა` : '0 ქულა'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 mb-2 font-medium">
                      <p className="text-slate-700">
                        თქვენი პასუხი: <span className={isCorrect ? 'font-black text-emerald-800' : 'font-black text-rose-800'}>{chosenOpt ? cleanOptionText(chosenOpt.text) : 'გამოტოვებული'}</span>
                      </p>
                      {!isCorrect && (
                        <p className="text-slate-600">
                          სწორი პასუხი: <span className="font-black text-emerald-800">{correctOpt ? cleanOptionText(correctOpt.text) : ''}</span>
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                      <strong>განმარტება:</strong> {isCorrect ? q.explanationCorrect : q.explanationIncorrect}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permanent Completion Banner (No restart/re-enter button per requirement) */}
          <div className="pt-6 border-t-2 border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-100 border-2 border-emerald-600 text-emerald-950 font-black text-sm shadow-[3px_3px_0px_#059669]">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 stroke-[3]" />
              <span>თქვენი ნამუშევარი დაფიქსირებულია და გადაცემულია მასწავლებელთან!</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-bold max-w-md">
              ქვიზი დასრულებულია. შედეგები შენახულია მასწავლებლის ჟურნალში. ხელახალი შევსება ან თავიდან დაწყება შეზღუდულია.
            </p>
          </div>

        </div>
      </main>
    );
  }

  return null;
};
