import React, { useState, useEffect, useRef } from 'react';
import { ExamConfig, ExamType, Difficulty, TimeIntensity, Material, Question, ExamResult, PracticeConfig, QuestionType } from '../types';
import { generateExam, extractTopics, generatePracticeQuiz } from '../services/geminiService';
import { UploadIcon, DocumentTextIcon, XCircleIcon, SparklesIcon, BookOpenIcon, BeakerIcon, CheckCircleIcon } from './icons';
import Loader from './Loader';
import InspirationCard from './InspirationCard';
import HistoryList from './HistoryList';
import InfoModal from './InfoModal';

interface SetupScreenProps {
  onExamStart: (questions: Question[], config: ExamConfig) => void;
  onPracticeStart: (questions: Question[]) => void;
  history: ExamResult[];
  onViewResult: (result: ExamResult) => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });

const formatTime = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

const SetupScreen: React.FC<SetupScreenProps> = ({ onExamStart, onPracticeStart, history, onViewResult }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [mode, setMode] = useState<'exam' | 'practice'>('exam');

  // Exam State
  const [examConfig, setExamConfig] = useState<ExamConfig>({
    type: ExamType.MIXED,
    difficulty: Difficulty.INTERMEDIATE,
    intensity: TimeIntensity.MODERATE,
    numQuestions: 10,
  });

  // Practice State
  const [practiceConfig, setPracticeConfig] = useState<PracticeConfig>({
      topics: [],
      questionTypes: [QuestionType.MULTIPLE_CHOICE],
      difficulty: Difficulty.INTERMEDIATE,
      numQuestions: 5,
  });
  const [extractedTopics, setExtractedTopics] = useState<string[]>([]);
  const [isExtractingTopics, setIsExtractingTopics] = useState(false);

  // General State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cardRef.current.style.setProperty('--x', `${x}px`);
      cardRef.current.style.setProperty('--y', `${y}px`);
    }
  };

  // Auto-extract topics when materials change
  useEffect(() => {
    const runTopicExtraction = async () => {
        if(materials.length > 0) {
            setIsExtractingTopics(true);
            setError(null);
            try {
                const topics = await extractTopics(materials);
                setExtractedTopics(topics);
            } catch (err) {
                setError((err as Error).message);
                setExtractedTopics([]);
            } finally {
                setIsExtractingTopics(false);
            }
        } else {
            setExtractedTopics([]);
        }
    };
    runTopicExtraction();
  }, [materials]);


  useEffect(() => {
    if (isLoading && countdown > 0) {
        intervalRef.current = window.setInterval(() => {
            setCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
    } else if (!isLoading || countdown === 0) {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) };
  }, [isLoading, countdown]);

  // Effect for handling drag-and-drop listeners on the window
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setIsLoading(true);
      setError(null);
      const files = Array.from(e.target.files);
      const newMaterials: Material[] = [];
      for (const file of files) {
        try {
          const content = await fileToBase64(file);
          newMaterials.push({ name: file.name, content, mimeType: file.type || 'application/octet-stream' });
        } catch (err: any) {
            setError(`Failed to read file: ${file.name}`);
        }
      }
      setMaterials(prev => [...prev, ...newMaterials]);
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLInputElement).files = e.dataTransfer.files;
    handleFileChange(e as any);
  }

  const handleRemoveMaterial = (index: number) => {
      setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const handleExamConfigChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setExamConfig(prev => ({ ...prev, [name]: name === 'numQuestions' ? parseInt(value) : value }));
  };

  const handlePracticeConfigChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setPracticeConfig(prev => ({ ...prev, [name]: name === 'numQuestions' ? parseInt(value) : value }));
  };

  const handleTopicToggle = (topic: string) => {
    setPracticeConfig(prev => {
        const newTopics = prev.topics.includes(topic)
            ? prev.topics.filter(t => t !== topic)
            : [...prev.topics, topic];
        return { ...prev, topics: newTopics };
    });
  };

  const handleQuestionTypeToggle = (type: QuestionType) => {
    setPracticeConfig(prev => {
        const newTypes = prev.questionTypes.includes(type)
            ? prev.questionTypes.filter(t => t !== type)
            : [...prev.questionTypes, type];
        return { ...prev, questionTypes: newTypes };
    });
  };

  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (materials.length === 0) {
      setError('Please upload at least one course material file.');
      return;
    }
    setError(null);

    const difficultyMultiplier = { [Difficulty.BEGINNER]: 1.0, [Difficulty.INTERMEDIATE]: 1.2, [Difficulty.ADVANCED]: 1.5 };
    const estimatedTime = Math.round((15 + examConfig.numQuestions * 2) * difficultyMultiplier[examConfig.difficulty]);
    setCountdown(estimatedTime);

    setIsLoading(true);
    try {
      const questions = await generateExam(examConfig, materials);
      if (questions && questions.length > 0) {
        onExamStart(questions, examConfig);
      } else {
        setError('The AI could not generate an exam from the provided materials. Please try different files or settings.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
      setCountdown(0);
    }
  };

  const handlePracticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (materials.length === 0) {
      setError('Please upload at least one course material file.');
      return;
    }
    if (practiceConfig.topics.length === 0) {
        setError('Please select at least one topic for your practice quiz.');
        return;
    }
    if (practiceConfig.questionTypes.length === 0) {
        setError('Please select at least one question type.');
        return;
    }

    setError(null);
    const estimatedTime = Math.round(practiceConfig.numQuestions * 2.5);
    setCountdown(estimatedTime);
    setIsLoading(true);

    try {
        const questions = await generatePracticeQuiz(practiceConfig);
        if (questions && questions.length > 0) {
            onPracticeStart(questions);
        } else {
            setError('The AI could not generate a practice quiz with the selected options. Please try again.');
        }
    } catch (err) {
        setError((err as Error).message);
    } finally {
        setIsLoading(false);
        setCountdown(0);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-primary-600 dark:text-primary-400 mb-2">Create Your Custom Study Session</h2>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-6">Upload your materials, then choose a timed exam or a targeted practice quiz.</p>

        {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6 max-w-4xl mx-auto" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        <div className="grid lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-3">
                <div className="interactive-card" ref={cardRef} onMouseMove={handleMouseMove}>
                    <div className="interactive-card-bg"></div>
                    <div className="interactive-card-content p-6 md:p-8">
                        {/* File Upload Section */}
                        <div>
                          <label className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2 block">1. Upload Course Materials</label>
                          <div onDrop={handleDrop} className={`file-drop-area group mt-2 flex cursor-pointer justify-center rounded-lg px-6 py-10 transition-colors ${isDragging ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                            <div className="text-center">
                              <UploadIcon className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500 transition-all duration-300 group-hover:scale-110 group-hover:text-primary-500" />
                              <div className="mt-4 flex text-sm leading-6 text-slate-600 dark:text-slate-400">
                                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-transparent font-semibold text-primary-600 dark:text-primary-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-800 hover:text-primary-500">
                                  <span>Upload files</span>
                                  <input id="file-upload" name="file--upload" type="file" className="sr-only" multiple onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt,image/*" />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                              </div>
                              <p className="text-xs leading-5 text-slate-500 dark:text-slate-500">PDF, DOCX, TXT, PNG, JPG up to 10MB</p>
                            </div>
                          </div>
                           {materials.length > 0 && (
                            <div className="mt-4">
                              {isExtractingTopics && materials.length === 0 && (
                                <div className="flex items-center gap-2 text-slate-500 mb-2"><div className="scale-50 -m-4"><Loader /></div><span>Processing files...</span></div>
                              )}
                              <h3 className="font-semibold text-sm text-slate-600 dark:text-slate-400">Uploaded files:</h3>
                              <ul className="mt-2 space-y-2">
                                {materials.map((material, index) => (
                                  <li key={index} className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-2 rounded-md text-sm">
                                      <div className="flex items-center gap-2 truncate">
                                          <DocumentTextIcon className="h-5 w-5 text-slate-500 flex-shrink-0"/>
                                          <span className="font-medium truncate">{material.name}</span>
                                      </div>
                                    <button type="button" onClick={() => handleRemoveMaterial(index)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                                      <XCircleIcon className="h-5 w-5" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="mt-8">
                            <label className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4 block">2. Choose Your Mode</label>
                            <div className="flex w-full rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
                                <button onClick={() => setMode('exam')} className={`w-1/2 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-colors ${mode === 'exam' ? 'bg-primary-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'}`}>
                                    <BookOpenIcon className="h-5 w-5" /> Custom Exam
                                </button>
                                <button onClick={() => setMode('practice')} className={`w-1/2 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-colors ${mode === 'practice' ? 'bg-primary-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'}`}>
                                    <BeakerIcon className="h-5 w-5" /> Practice Quiz
                                </button>
                            </div>
                        </div>

                        {mode === 'exam' ? (
                          <form onSubmit={handleExamSubmit} className="space-y-8 mt-6 animate-fade-in">
                            <div>
                                <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-4 block">Exam Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label htmlFor="type" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Exam Type</label>
                                        <select id="type" name="type" value={examConfig.type} onChange={handleExamConfigChange} className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm">
                                            {Object.values(ExamType).map(type => <option key={type}>{type}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="difficulty" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Difficulty</label>
                                        <select id="difficulty" name="difficulty" value={examConfig.difficulty} onChange={handleExamConfigChange} className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm">
                                            {Object.values(Difficulty).map(d => <option key={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="intensity" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Time Intensity</label>
                                        <select id="intensity" name="intensity" value={examConfig.intensity} onChange={handleExamConfigChange} className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm">
                                            {Object.values(TimeIntensity).map(i => <option key={i}>{i}</option>)}
                                        </select>
                                    </div>
                                     <div>
                                        <label htmlFor="numQuestions" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Questions</label>
                                        <input type="number" id="numQuestions" name="numQuestions" min="1" max="50" value={examConfig.numQuestions} onChange={handleExamConfigChange} className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm" />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button type="submit" disabled={isLoading || materials.length === 0} className="flex items-center justify-center gap-2 w-full md:w-auto rounded-md bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600">
                                {isLoading ? (<><div className="scale-50 -m-4"><Loader /></div> Generating Exam... ({formatTime(countdown)})</>) : (<><SparklesIcon className="h-5 w-5" /> Generate Exam</>)}
                                </button>
                            </div>
                          </form>
                        ) : (
                          <form onSubmit={handlePracticeSubmit} className="space-y-8 mt-6 animate-fade-in">
                            <div>
                                <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Quiz Settings</h3>
                                {isExtractingTopics ? ( <div className="flex items-center gap-2 text-slate-500"><div className="scale-50 -m-4"><Loader /></div><span>Analyzing topics...</span></div> ) :
                                (extractedTopics.length > 0 ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Select Topics</label>
                                    <div className="flex flex-wrap gap-2">
                                        {extractedTopics.map(topic => (
                                            <button type="button" key={topic} onClick={() => handleTopicToggle(topic)} className={`px-3 py-1 text-sm rounded-full transition-colors ${practiceConfig.topics.includes(topic) ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                                                {topic}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                ) : null)}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Select Question Types</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(QuestionType).filter(t => t !== QuestionType.ESSAY).map(type => (
                                        <button type="button" key={type} onClick={() => handleQuestionTypeToggle(type)} className={`px-3 py-1 text-sm rounded-full transition-colors ${practiceConfig.questionTypes.includes(type) ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="difficulty" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Difficulty</label>
                                    <select id="difficulty" name="difficulty" value={practiceConfig.difficulty} onChange={handlePracticeConfigChange} className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm">
                                        {Object.values(Difficulty).map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="numQuestions" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Questions</label>
                                    <input type="number" id="numQuestions" name="numQuestions" min="1" max="20" value={practiceConfig.numQuestions} onChange={handlePracticeConfigChange} className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button type="submit" disabled={isLoading || materials.length === 0 || isExtractingTopics} className="flex items-center justify-center gap-2 w-full md:w-auto rounded-md bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600">
                                {isLoading ? (<><div className="scale-50 -m-4"><Loader /></div> Starting Practice... ({formatTime(countdown)})</>) : (<><SparklesIcon className="h-5 w-5" /> Start Practice</>)}
                                </button>
                            </div>
                          </form>
                        )}
                    </div>
                </div>
            </div>
            <div className="hidden lg:block lg:col-span-2 sticky top-24">
                <InspirationCard />
            </div>
        </div>

        <div className="mt-16">
            <HistoryList history={history} onViewResult={onViewResult} />
        </div>

        <div className="mt-12 text-center text-sm text-slate-400 dark:text-slate-500">
          <button onClick={() => setShowInfoModal(true)} className="hover:text-primary-500 underline">
            FAQ & Terms and Conditions
          </button>
        </div>
        {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} />}
    </div>
  );
};

export default SetupScreen;
