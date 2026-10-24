/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StudentQuiz } from './components/StudentQuiz';
import { TeacherDashboard } from './components/TeacherDashboard';
import { DEFAULT_QUIZ } from './data/defaultQuiz';
import { QuizConfig } from './types/quiz';
import { getOrCreateDeviceId, getTeacherSessionId } from './utils/storage';
import { fetchQuizSession } from './services/api';

export default function App() {
  const [currentView, setCurrentView] = useState<'student' | 'teacher'>('student');
  const [teacherCode, setTeacherCode] = useState<string>('Teachers1');
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState<boolean>(false);
  const [quiz, setQuiz] = useState<QuizConfig>(DEFAULT_QUIZ);
  const [studentIdentifier, setStudentIdentifier] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const deviceId = getOrCreateDeviceId();
  const sessionId = getTeacherSessionId();

  // Read URL query parameters on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code') || params.get('teacher');
    const viewParam = params.get('view');
    const studentParam = params.get('student');

    if (codeParam) {
      setTeacherCode(codeParam.trim());
    }

    // Students only open the quiz when they receive the link with &student=true or code without view=teacher
    if (studentParam === 'true' || (codeParam && viewParam !== 'teacher')) {
      setCurrentView('student');
    } else {
      // By default or with ?view=teacher, open Teacher Dashboard
      setCurrentView('teacher');
    }

    // Load initial quiz session
    const loadSession = async () => {
      const codeToLoad = codeParam ? codeParam.trim() : 'Teachers1';
      try {
        const session = await fetchQuizSession(codeToLoad);
        if (session && session.quiz) {
          setQuiz(session.quiz);
        }
      } catch (err) {
        console.warn('Initial session load failed, using default quiz:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const handleTeacherAuthenticated = (code: string) => {
    setTeacherCode(code);
    setIsTeacherAuthenticated(true);
    // sync quiz
    fetchQuizSession(code).then(s => {
      if (s?.quiz) setQuiz(s.quiz);
    });
  };

  const handleTeacherLogout = () => {
    setIsTeacherAuthenticated(false);
  };

  const handleQuizUpdated = (newQuiz: QuizConfig) => {
    setQuiz(newQuiz);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-amber-300 selection:text-slate-950">
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        teacherCode={teacherCode}
        isTeacherAuthenticated={isTeacherAuthenticated}
        studentNameOrNumber={studentIdentifier}
      />

      <div className="flex-1">
        {isLoading ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center p-8">
            <div className="w-12 h-12 rounded-2xl border-4 border-slate-900 border-t-amber-400 animate-spin mb-4" />
            <p className="font-black text-slate-700 text-sm">იტვირთება ქვიზის მონაცემები...</p>
          </div>
        ) : currentView === 'student' ? (
          <StudentQuiz
            quiz={quiz}
            teacherCode={teacherCode}
            deviceId={deviceId}
            onStudentIdentified={setStudentIdentifier}
          />
        ) : (
          <TeacherDashboard
            currentTeacherCode={teacherCode}
            sessionId={sessionId}
            quiz={quiz}
            onQuizUpdated={handleQuizUpdated}
            onTeacherCodeChanged={setTeacherCode}
            onLogout={handleTeacherLogout}
            isAuthenticated={isTeacherAuthenticated}
            onAuthenticated={handleTeacherAuthenticated}
          />
        )}
      </div>

      {/* Clean Educational Footer (Zero teacher links for students) */}
      <footer className="py-4 px-6 border-t border-slate-200 text-center text-xs text-slate-500 font-medium no-print flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-2">
        <span>VIII კლასი • ფიზიკის შემაჯამებელი ქვიზი</span>
        <span className="text-[11px] text-slate-400">
          {currentView === 'student' ? 'მოსწავლის ტესტირება' : 'მასწავლებლის მართვის პანელი'}
        </span>
      </footer>
    </div>
  );
}
