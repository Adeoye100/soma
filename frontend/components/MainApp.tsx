import React, { useState, useCallback, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import Header from './Header';
import SetupScreen from './SetupScreen';
import ExamScreen from './ExamScreen';
import InfoModal from './InfoModal';
import ResultsScreen from './ResultsScreen';
import { Question, ExamConfig, ExamResult } from '../types';
import ProfileCard from './ProfileCard';
import ProfileSettingsModal from './ProfileSettingsModal';
import EnhancedExamHistoryDashboard from './EnhancedExamHistoryDashboard';

type AppState = 'setup' | 'exam' | 'results';

interface MainAppProps {
  user: User;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onAvatarUpdate: (newAvatarUrl: string) => void;
}

const MainApp: React.FC<MainAppProps> = ({ user, onLogout, theme, toggleTheme, onAvatarUpdate }) => {
  const [appState, setAppState] = useState<AppState>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [currentResult, setCurrentResult] = useState<ExamResult | null>(null);
  const [examHistory, setExamHistory] = useState<ExamResult[]>(() => {
    try {
      const savedHistory = localStorage.getItem('examHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error("Failed to load exam history from local storage", error);
      return [];
    }
  });
  const [showProfileSettingsModal, setShowProfileSettingsModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const handleExamStart = useCallback((qs: Question[], config: ExamConfig) => {
    setQuestions(qs);
    setExamConfig(config);
    setAppState('exam');
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('examHistory', JSON.stringify(examHistory));
    } catch (error) {
      console.error("Failed to save exam history to local storage", error);
    }
  }, [examHistory]);

  const handleExamFinish = useCallback((result: ExamResult) => {
    setCurrentResult(result);
    setAppState('results');
  }, []);

  const handleViewHistoryResult = (result: ExamResult) => {
    setCurrentResult(result);
    setAppState('results');
  };

  const handleRestart = useCallback((finalResult: ExamResult) => {
    const resultWithDate = { ...finalResult, date: new Date().toISOString() };
    setExamHistory(prev => [resultWithDate, ...prev.slice(0, 4)]); // Keep last 5 exams

    setQuestions([]);
    setExamConfig(null);
    setCurrentResult(null);
    setAppState('setup');
  }, []);

  const handleClearHistory = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all exam history? This action cannot be undone.')) {
      setExamHistory([]);
    }
  }, []);

  const handleOpenProfileSettings = useCallback(() => {
    setShowProfileSettingsModal(true);
  }, []);

  const handleStartNewExam = useCallback(() => {
    setAppState('setup');
  }, []);

  const renderContent = () => {
    switch (appState) {
      case 'setup':
        return (
          <div className="space-y-6">
            <SetupScreen onExamStart={handleExamStart} />
            <EnhancedExamHistoryDashboard
              history={examHistory}
              onViewResult={handleViewHistoryResult}
              onClearHistory={handleClearHistory}
              onStartNewExam={handleStartNewExam}
            />
          </div>
        );
      case 'exam':
        return <ExamScreen questions={questions} config={examConfig!} onFinish={handleExamFinish} />;
      case 'results':
        return <ResultsScreen result={currentResult!} onRestart={handleRestart} />;
      default:
        return (
          <div className="space-y-6">
            <SetupScreen onExamStart={handleExamStart} />
            <EnhancedExamHistoryDashboard
              history={examHistory}
              onViewResult={handleViewHistoryResult}
              onClearHistory={handleClearHistory}
              onStartNewExam={handleStartNewExam}
            />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} />}
      {showProfileSettingsModal && <ProfileSettingsModal user={user} onClose={() => setShowProfileSettingsModal(false)} onAvatarUpdate={onAvatarUpdate} />}
      <Header theme={theme} toggleTheme={toggleTheme} user={user} onLogout={onLogout} onOpenProfileSettings={handleOpenProfileSettings} />
      <main className="flex-grow p-3 sm:p-4 md:p-6 lg:p-8">
        {renderContent()}
      </main>
      <footer className="flex flex-col items-center gap-4 sm:gap-6 p-3 sm:p-4 md:p-6 mt-12 md:mt-24">
        <div className="shader-gradient-background rounded-lg p-px">
            <button
                onClick={() => setShowInfoModal(true)}
                className="bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium px-4 py-2 rounded-[7px] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
                FAQ & Terms
            </button>
        </div>
        <div className="hidden lg:block">
            <ProfileCard />
        </div>
      </footer>
    </div>
  );
};

export default MainApp;
