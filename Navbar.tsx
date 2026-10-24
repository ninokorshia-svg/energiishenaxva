import React from 'react';
import { Sparkles, GraduationCap, Users, ShieldCheck, ExternalLink, School } from 'lucide-react';

interface NavbarProps {
  currentView: 'student' | 'teacher';
  onViewChange: (view: 'student' | 'teacher') => void;
  teacherCode: string;
  isTeacherAuthenticated: boolean;
  studentNameOrNumber?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  teacherCode,
  isTeacherAuthenticated,
  studentNameOrNumber
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-4 border-slate-900 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-400 border-3 border-slate-900 flex items-center justify-center shadow-[3px_3px_0px_#0f172a] transform -rotate-2">
            <Sparkles className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                ფიზიკა VIII • ქვიზი
              </span>
              <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-black uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800 border-2 border-emerald-700">
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium hidden md:block">
              მუშაობა, სიმძლავრე, კინეტიკური და პოტენციური ენერგია
            </p>
          </div>
        </div>

        {/* Status & Navigation Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Class indicator badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border-2 border-indigo-200 text-indigo-900 text-xs font-bold">
            <School className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">კლასის კოდი:</span>
            <span className="font-extrabold text-indigo-700 font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-300">
              {teacherCode}
            </span>
          </div>

          {/* Student Status if logged in */}
          {currentView === 'student' && studentNameOrNumber && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs font-bold">
              <Users className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">მოსწავლე:</span>
              <span className="font-extrabold text-emerald-700">{studentNameOrNumber}</span>
            </div>
          )}

          {/* Teacher Page Only Buttons (Hidden completely on Student Page per requirement) */}
          {currentView === 'teacher' && (
            <>
              {/* Back to Student Preview */}
              <button
                type="button"
                onClick={() => onViewChange('student')}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-extrabold border-3 border-slate-900 transition-all flex items-center gap-2 shadow-[3px_3px_0px_#0f172a] bg-amber-400 text-slate-900 hover:bg-amber-300 active:translate-x-0.5 active:translate-y-0.5"
                title="მოსწავლის ხედზე გადასვლა"
              >
                <GraduationCap className="w-4 h-4" />
                <span>მოსწავლის ხედი</span>
              </button>

              {/* Active Teacher Badge */}
              <div className="px-4 py-2 rounded-xl text-sm font-extrabold border-3 border-slate-900 flex items-center gap-2 shadow-[3px_3px_0px_#0f172a] bg-purple-700 text-white">
                <ShieldCheck className="w-4 h-4" />
                <span>მასწავლებელი</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
};
