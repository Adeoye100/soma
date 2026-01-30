
import React, { useState, useCallback } from 'react';
import { ExamConfig, ExamType, Difficulty, TimeIntensity, Material, Question } from '../types';
import { generateExam } from '../services/geminiService';
import { UploadIcon, DocumentTextIcon, XCircleIcon } from './icons';
import Loader from './Loader';
import InspirationCard from './InspirationCard';
import ProfileCard from './ProfileCard';
import ShaderBackground from './ShaderBackground';

interface SetupScreenProps {
  onExamStart: (questions: Question[], config: ExamConfig) => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });

// Enhanced file validation
const validateFile = (file: File): string | null => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'application/docx',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/jpg'
  ];
  
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.pptx', '.txt', '.png', '.jpg', '.jpeg'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  // Check file size
  if (file.size > maxSize) {
    return `${file.name} is too large. Maximum size is 10MB.`;
  }
  
  // Check file type and extension
  const hasValidExtension = allowedExtensions.includes(fileExtension);
  const hasValidType = allowedTypes.includes(file.type) || file.type.startsWith('image/');
  
  if (!hasValidExtension && !hasValidType) {
    return `${file.name} is not a supported file type. Supported formats: PDF, DOCX, PPTX, TXT, PNG, JPG`;
  }
  
  return null;
};

// Enhanced MIME type detection
const getMimeType = (file: File): string => {
  const extension = file.name.toLowerCase().split('.').pop();
  const mimeTypeMap: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg'
  };
  
  // Use browser-detected type first, fallback to extension-based detection
  return file.type || mimeTypeMap[extension || ''] || 'application/octet-stream';
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
    type: ExamType.OBJECTIVE,
    difficulty: Difficulty.INTERMEDIATE,
    intensity: TimeIntensity.MODERATE,
    numQuestions: 10,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate total time based on current config
  const totalTimeSeconds = calculateTotalTime(config.intensity, config.numQuestions);
  const formattedTime = formatTime(totalTimeSeconds);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newMaterials: Material[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];
      
      for (const file of files) {
        // Validate file
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
          continue;
        }
        
        try {
          const content = await fileToBase64(file);
          const mimeType = getMimeType(file);
          newMaterials.push({ name: file.name, content, mimeType });
          
          // Add warning for Office files that AI can't process
          const officeExtensions = ['.doc', '.docx', '.pptx'];
          const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
          if (officeExtensions.includes(fileExtension)) {
            warnings.push(`⚠️ ${file.name}: AI cannot process Office files. Please convert to PDF for exam generation.`);
          }
        } catch (err) {
          errors.push(`Failed to read file: ${file.name}`);
        }
      }
      
      // Combine errors and warnings
      const allMessages = [...errors, ...warnings];
      if (allMessages.length > 0) {
        setError(allMessages.join('\n'));
      } else {
        setError(null);
      }
      
      setMaterials(prev => [...prev, ...newMaterials]);
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
    if (materials.length === 0) {
      setError('Please upload at least one course material file.');
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
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-primary-600 dark:text-primary-400 mb-6">Create Your Exam</h2>

             {error && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-3 sm:px-4 py-3 rounded-lg relative mb-6 text-sm" role="alert">
                    <strong className="font-bold">Error: </strong>
                     <span className="block sm:inline whitespace-pre-line">{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {/* File Upload Section */}
              <div>
                <label className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2 block">1. Upload Materials</label>
                <div className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 px-4 sm:px-6 py-6 sm:py-8">
                  <div className="text-center">
                    <UploadIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-slate-400 dark:text-slate-500" />
                    <div className="mt-4 flex flex-col sm:flex-row text-xs sm:text-sm leading-6 text-slate-600 dark:text-slate-400 gap-1">
                      <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white dark:bg-slate-800 font-semibold text-primary-600 dark:text-primary-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-800 hover:text-primary-500">
                        <span>Upload files</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} accept=".pdf,.doc,.docx,.pptx,.txt,image/*" />
                      </label>
                      <p className="sm:pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs leading-5 text-slate-500 dark:text-slate-500 mt-2">PDF, TXT, PNG, JPG up to 10MB (Note: Convert PPTX/DOCX to PDF for AI processing)</p>
                  </div>
                </div>
                 {materials.length > 0 && (
                   <div className="mt-4">
                    <h3 className="font-semibold text-sm sm:text-base">Uploaded files:</h3>
                    <ul className="mt-2 space-y-2">
                      {materials.map((material, index) => (
                        <li key={index} className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-2 sm:p-3 rounded-md text-xs sm:text-sm">
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
                <label className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4 block">2. Configure Settings</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Exam Type */}
                    <div>
                        <label htmlFor="type" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Type</label>
                        <select id="type" name="type" value={config.type} onChange={handleConfigChange} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-2 sm:px-3 text-xs sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500">
                            {Object.values(ExamType).map(type => <option key={type}>{type}</option>)}
                        </select>
                    </div>
                    {/* Difficulty */}
                    <div>
                        <label htmlFor="difficulty" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Difficulty</label>
                        <select id="difficulty" name="difficulty" value={config.difficulty} onChange={handleConfigChange} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-2 sm:px-3 text-xs sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500">
                            {Object.values(Difficulty).map(d => <option key={d}>{d}</option>)}
                        </select>
                    </div>
                    {/* Time Intensity */}
                    <div>
                        <label htmlFor="intensity" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Speed</label>
                        <select id="intensity" name="intensity" value={config.intensity} onChange={handleConfigChange} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-2 sm:px-3 text-xs sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500">
                            {Object.values(TimeIntensity).map(i => (
                                <option key={i} value={i}>
                                    {i} ({formatTime(TIME_PER_INTENSITY[i])}/question)
                                </option>
                            ))}
                        </select>
                    </div>
                     {/* Number of Questions */}
                     <div>
                        <label htmlFor="numQuestions" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Questions</label>
                        <input type="number" id="numQuestions" name="numQuestions" min="1" max="50" value={config.numQuestions} onChange={handleConfigChange} className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-2 sm:px-3 text-xs sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500" />
                    </div>
                </div>

                {/* Time Calculation Display */}
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">⏱️ Estimated Exam Time</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {formattedTime}
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
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
