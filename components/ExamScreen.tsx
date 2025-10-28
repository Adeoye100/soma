import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ExamConfig, Question, TimeIntensity, UserAnswer, Evaluation, QuestionType, ExamResult } from '../types';
import { evaluateAnswer } from '../services/geminiService';
import Spinner from './Spinner';

interface ExamScreenProps {
  questions: Question[];
  config: ExamConfig;
  onFinish: (result: Omit<ExamResult, 'timestamp'>) => void;
}

const timePerQuestion: Record<TimeIntensity, number> = {
  [TimeIntensity.RELAXED]: 180,
  [TimeIntensity.MODERATE]: 90,
  [TimeIntensity.CHALLENGING]: 45,
};

const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
};

const ExamScreen: React.FC<ExamScreenProps> = ({ questions, config, onFinish }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>(Array(questions.length).fill(null));
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const totalTime = useMemo(() => timePerQuestion[config.intensity] * questions.length, [config.intensity, questions.length]);
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const startTime = useMemo(() => Date.now(), []);

  // Memoize shuffled answers for matching questions
  const shuffledMatchingAnswers = useMemo(() => {
    return questions.map(q => {
        if (q.type === QuestionType.MATCHING && q.matchingPairs) {
            return shuffleArray(q.matchingPairs.map(p => p.answer));
        }
        return [];
    });
  }, [questions]);

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

  const handleAnswerChange = (answer: UserAnswer) => {
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
    if(isSubmitting) return;
    setIsSubmitting(true);
    const evaluations: Evaluation[] = [];
    for (let i = 0; i < questions.length; i++) {
        const evaluation = await evaluateAnswer(questions[i], userAnswers[i] || null);
        evaluations.push(evaluation);
    }
    const timeTaken = totalTime - timeLeft;
    onFinish({ questions, userAnswers, evaluations, timeTaken, config });
  }, [questions, userAnswers, totalTime, timeLeft, onFinish, config, isSubmitting]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const renderAnswerArea = () => {
    const currentAnswer = userAnswers[currentQuestionIndex];

    switch (currentQuestion.type) {
        case QuestionType.MULTIPLE_CHOICE:
            return currentQuestion.options?.map((option, index) => (
                <label key={index} className="flex items-center p-4 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer has-[:checked]:bg-primary-50 dark:has-[:checked]:bg-primary-900/20 has-[:checked]:border-primary-500">
                    <input type="radio" name={`q_${currentQuestionIndex}`} value={option} checked={currentAnswer === option} onChange={(e) => handleAnswerChange(e.target.value)} className="h-4 w-4 text-primary-600 border-slate-300 focus:ring-primary-500" />
                    <span className="ml-3 text-slate-700 dark:text-slate-300">{option}</span>
                </label>
            ));
        
        case QuestionType.TRUE_FALSE:
            return ['True', 'False'].map((option) => (
                <label key={option} className="flex items-center p-4 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer has-[:checked]:bg-primary-50 dark:has-[:checked]:bg-primary-900/20 has-[:checked]:border-primary-500">
                    <input type="radio" name={`q_${currentQuestionIndex}`} value={option} checked={currentAnswer === option} onChange={(e) => handleAnswerChange(e.target.value)} className="h-4 w-4 text-primary-600 border-slate-300 focus:ring-primary-500" />
                    <span className="ml-3 text-slate-700 dark:text-slate-300">{option}</span>
                </label>
            ));

        case QuestionType.FILL_IN_THE_BLANK:
            const parts = currentQuestion.question.split('___');
            const numBlanks = parts.length - 1;
            return (
                <div className="text-lg flex flex-wrap items-center gap-2">
                    {parts.map((part, index) => (
                        <React.Fragment key={index}>
                            <span>{part}</span>
                            {index < numBlanks && (
                                <input
                                    type="text"
                                    value={(Array.isArray(currentAnswer) && currentAnswer[index]) || ''}
                                    onChange={(e) => {
                                        const newAnswers = Array.isArray(currentAnswer) ? [...currentAnswer] : Array(numBlanks).fill('');
                                        newAnswers[index] = e.target.value;
                                        handleAnswerChange(newAnswers);
                                    }}
                                    className="inline-block w-40 rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-1 px-2 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                                />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            );

        case QuestionType.MATCHING:
            const answers = shuffledMatchingAnswers[currentQuestionIndex];
            return currentQuestion.matchingPairs?.map(({ prompt }, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 items-center">
                    <p className="font-medium text-slate-700 dark:text-slate-300">{prompt}</p>
                    <select
                        value={(typeof currentAnswer === 'object' && currentAnswer && currentAnswer[prompt]) || ''}
                        onChange={(e) => {
                             const newAnswers = (typeof currentAnswer === 'object' && currentAnswer) ? {...currentAnswer} : {};
                             newAnswers[prompt] = e.target.value;
                             handleAnswerChange(newAnswers);
                        }}
                        className="block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                    >
                        <option value="">Select a match...</option>
                        {answers.map(ans => <option key={ans} value={ans}>{ans}</option>)}
                    </select>
                </div>
            ));

        case QuestionType.SHORT_ANSWER:
            return <input type="text" value={(currentAnswer as string) || ''} onChange={(e) => handleAnswerChange(e.target.value)} placeholder="Your answer..." className="block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"/>;

        case QuestionType.ESSAY:
            return <textarea rows={8} value={(currentAnswer as string) || ''} onChange={(e) => handleAnswerChange(e.target.value)} placeholder="Your essay..." className="block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"/>;
            
        default:
            return <p>Question type not supported.</p>
    }
  }

  if (isSubmitting) {
      return (
        <div className="flex flex-col items-center justify-center h-96">
            <Spinner size="lg"/>
            <p className="text-xl font-semibold mt-4 text-primary-500">Evaluating your answers...</p>
            <p className="text-slate-500 mt-2">This may take a moment.</p>
        </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400">
                    Question {currentQuestionIndex + 1} of {questions.length}
                </h2>
                <div className="text-2xl font-mono font-semibold text-slate-700 dark:text-slate-200" role="timer">
                    {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                </div>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-6">
                <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div>
            </div>

            <div className="mb-8 min-h-[100px]">
                 <p className="font-semibold text-sm text-slate-500 dark:text-slate-400 mb-2">({currentQuestion.type})</p>
                <div className="text-lg text-slate-800 dark:text-slate-200">{currentQuestion.type !== 'Fill-in-the-Blank' && currentQuestion.question}</div>
            </div>
            
            <div className="space-y-4">
              {renderAnswerArea()}
            </div>
            
            <div className="mt-8 flex justify-between items-center">
                <button onClick={handlePrev} disabled={currentQuestionIndex === 0} className="rounded-md bg-white dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    Previous
                </button>
                {currentQuestionIndex === questions.length - 1 ? (
                    <button onClick={handleSubmit} className="rounded-md bg-green-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
                        Submit
                    </button>
                ) : (
                    <button onClick={handleNext} className="rounded-md bg-primary-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
                        Next
                    </button>
                )}
            </div>
        </div>
    </div>
  );
};

export default ExamScreen;