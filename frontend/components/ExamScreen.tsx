
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ExamConfig, Question, TimeIntensity, UserAnswer, ExamType, Evaluation } from '../types';
import { evaluateAnswer } from '../services/geminiService';
import Loader from './Loader';
import ShaderBackground from './ShaderBackground';

interface ExamScreenProps {
  questions: Question[];
  config: ExamConfig;
  onFinish: (result: { questions: Question[]; userAnswers: UserAnswer[]; evaluations: Evaluation[]; timeTaken: number; config: ExamConfig; }) => void;
}

const timePerQuestion: Record<TimeIntensity, number> = {
  [TimeIntensity.RELAXED]: 180,
  [TimeIntensity.MODERATE]: 90,
  [TimeIntensity.CHALLENGING]: 45,
};

const ExamScreen: React.FC<ExamScreenProps> = ({ questions, config, onFinish }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>(Array(questions.length).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalTime = useMemo(() => timePerQuestion[config.intensity] * questions.length, [config.intensity, questions.length]);
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const startTime = useMemo(() => Date.now(), []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswerChange = (answer: string) => {
    setUserAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIndex] = answer;
      return newAnswers;
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    const evaluations: Evaluation[] = [];
    for (let i = 0; i < questions.length; i++) {
        const evaluation = await evaluateAnswer(questions[i], userAnswers[i] || "No answer provided.");
        evaluations.push(evaluation);
    }
    const timeTaken = totalTime - timeLeft;
    onFinish({ questions, userAnswers, evaluations, timeTaken, config });
  }, [questions, userAnswers, totalTime, timeLeft, onFinish, config]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (isSubmitting) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh]">
              <Loader text="Evaluating your answers..." />
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 animate-fade-in">
        <ShaderBackground><div className="p-4 sm:p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                <h2 className="text-lg sm:text-xl font-bold text-primary-600 dark:text-primary-400">
                    Q{currentQuestionIndex + 1}/{questions.length}
                </h2>
                <div className="text-xl sm:text-2xl font-mono font-semibold text-slate-700 dark:text-slate-200" role="timer">
                    {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 sm:h-2.5 mb-6">
                <div className="bg-primary-600 h-2 sm:h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div>
            </div>

            {/* Question */}
            <div className="mb-6 sm:mb-8 min-h-[80px] sm:min-h-[100px]">
                <p className="text-base sm:text-lg text-slate-800 dark:text-slate-200 leading-relaxed">{currentQuestion.question}</p>
            </div>

            {/* Answer Area */}
            <div className="space-y-3 sm:space-y-4">
              {config.type === ExamType.OBJECTIVE && currentQuestion.options && (
                  currentQuestion.options.map((option, index) => (
                      <label key={index} className="flex items-start sm:items-center p-3 sm:p-4 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 has-[:checked]:bg-primary-50 dark:has-[:checked]:bg-primary-900/20 has-[:checked]:border-primary-500 transition-colors">
                          <input type="radio" name={`q_${currentQuestionIndex}`} value={option} checked={userAnswers[currentQuestionIndex] === option} onChange={(e) => handleAnswerChange(e.target.value)} className="h-4 w-4 flex-shrink-0 text-primary-600 border-slate-300 focus:ring-primary-500 mt-1" />
                          <span className="ml-3 text-sm sm:text-base text-slate-700 dark:text-slate-300">{option}</span>
                      </label>
                  ))
              )}
              {config.type === ExamType.SHORT_ANSWER && (
                  <input type="text" value={userAnswers[currentQuestionIndex]} onChange={(e) => handleAnswerChange(e.target.value)} placeholder="Your answer..." className="block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-sm sm:text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500"/>
              )}
               {config.type === ExamType.ESSAY && (
                  <textarea rows={6} value={userAnswers[currentQuestionIndex]} onChange={(e) => handleAnswerChange(e.target.value)} placeholder="Your essay..." className="block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-sm sm:text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500"/>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center">
                <button onClick={handlePrev} disabled={currentQuestionIndex === 0} className="rounded-md bg-white dark:bg-slate-700 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    ← Previous
                </button>
                {currentQuestionIndex === questions.length - 1 ? (
                    <button onClick={handleSubmit} className="rounded-md bg-green-600 px-6 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 transition-colors">
                        Submit Exam
                    </button>
                ) : (
                    <button onClick={handleNext} className="rounded-md bg-primary-600 px-6 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-colors">
                        Next →
                    </button>
                )}
            </div>
        </div></ShaderBackground>
    </div>
  );
};

export default ExamScreen;
