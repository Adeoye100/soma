import React, { useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ExamResult } from '../types';
import { CheckCircleIcon, XCircleIcon, DownloadIcon, RefreshIcon } from './icons';
import ShaderBackground from './ShaderBackground';

// Fix: Declare jspdf and html2canvas on the window object to fix TypeScript errors.
declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

interface ResultsScreenProps {
  result: ExamResult;
  onRestart: (result: ExamResult) => void;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, onRestart }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const { questions, evaluations, config } = result;

    const totalScore = useMemo(() => evaluations.reduce((sum, e) => sum + e.score, 0), [evaluations]);
    const maxScore = evaluations.length * 10;
    const accuracy = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    const topicPerformance = useMemo(() => {
        const topics: { [key: string]: { score: number, total: number } } = {};
        evaluations.forEach(ev => {
            if (!topics[ev.topic]) {
                topics[ev.topic] = { score: 0, total: 0 };
            }
            topics[ev.topic].score += ev.score;
            topics[ev.topic].total += 10;
        });

        return Object.entries(topics).map(([name, data]) => ({
            name,
            performance: (data.score / data.total) * 100,
        }));
    }, [evaluations]);

    const handleDownloadPdf = async () => {
        const { jsPDF } = window.jspdf;
        const html2canvas = window.html2canvas;

        if (reportRef.current) {
            const canvas = await html2canvas(reportRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('exam-report.pdf');
        }
    };

    const handleRestart = () => {
        const resultToSave: ExamResult = { ...result, score: accuracy, totalQuestions: questions.length };
        onRestart(resultToSave);
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 animate-fade-in">
             <div ref={reportRef} className="bg-white dark:bg-slate-800 p-3 sm:p-6 md:p-8 rounded-lg">
                <ShaderBackground><div className="p-4 sm:p-6 md:p-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-center text-primary-600 dark:text-primary-400 mb-6">Exam Results</h2>

                    {/* Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
                        <div className="bg-slate-100 dark:bg-slate-700/50 p-4 sm:p-6 rounded-xl text-center">
                            <h3 className="text-sm sm:text-lg font-semibold text-slate-600 dark:text-slate-300">Accuracy</h3>
                            <p className={`text-3xl sm:text-4xl font-bold ${accuracy >= 70 ? 'text-green-500' : 'text-red-500'}`}>{accuracy.toFixed(1)}%</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700/50 p-4 sm:p-6 rounded-xl text-center">
                             <h3 className="text-sm sm:text-lg font-semibold text-slate-600 dark:text-slate-300">Correct</h3>
                            <p className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100">{evaluations.filter(e => e.isCorrect).length}/{evaluations.length}</p>
                        </div>
                         <div className="bg-slate-100 dark:bg-slate-700/50 p-4 sm:p-6 rounded-xl text-center">
                             <h3 className="text-sm sm:text-lg font-semibold text-slate-600 dark:text-slate-300">Type</h3>
                            <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 capitalize">{config.type}</p>
                        </div>
                    </div>

                    {/* Topic Performance */}
                    <div className="mb-8">
                        <h3 className="text-xl sm:text-2xl font-bold mb-4">Topic Performance</h3>
                        <div className="w-full h-64 sm:h-80 bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-xl overflow-x-auto">
                            <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                                <BarChart data={topicPerformance} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis unit="%" tick={{ fontSize: 12 }} />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: 'none', color: '#fff', fontSize: '12px' }} cursor={{fill: 'rgba(128, 128, 128, 0.1)'}} />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar dataKey="performance" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Detailed Review */}
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold mb-4">Review</h3>
                        <div className="space-y-4 sm:space-y-6">
                            {questions.map((q, i) => (
                                <div key={i} className="p-3 sm:p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        {evaluations[i].isCorrect ? <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0 mt-1"/> : <XCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0 mt-1"/>}
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100 break-words">{i+1}. {q.question}</p>
                                            <p className="text-xs sm:text-sm mt-2"><span className="font-semibold">Answer:</span> <span className="text-slate-600 dark:text-slate-300">{result.userAnswers[i] || "No answer"}</span></p>
                                            <div className="mt-3 bg-slate-100 dark:bg-slate-900/50 p-2 sm:p-3 rounded-md">
                                                <p className="font-semibold text-xs sm:text-sm">Feedback:</p>
                                                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">{evaluations[i].feedback}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div></ShaderBackground>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
                <button onClick={handleRestart} className="flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-700 px-4 sm:px-6 py-3 text-sm sm:text-base font-semibold text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                    <RefreshIcon className="h-5 w-5" />
                    <span>Take Another</span>
                </button>
                <button onClick={handleDownloadPdf} className="flex items-center justify-center gap-2 rounded-md bg-primary-600 px-4 sm:px-6 py-3 text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-colors">
                    <DownloadIcon className="h-5 w-5" />
                    <span>Download</span>
                </button>
            </div>
        </div>
    );
};

export default ResultsScreen;
