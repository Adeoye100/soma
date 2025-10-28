import React from 'react';
import { ExamResult } from '../types';
import { CalendarDaysIcon, DocumentChartBarIcon } from './icons';

interface HistoryListProps {
  history: ExamResult[];
  onViewResult: (result: ExamResult) => void;
}

const HistoryListItem: React.FC<{ result: ExamResult; onView: () => void; }> = ({ result, onView }) => {
    const totalScore = result.evaluations.reduce((sum, e) => sum + e.score, 0);
    const maxScore = result.evaluations.length * 10;
    const accuracy = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const date = new Date(result.timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <li className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="flex-grow flex items-center gap-4">
                <div className={`p-3 rounded-lg ${accuracy >= 70 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    <DocumentChartBarIcon className={`h-6 w-6 ${accuracy >= 70 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                </div>
                <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{result.config.type} Exam</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                        <CalendarDaysIcon className="h-4 w-4" />
                        <span>{date}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="text-center">
                    <span className="text-xs text-slate-500">Score</span>
                    <p className={`font-bold text-lg ${accuracy >= 70 ? 'text-green-600' : 'text-red-500'}`}>{accuracy.toFixed(0)}%</p>
                </div>
                <button 
                    onClick={onView}
                    className="w-full sm:w-auto rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                    View Details
                </button>
            </div>
        </li>
    );
};

const HistoryList: React.FC<HistoryListProps> = ({ history, onViewResult }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-10 px-6 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">No Exam History</h3>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Your past exam results will appear here once you complete a test.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Past Exams</h2>
      <ul className="space-y-4">
        {history.map((result) => (
          <HistoryListItem key={result.timestamp} result={result} onView={() => onViewResult(result)} />
        ))}
      </ul>
    </div>
  );
};

export default HistoryList;
