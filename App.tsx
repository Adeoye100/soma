import React, { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { ExamConfig, ExamResult, Question } from './types';
import Header from './components/Header';
import SetupScreen from './components/SetupScreen';
import ExamScreen from './components/ExamScreen';
import ResultsScreen from './components/ResultsScreen';
import PracticeScreen from './components/PracticeScreen';
import LoginScreen from './components/LoginScreen';
import { auth } from './services/firebase';
import Spinner from './components/Spinner';

type View = 'setup' | 'exam' | 'results' | 'practice';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme');
      return (storedTheme === 'dark' || storedTheme === 'light') ? storedTheme : 'dark';
    }
    return 'dark';
  });

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [view, setView] = useState<View>('setup');
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [examHistory, setExamHistory] = useState<ExamResult[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const storedHistory = window.localStorage.getItem('soma-exam-history');
      if (storedHistory) {
        setExamHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load exam history from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('soma-exam-history', JSON.stringify(examHistory));
    } catch (error) {
      console.error("Failed to save exam history to localStorage", error);
    }
  }, [examHistory]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleExamStart = useCallback((questions: Question[], config: ExamConfig) => {
    setExamQuestions(questions);
    setExamConfig(config);
    setView('exam');
  }, []);

  const handlePracticeStart = useCallback((questions: Question[]) => {
    setPracticeQuestions(questions);
    setView('practice');
  }, []);

  const handleExamFinish = useCallback((result: Omit<ExamResult, 'timestamp'>) => {
    const newResult: ExamResult = { ...result, timestamp: Date.now() };
    setExamResult(newResult);
    setExamHistory(prevHistory => [newResult, ...prevHistory]);
    setView('results');
  }, []);

  const handlePracticeFinish = useCallback(() => {
    setPracticeQuestions([]);
    setView('setup');
  }, []);
  
  const handleReturnToSetup = useCallback(() => {
      setExamQuestions([]);
      setExamConfig(null);
      setExamResult(null);
      setView('setup');
  }, []);

  const handleViewHistoryResult = useCallback((result: ExamResult) => {
    setExamResult(result);
    setView('results');
  }, []);


  if (authLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
            <Spinner size="lg" />
        </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const renderContent = () => {
    switch (view) {
      case 'practice':
        if (practiceQuestions.length > 0) {
          return <PracticeScreen questions={practiceQuestions} onFinish={handlePracticeFinish} />;
        }
        setView('setup'); 
        return <SetupScreen onExamStart={handleExamStart} onPracticeStart={handlePracticeStart} history={examHistory} onViewResult={handleViewHistoryResult} />;
      case 'exam':
        if (examQuestions.length > 0 && examConfig) {
          return <ExamScreen questions={examQuestions} config={examConfig} onFinish={handleExamFinish} />;
        }
        setView('setup'); 
        return <SetupScreen onExamStart={handleExamStart} onPracticeStart={handlePracticeStart} history={examHistory} onViewResult={handleViewHistoryResult} />;
      case 'results':
        if (examResult) {
          return <ResultsScreen result={examResult} onReturnToSetup={handleReturnToSetup} />;
        }
        setView('setup');
        return <SetupScreen onExamStart={handleExamStart} onPracticeStart={handlePracticeStart} history={examHistory} onViewResult={handleViewHistoryResult} />;
      case 'setup':
      default:
        return <SetupScreen onExamStart={handleExamStart} onPracticeStart={handlePracticeStart} history={examHistory} onViewResult={handleViewHistoryResult} />;
    }
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 min-h-screen font-sans">
      <Header theme={theme} toggleTheme={toggleTheme} user={user} onLogout={handleLogout} />
      <main className="container mx-auto p-4 md:p-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;