
import React, { useState } from 'react';
import { ExamConfig, ExamType, Difficulty, TimeIntensity, Material, Question } from '../types';
import { generateExam } from '../services/geminiService';
import { UploadIcon, DocumentTextIcon, XCircleIcon } from './icons';
import Loader from './Loader';
import InspirationCard from './InspirationCard';
import ShaderBackground from './ShaderBackground';
import { extractTextFromFile } from '../utils/extractText';

interface SetupScreenProps {
  onExamStart: (questions: Question[], config: ExamConfig) => void;
}

// Enhanced file validation
const validateFile = (file: File): string | null => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'application/docx',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.ms-excel',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/jpg'
  ];
  
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.pptx', '.ppt', '.xlsx', '.xls', '.txt', '.csv', '.png', '.jpg', '.jpeg'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  // Check file size
  if (file.size > maxSize) {
    return `${file.name} is too large. Maximum size is 10MB.`;
  }
  
  // Check file type and extension
  const hasValidExtension = allowedExtensions.includes(fileExtension);
  const hasValidType = allowedTypes.includes(file.type) || file.type.startsWith('image/');
  
  if (!hasValidExtension && !hasValidType) {
    return `${file.name} is not a supported file type. Supported formats: PDF, DOCX, PPTX, XLSX, TXT, CSV, PNG, JPG`;
  }
  
  return null;
};


// Time per intensity level in seconds
const TIME_PER_INTENSITY: Record<TimeIntensity, number> = {
  [TimeIntensity.RELAXED]: 180,    // 3 minutes per question
  [TimeIntensity.MODERATE]: 90,    // 1.5 minutes per question
  [TimeIntensity.CHALLENGING]: 45, // 45 seconds per question
};

// Format time in seconds to readable format
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

// Calculate total time for exam
const calculateTotalTime = (intensity: TimeIntensity, numQuestions: number): number => {
  return TIME_PER_INTENSITY[intensity] * numQuestions;
};

const SetupScreen: React.FC<SetupScreenProps> = ({ onExamStart }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [config, setConfig] = useState<ExamConfig>({
    title: '',
    topics: '',
    type: ExamType.OBJECTIVE,
    difficulty: Difficulty.INTERMEDIATE,
    intensity: TimeIntensity.MODERATE,
    numQuestions: 10,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Calculate total time based on current config
  const totalTimeSeconds = calculateTotalTime(config.intensity, config.numQuestions);
  const formattedTime = formatTime(totalTimeSeconds);

  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-powerpoint',
    'application/vnd.ms-excel',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
  ];

  const processFiles = async (files: File[]) => {
    const newMaterials: Material[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        errors.push(
          `"${file.name}" is not a supported file type. ` +
          `Please upload PDF, DOCX, PPTX, XLSX, TXT, CSV, PNG, or JPG.`
        );
        continue;
      }

      const validationError = validateFile(file);
      if (validationError) {
        errors.push(validationError);
        continue;
      }

      try {
        const textContent = await extractTextFromFile(file);
        newMaterials.push({ name: file.name, content: textContent, mimeType: file.type });
      } catch (err) {
        errors.push(`Failed to process file ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      setError(errors.join('\n'));
    } else {
      setError(null);
    }

    setMaterials(prev => [...prev, ...newMaterials]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemoveMaterial = (index: number) => {
      setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: name === 'numQuestions' ? parseInt(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = (config.title || '').trim();
    if (!trimmedTitle || trimmedTitle.length < 3) {
      setError('Please enter an exam title of at least 3 characters.');
      return;
    }
    if (trimmedTitle.length > 100) {
      setError('Exam title must be 100 characters or fewer.');
      return;
    }

    const topicsArray = config.topics
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (topicsArray.length === 0) {
      setError('Please enter at least one topic to continue.');
      return;
    }
    if (materials.length === 0) {
      setError('Please upload at least one course material file.');
      return;
    }

    const invalidMaterial = materials.find(m => !m.mimeType || m.mimeType.trim() === '');
    if (invalidMaterial) {
      setError(`File "${invalidMaterial.name}" has no recognized type. Please re-upload.`);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const questions = await generateExam(config, materials);
      if (questions && questions.length > 0) {
        onExamStart(questions, config);
      } else {
        setError('The AI could not generate an exam from the provided materials. Please try different files or settings.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader text="Generating your exam..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
        <div className="hidden lg:block lg:w-1/3">
          <div className="sticky top-32 md:top-36 space-y-8">
            <InspirationCard />
          </div>
        </div>
        <div className="w-full lg:flex-1">
          <ShaderBackground><div className="p-4 sm:p-6 md:p-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-primary-600 dark:text-primary-400 mb-6 transition-colors duration-300">Create Your Exam</h2>

             {error && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-3 sm:px-4 py-3 rounded-lg relative mb-6 text-sm" role="alert">
                    <strong className="font-bold">Error: </strong>
                     <span className="block sm:inline whitespace-pre-line">{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {/* Title Section */}
              <div>
                <label htmlFor="title" className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2 block transition-colors duration-300">
                  1. Exam Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="e.g. Database Systems Mid-Semester Exam..."
                  value={config.title}
                  onChange={handleConfigChange}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2.5 px-3 sm:px-4 text-sm sm:text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 transition-colors duration-300"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 transition-colors duration-300">
                  Give your exam a descriptive title (3–100 characters).
                </p>
              </div>

              {/* Topics Section */}
              <div>
                <label htmlFor="topics" className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2 block transition-colors duration-300">2. Topics to generate from</label>
                <input
                  type="text"
                  id="topics"
                  name="topics"
                  placeholder="e.g. Photosynthesis, Newton's Laws, Cell Division..."
                  value={config.topics}
                  onChange={handleConfigChange}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2.5 px-3 sm:px-4 text-sm sm:text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 transition-colors duration-300"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 transition-colors duration-300">
                  Separate each topic with a comma. Questions will be drawn from these areas.
                </p>
                {(() => {
                  const topicsArray = config.topics
                    .split(',')
                    .map(t => t.trim())
                    .filter(Boolean);
                  return (
                    <>
                      {topicsArray.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {topicsArray.map((topic, index) => (
                            <span
                              key={index}
                              className="bg-[#1e3a5f] text-[#93c5fd] rounded-full px-3 py-0.5 text-xs"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                      {topicsArray.length > 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          {topicsArray.length} topic{topicsArray.length !== 1 ? 's' : ''} detected
                        </p>
                      )}
                      {topicsArray.length === 1 && (
                        <p className="text-xs text-amber-500 mt-2">
                          Add more topics for a well-rounded exam
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* File Upload Section */}
              <div>
                <label className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2 block transition-colors duration-300">3. Upload Materials</label>
                <div 
                  className={`mt-2 flex justify-center rounded-lg border-2 border-dashed px-4 sm:px-6 py-6 sm:py-8 transition-colors duration-200 ${
                    isDragging 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' 
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="text-center">
                    <UploadIcon className={`mx-auto h-10 w-10 sm:h-12 sm:w-12 transition-colors duration-200 ${
                      isDragging ? 'text-primary-500' : 'text-slate-400 dark:text-slate-500'
                    }`} />
                    <div className="mt-4 flex flex-col sm:flex-row text-xs sm:text-sm leading-6 text-slate-600 dark:text-slate-400 gap-1">
                      <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white dark:bg-slate-800 font-semibold text-primary-600 dark:text-primary-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-800 hover:text-primary-500 transition-colors duration-300">
                        <span>Upload files</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} accept=".pdf,.doc,.docx,.pptx,.xlsx,.xls,.txt,.csv,image/*" />
                      </label>
                      <p className="sm:pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs leading-5 text-slate-500 dark:text-slate-500 mt-2 transition-colors duration-300">PDF, DOCX, PPTX, XLSX, TXT, CSV, PNG, JPG up to 10MB</p>
                  </div>
                </div>
                 {materials.length > 0 && (
                   <div className="mt-4">
                    <h3 className="font-semibold text-sm sm:text-base transition-colors duration-300">Uploaded files:</h3>
                    <ul className="mt-2 space-y-2">
                      {materials.map((material, index) => (
                        <li key={index} className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-2 sm:p-3 rounded-md text-xs sm:text-sm transition-colors duration-300">
                            <div className="flex items-center gap-2 min-w-0">
                                <DocumentTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 flex-shrink-0"/>
                                <span className="font-medium truncate">{material.name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">({material.mimeType})</span>
                            </div>
                          <button type="button" onClick={() => handleRemoveMaterial(index)} className="text-slate-400 hover:text-red-500 flex-shrink-0 ml-2">
                            <XCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Exam Configuration Section */}
              <div>
                <label className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4 block transition-colors duration-300">4. Configure Settings</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Exam Type */}
                    <div>
                        <label htmlFor="type" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors duration-300">Type</label>
                        <select id="type" name="type" value={config.type} onChange={handleConfigChange} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-2 sm:px-3 text-xs sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 transition-colors duration-300">
                            {Object.values(ExamType).map(type => <option key={type}>{type}</option>)}
                        </select>
                    </div>
                    {/* Difficulty */}
                    <div>
                        <label htmlFor="difficulty" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors duration-300">Difficulty</label>
                        <select id="difficulty" name="difficulty" value={config.difficulty} onChange={handleConfigChange} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-2 sm:px-3 text-xs sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 transition-colors duration-300">
                            {Object.values(Difficulty).map(d => <option key={d}>{d}</option>)}
                        </select>
                    </div>
                    {/* Time Intensity */}
                    <div>
                        <label htmlFor="intensity" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors duration-300">Speed</label>
                        <select id="intensity" name="intensity" value={config.intensity} onChange={handleConfigChange} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-2 sm:px-3 text-xs sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 transition-colors duration-300">
                            {Object.values(TimeIntensity).map(i => (
                                <option key={i} value={i}>
                                    {i} ({formatTime(TIME_PER_INTENSITY[i])}/question)
                                </option>
                            ))}
                        </select>
                    </div>
                     {/* Number of Questions */}
                     <div>
                        <label htmlFor="numQuestions" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors duration-300">Questions</label>
                        <input type="number" id="numQuestions" name="numQuestions" min="1" max="50" value={config.numQuestions} onChange={handleConfigChange} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-2 sm:px-3 text-xs sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 transition-colors duration-300" />
                    </div>
                </div>

                {/* Time Calculation Display */}
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors duration-300">
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2 transition-colors duration-300">⏱️ Estimated Exam Time</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 transition-colors duration-300">
                      {formattedTime}
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300 transition-colors duration-300">
                      <div>Speed: {config.intensity}</div>
                      <div>Questions: {config.numQuestions}</div>
                      <div>Time per question: {formatTime(TIME_PER_INTENSITY[config.intensity])}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submission Button */}
              <div className="pt-4 flex flex-col sm:flex-row sm:justify-end gap-3">
                <button
                  type="submit"
                  disabled={isLoading || materials.length === 0}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-md bg-primary-600 px-6 py-3 text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600 transition-colors"
                >
                  Generate Exam
                </button>
              </div>
            </form></div>
          </ShaderBackground>
        </div>
      </div>
    </div>
  );
};


export default SetupScreen;
