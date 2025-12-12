import React from 'react';
import { ExamResult } from '../types';
import { BookOpenIcon, XCircleIcon } from './icons';

interface ExamHistorySummaryProps {
  history: ExamResult[];
  onViewResult: (result: ExamResult) => void;
  onClearHistory: () => void;
}

const ExamHistorySummary: React.FC<ExamHistorySummaryProps> = ({ history, onViewResult, onClearHistory }) => {
  if (history.length === 0) {
    return null; // Don't render anything if there's no history
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex justify-center items-center mb-4 relative">
        <h3 className="text-lg font-semibold text-center text-slate-700 dark:text-slate-300">Recent Exam History</h3>
        <button
          onClick={onClearHistory}
          className="absolute right-0 flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 transition-colors"
          title="Clear all history"
        >
          <XCircleIcon className="h-4 w-4" />
          <span>Clear</span>
        </button>
      </div>
      <div className="space-y-3">
        {history.map((result, index) => (
          <button
            key={index}
            onClick={() => onViewResult(result)}
            className="w-full text-left p-4 rounded-lg bg-white dark:bg-slate-800 shadow-md hover:shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <BookOpenIcon className="h-6 w-6 text-primary-500" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    Exam taken on {new Date(result.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {result.totalQuestions} Questions
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-xl text-primary-600 dark:text-primary-400">
                  {result.score.toFixed(0)}%
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Overall Score</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExamHistorySummary;
