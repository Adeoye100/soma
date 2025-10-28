import React, { useState, useMemo, useCallback } from 'react';
import { Question, UserAnswer, Evaluation, QuestionType } from '../types';
import { evaluateAnswer } from '../services/geminiService';
import Spinner from './Spinner';
import { CheckCircleIcon, XCircleIcon, ChatBubbleLeftRightIcon } from './icons';

interface PracticeScreenProps {
  questions: Question[];
  onFinish: () => void;
}

const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
};

const PracticeScreen: React.FC<PracticeScreenProps> = ({ questions, onFinish }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState<UserAnswer>(null);
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [quizFinished, setQuizFinished] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);

    const shuffledMatchingAnswers = useMemo(() => {
        return questions.map(q => {
            if (q.type === QuestionType.MATCHING && q.matchingPairs) {
                return shuffleArray(q.matchingPairs.map(p => p.answer));
            }
            return [];
        });
    }, [questions]);
    
    const handleAnswerChange = (answer: UserAnswer) => {
        setUserAnswer(answer);
    };

    const handleCheckAnswer = async () => {
        setIsEvaluating(true);
        const currentQuestion = questions[currentQuestionIndex];
        const evalResult = await evaluateAnswer(currentQuestion, userAnswer);
        setEvaluation(evalResult);
        if(evalResult.isCorrect) {
            setCorrectCount(prev => prev + 1);
        }
        setIsEvaluating(false);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setUserAnswer(null);
            setEvaluation(null);
        } else {
            setQuizFinished(true);
        }
    };

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    const renderAnswerArea = () => {
        switch (currentQuestion.type) {
            case QuestionType.MULTIPLE_CHOICE:
                return currentQuestion.options?.map((option, index) => (
                    <label key={index} className={`flex items-center p-4 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer ${evaluation ? 'cursor-not-allowed' : 'has-[:checked]:bg-primary-50 dark:has-[:checked]:bg-primary-900/20 has-[:checked]:border-primary-500'}`}>
                        <input type="radio" name={`q_${currentQuestionIndex}`} value={option} checked={userAnswer === option} onChange={(e) => handleAnswerChange(e.target.value)} disabled={!!evaluation} className="h-4 w-4 text-primary-600 border-slate-300 focus:ring-primary-500 disabled:bg-slate-200" />
                        <span className="ml-3 text-slate-700 dark:text-slate-300">{option}</span>
                    </label>
                ));
            
            case QuestionType.TRUE_FALSE:
                return ['True', 'False'].map((option) => (
                     <label key={option} className={`flex items-center p-4 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer ${evaluation ? 'cursor-not-allowed' : 'has-[:checked]:bg-primary-50 dark:has-[:checked]:bg-primary-900/20 has-[:checked]:border-primary-500'}`}>
                        <input type="radio" name={`q_${currentQuestionIndex}`} value={option} checked={userAnswer === option} onChange={(e) => handleAnswerChange(e.target.value)} disabled={!!evaluation} className="h-4 w-4 text-primary-600 border-slate-300 focus:ring-primary-500 disabled:bg-slate-200" />
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
                                    <input type="text" value={(Array.isArray(userAnswer) && userAnswer[index]) || ''} disabled={!!evaluation}
                                        onChange={(e) => {
                                            const newAnswers = Array.isArray(userAnswer) ? [...userAnswer] : Array(numBlanks).fill('');
                                            newAnswers[index] = e.target.value;
                                            handleAnswerChange(newAnswers);
                                        }}
                                        className="inline-block w-40 rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-1 px-2 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm disabled:bg-slate-100 dark:disabled:bg-slate-600"
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
                            value={(typeof userAnswer === 'object' && userAnswer && userAnswer[prompt]) || ''}
                            disabled={!!evaluation}
                            onChange={(e) => {
                                 const newAnswers = (typeof userAnswer === 'object' && userAnswer) ? {...userAnswer} : {};
                                 newAnswers[prompt] = e.target.value;
                                 handleAnswerChange(newAnswers);
                            }}
                            className="block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm disabled:bg-slate-100 dark:disabled:bg-slate-600"
                        >
                            <option value="">Select a match...</option>
                            {answers.map(ans => <option key={ans} value={ans}>{ans}</option>)}
                        </select>
                    </div>
                ));

            case QuestionType.SHORT_ANSWER:
                return <input type="text" value={(userAnswer as string) || ''} onChange={(e) => handleAnswerChange(e.target.value)} disabled={!!evaluation} placeholder="Your answer..." className="block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm disabled:bg-slate-100 dark:disabled:bg-slate-600"/>;

            default:
                return <p>Question type not supported for practice mode.</p>
        }
    };
    
    if (quizFinished) {
        return (
            <div className="max-w-2xl mx-auto text-center bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 animate-fade-in">
                <h2 className="text-3xl font-bold text-primary-600 dark:text-primary-400">Practice Complete!</h2>
                <p className="text-lg mt-4 text-slate-600 dark:text-slate-300">You correctly answered</p>
                <p className="text-6xl font-bold my-4 text-slate-800 dark:text-slate-100">{correctCount} / {questions.length}</p>
                <p className="text-slate-500 dark:text-slate-400">Keep practicing to master the material!</p>
                <button onClick={onFinish} className="mt-8 w-full rounded-md bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
                    Back to Dashboard
                </button>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                    <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400">
                        Practice Question {currentQuestionIndex + 1} of {questions.length}
                    </h2>
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
                
                {evaluation && (
                    <div className="mt-6 p-4 border border-slate-200 dark:border-slate-700 rounded-lg animate-fade-in">
                        <div className="flex items-start gap-3">
                            {evaluation.isCorrect ? <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0 mt-1"/> : <XCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-1"/>}
                            <div className="flex-grow">
                                <p className={`font-semibold ${evaluation.isCorrect ? 'text-green-600' : 'text-red-500'}`}>{evaluation.isCorrect ? 'Correct!' : 'Incorrect'}</p>
                                <div className="mt-2 bg-slate-100 dark:bg-slate-900/50 p-3 rounded-md">
                                    <p className="font-semibold text-sm flex items-center gap-1.5">
                                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                        AI Feedback:
                                    </p>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{evaluation.feedback}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 flex justify-end">
                    {evaluation ? (
                        <button onClick={handleNext} className="rounded-md bg-primary-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
                            {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                        </button>
                    ) : (
                        <button onClick={handleCheckAnswer} disabled={isEvaluating || userAnswer === null} className="flex items-center justify-center w-40 rounded-md bg-green-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed">
                            {isEvaluating ? <Spinner size="sm" /> : 'Check Answer'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PracticeScreen;