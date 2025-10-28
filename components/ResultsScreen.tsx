import React, { useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ExamResult, UserAnswer, Evaluation } from '../types';
import { CheckCircleIcon, XCircleIcon, DownloadIcon, RefreshIcon, SparklesIcon, ChatBubbleLeftRightIcon } from './icons';

declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;

  }
}

interface ResultsScreenProps {
  result: ExamResult;
  onReturnToSetup: () => void;
}

const DetailedFeedback: React.FC<{ evaluation: Evaluation }> = ({ evaluation }) => {
    if (!evaluation.criteria && !evaluation.strengths && !evaluation.weaknesses) {
        return null;
    }

    return (
        <div className="mt-4 space-y-4">
            {evaluation.criteria && evaluation.criteria.length > 0 && (
                <div>
                    <h4 className="font-semibold text-md text-slate-700 dark:text-slate-300 mb-2">Criteria Score</h4>
                    <ul className="space-y-1 text-sm list-disc list-inside">
                       {evaluation.criteria.map((c, idx) => (
                           <li key={idx}>
                               <span className="font-semibold">{c.criterion}:</span> {c.score}/10. <span className="text-slate-500 dark:text-slate-400">{c.feedback}</span>
                           </li>
                       ))}
                    </ul>
                </div>
            )}
            
            {(evaluation.strengths && evaluation.strengths.length > 0) && (
                <div>
                    <h4 className="font-semibold text-md text-slate-700 dark:text-slate-300 mb-2">Answer Analysis: Strengths</h4>
                    <div className="space-y-2">
                        {evaluation.strengths.map((s, idx) => (
                            <blockquote key={idx} className="relative text-sm p-2 border-l-4 border-green-400 bg-green-50 dark:bg-green-900/20 rounded-r-md">
                               "{s}"
                            </blockquote>
                        ))}
                    </div>
                </div>
            )}

            {(evaluation.weaknesses && evaluation.weaknesses.length > 0) && (
                 <div>
                    <h4 className="font-semibold text-md text-slate-700 dark:text-slate-300 mb-2">Answer Analysis: Weaknesses</h4>
                    <div className="space-y-2">
                        {evaluation.weaknesses.map((w, idx) => (
                             <blockquote key={idx} className="relative text-sm p-2 border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-r-md">
                               "{w}"
                            </blockquote>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, onReturnToSetup }) => {
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
            pdf.save('soma-exam-report.pdf');
        }
    };

    const formatUserAnswer = (answer: UserAnswer) => {
        if (answer === null || answer === undefined) return "No answer";
        if (typeof answer === 'string') return answer;
        if (Array.isArray(answer)) return answer.join(', ');
        if (typeof answer === 'object') {
            return Object.entries(answer)
                .map(([key, value]) => `${key}: ${value}`)
                .join('; ');
        }
        return "N/A";
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in">
             <div ref={reportRef} className="bg-white dark:bg-slate-800 p-4 sm:p-6 md:p-8">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 md:p-8">
                    <h2 className="text-3xl font-bold text-center text-primary-600 dark:text-primary-400 mb-6">Exam Results</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-center">
                        <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-xl">
                            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300">Accuracy</h3>
                            <p className={`text-4xl font-bold ${accuracy >= 70 ? 'text-green-500' : 'text-red-500'}`}>{accuracy.toFixed(1)}%</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-xl">
                             <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300">Correct Answers</h3>
                            <p className="text-4xl font-bold text-slate-800 dark:text-slate-100">{evaluations.filter(e => e.isCorrect).length} / {evaluations.length}</p>
                        </div>
                         <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-xl">
                             <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300">Exam Type</h3>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 capitalize pt-2">{config.type}</p>
                        </div>
                    </div>
                    
                    <div className="mb-8">
                        <h3 className="text-2xl font-bold mb-4">Topic-wise Performance</h3>
                        <div className="w-full h-80 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topicPerformance} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                                    <XAxis dataKey="name" />
                                    <YAxis unit="%" />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: 'none', color: '#fff' }} cursor={{fill: 'rgba(128, 128, 128, 0.1)'}} />
                                    <Legend />
                                    <Bar dataKey="performance" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold mb-4">Detailed Review</h3>
                        <div className="space-y-6">
                            {questions.map((q, i) => (
                                <div key={i} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        {evaluations[i].isCorrect ? <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0 mt-1"/> : <XCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-1"/>}
                                        <div className="flex-grow">
                                            <p className="font-semibold text-slate-800 dark:text-slate-100">{i+1}. {q.question}</p>
                                            <p className="text-sm mt-2"><span className="font-semibold">Your Answer:</span> <span className="text-slate-600 dark:text-slate-300">{formatUserAnswer(result.userAnswers[i])}</span></p>
                                            <div className="mt-3 bg-slate-100 dark:bg-slate-900/50 p-3 rounded-md">
                                                <p className="font-semibold text-sm flex items-center gap-1.5">
                                                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                                    AI Feedback:
                                                </p>
                                                <p className="text-sm text-slate-700 dark:text-slate-300">{evaluations[i].feedback}</p>
                                                <DetailedFeedback evaluation={evaluations[i]} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <button onClick={onReturnToSetup} className="flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-700 px-6 py-3 text-base font-semibold text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600">
                    <RefreshIcon className="h-5 w-5" />
                    Back to Dashboard
                </button>
                <button onClick={handleDownloadPdf} className="flex items-center justify-center gap-2 rounded-md bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
                    <DownloadIcon className="h-5 w-5" />
                    Download Report
                </button>
            </div>
        </div>
    );
};

export default ResultsScreen;