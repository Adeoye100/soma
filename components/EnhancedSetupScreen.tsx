import React, { useState, useCallback, useEffect } from 'react';
import { ExamConfig, ExamType, Difficulty, TimeIntensity, Material, Question } from '../types';
import { generateExam } from '../services/geminiService';
import { documentProcessor } from '../services/documentProcessor';
import { UploadIcon, DocumentTextIcon, XCircleIcon, CheckCircleIcon, AlertCircleIcon } from './icons';
import Loader from './Loader';
import InspirationCard from './InspirationCard';
import ProfileCard from './ProfileCard';
import ShaderBackground from './ShaderBackground';
import { ProcessingProgress } from '../types/documentProcessing';

interface EnhancedSetupScreenProps {
  onExamStart: (questions: Question[], config: ExamConfig) => void;
}

interface FileProcessingStatus {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: ProcessingProgress;
  error?: string;
  result?: {
    originalSize: number;
    pdfSize: number;
    compressionRatio: number;
  };
}

const TIME_PER_INTENSITY: Record<TimeIntensity, number> = {
  [TimeIntensity.RELAXED]: 180,    // 3 minutes per question
  [TimeIntensity.MODERATE]: 90,    // 1.5 minutes per question
  [TimeIntensity.CHALLENGING]: 45, // 45 seconds per question
};

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

const calculateTotalTime = (intensity: TimeIntensity, numQuestions: number): number => {
  return TIME_PER_INTENSITY[intensity] * numQuestions;
};

const EnhancedSetupScreen: React.FC<EnhancedSetupScreenProps> = ({ onExamStart }) => {
  const [config, setConfig] = useState<ExamConfig>({
    type: ExamType.OBJECTIVE,
    difficulty: Difficulty.INTERMEDIATE,
    intensity: TimeIntensity.MODERATE,
    numQuestions: 10,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingFiles, setProcessingFiles] = useState<FileProcessingStatus[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [processorStats, setProcessorStats] = useState<any>(null);

  const totalTimeSeconds = calculateTotalTime(config.intensity, config.numQuestions);
  const formattedTime = formatTime(totalTimeSeconds);

  // Monitor processor stats
  useEffect(() => {
    const interval = setInterval(() => {
      setProcessorStats(documentProcessor.getProcessingStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Reset previous processing state
      setProcessingFiles(files.map(file => ({ file, status: 'pending' })));
      setError(null);
      setOverallProgress(0);
      setProcessingStage('');

      // Process files with automatic conversion
      await processFilesWithConversion(files);
    }
  };

  const processFilesWithConversion = async (files: File[]) => {
    try {
      setProcessingStage('Initializing document processor...');
      setOverallProgress(5);

      // Process files with automatic conversion
      const results = await documentProcessor.processFiles(files, {
        onProgress: (completed, total) => {
          const progress = ((completed / total) * 80) + 10; // 10-90% for processing
          setOverallProgress(progress);
          setProcessingStage(`Processing files... (${completed}/${total})`);
          
          // Update individual file statuses
          setProcessingFiles(prev => prev.map((fileStatus, index) => {
            if (index < completed) {
              return { ...fileStatus, status: 'completed' };
            } else if (index === completed) {
              return { ...fileStatus, status: 'processing' };
            }
            return fileStatus;
          }));
        },
        maxConcurrency: 2 // Limit concurrent processing
      });

      // Update final statuses
      setProcessingFiles(prev => prev.map((fileStatus, index) => {
        const result = results[index];
        if (result && result.success) {
          return {
            ...fileStatus,
            status: 'completed',
            result: {
              originalSize: result.metadata.originalSize,
              pdfSize: result.metadata.pdfSize,
              compressionRatio: result.metadata.compressionRatio
            }
          };
        } else {
          return {
            ...fileStatus,
            status: 'error',
            error: result?.error || 'Unknown processing error'
          };
        }
      }));

      setOverallProgress(100);
      setProcessingStage('File processing completed');

      // Check for any errors
      const failedFiles = results.filter(result => !result?.success);
      if (failedFiles.length > 0) {
        setError(`Some files failed to process: ${failedFiles.map(f => f?.error).join(', ')}`);
      }

    } catch (error) {
      console.error('File processing error:', error);
      setError(`File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setProcessingFiles(prev => prev.map(fileStatus => ({
        ...fileStatus,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })));
    }
  };

  const handleRemoveMaterial = (index: number) => {
    setProcessingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: name === 'numQuestions' ? parseInt(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (processingFiles.length === 0) {
      setError('Please upload at least one course material file.');
      return;
    }

    // Check if all files are successfully processed
    const unprocessedFiles = processingFiles.filter(f => f.status !== 'completed');
    if ( unprocessedFiles.length > 0) {
      setError('Please wait for all files to finish processing before generating the exam.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setProcessingStage('Converting files to materials...');
    setOverallProgress(5);

    try {
      // Convert processed files to Materials format
      const processedFiles = processingFiles
        .filter(f => f.status === 'completed')
        .map(f => f.file);
      
      setOverallProgress(15);
      setProcessingStage('Preparing materials for AI processing...');

      const materials = await documentProcessor.convertToMaterials(processedFiles);
      
      setOverallProgress(25);
      setProcessingStage('Generating exam questions...');

      // Generate exam using the processed materials
      const questions = await generateExam(config, materials);
      
      setOverallProgress(100);
      setProcessingStage('Exam generated successfully!');

      if (questions && questions.length > 0) {
        onExamStart(questions, config);
      } else {
        setError('The AI could not generate an exam from the provided materials. Please try different files or settings.');
      }
    } catch (err) {
      console.error('Exam generation error:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
      setOverallProgress(0);
      setProcessingStage('');
    }
  };

  const getFileStatusIcon = (status: FileProcessingStatus['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />;
      case 'processing':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getFileStatusText = (fileStatus: FileProcessingStatus) => {
    if (fileStatus.status === 'processing' && fileStatus.progress) {
      return `${fileStatus.progress.message} (${fileStatus.progress.progress.toFixed(0)}%)`;
    }
    
    switch (fileStatus.status) {
      case 'pending':
        return 'Waiting to process...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        if (fileStatus.result) {
          const saved = fileStatus.result.originalSize - fileStatus.result.pdfSize;
          const savedPercent = ((saved / fileStatus.result.originalSize) * 100).toFixed(1);
          return `Processed (${savedPercent}% size reduction)`;
        }
        return 'Processing completed';
      case 'error':
        return fileStatus.error || 'Processing failed';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader text={processingStage || "Generating your exam..."} />
        <div className="mt-4 w-64 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {overallProgress.toFixed(0)}% complete
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
        <div className="hidden lg:block lg:w-1/3">
          <div className="sticky top-32 md:top-36 space-y-8">
            <InspirationCard />
            {processorStats && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  System Status
                </h3>
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <div>Queue: {processorStats.queueLength} files</div>
                  <div>Processing: {processorStats.isProcessing ? 'Yes' : 'No'}</div>
                  <div>Temp Files: {processorStats.tempFilesCount}</div>
                  {processorStats.memoryPressure && (
                    <div className="text-orange-600">Memory pressure detected</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full lg:flex-1">
          <ShaderBackground>
            <div className="p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-primary-600 dark:text-primary-400 mb-6">
                Create Your Exam
              </h2>

              {error && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-3 sm:px-4 py-3 rounded-lg relative mb-6 text-sm" role="alert">
                  <strong className="font-bold">Error: </strong>
                  <span className="block sm:inline whitespace-pre-line">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                {/* File Upload Section */}
                <div>
                  <label className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                    1. Upload Materials
                  </label>
                  <div className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 px-4 sm:px-6 py-6 sm:py-8">
                    <div className="text-center">
                      <UploadIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-slate-400 dark:text-slate-500" />
                      <div className="mt-4 flex flex-col sm:flex-row text-xs sm:text-sm leading-6 text-slate-600 dark:text-slate-400 gap-1">
                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white dark:bg-slate-800 font-semibold text-primary-600 dark:text-primary-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-800 hover:text-primary-500">
                          <span>Upload files</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only" 
                            multiple 
                            onChange={handleFileChange} 
                            accept=".pdf,.doc,.docx,.pptx,.txt,image/*" 
                          />
                        </label>
                        <p className="sm:pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs leading-5 text-slate-500 dark:text-slate-500 mt-2">
                        PDF, DOCX, PPTX, TXT, PNG, JPG up to 10MB (Automatic PDF conversion for Office files)
                      </p>
                    </div>
                  </div>

                  {/* Processing Status */}
                  {processingFiles.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-semibold text-sm sm:text-base mb-2">Processing Status:</h3>
                      <div className="space-y-2">
                        {processingFiles.map((fileStatus, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-3 rounded-md text-xs sm:text-sm">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <DocumentTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 flex-shrink-0" />
                              <span className="font-medium truncate">{fileStatus.file.name}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              {getFileStatusIcon(fileStatus.status)}
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {getFileStatusText(fileStatus)}
                              </span>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveMaterial(index)} 
                                className="text-slate-400 hover:text-red-500 flex-shrink-0 ml-1"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Exam Configuration Section */}
                <div>
                  <label className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4 block">
                    2. Configure Settings
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Exam Type */}
                    <div>
                      <label htmlFor="type" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
                        Type
                      </label>
                      <select 
                        id="type" 
                        name="type" 
                        value={config.type} 
                        onChange={handleConfigChange} 
                        className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-2 sm:px-3 text-xs sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                      >
                        {Object.values(ExamType).map(type => <option key={type}>{type}</option>)}
                      </select>
                    </div>

                    {/* Difficulty */}
                    <div>
                      <label htmlFor="difficulty" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
                        Difficulty
                      </label>
                      <select 
                        id="difficulty" 
                        name="difficulty" 
                        value={config.difficulty} 
                        onChange={handleConfigChange} 
                        className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-2 sm:px-3 text-xs sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                      >
                        {Object.values(Difficulty).map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>

                    {/* Time Intensity */}
                    <div>
                      <label htmlFor="intensity" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
                        Speed
                      </label>
                      <select 
                        id="intensity" 
                        name="intensity" 
                        value={config.intensity} 
                        onChange={handleConfigChange} 
                        className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-2 sm:px-3 text-xs sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                      >
                        {Object.values(TimeIntensity).map(i => (
                          <option key={i} value={i}>
                            {i} ({formatTime(TIME_PER_INTENSITY[i])}/question)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Number of Questions */}
                    <div>
                      <label htmlFor="numQuestions" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
                        Questions
                      </label>
                      <input 
                        type="number" 
                        id="numQuestions" 
                        name="numQuestions" 
                        min="1" 
                        max="50" 
                        value={config.numQuestions} 
                        onChange={handleConfigChange} 
                        className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-2 sm:px-3 text-xs sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500" 
                      />
                    </div>
                  </div>

                  {/* Time Calculation Display */}
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                      ⏱️ Estimated Exam Time
                    </h3>
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
                    disabled={isLoading || processingFiles.length === 0 || processingFiles.some(f => f.status !== 'completed')}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-md bg-primary-600 px-6 py-3 text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600 transition-colors"
                  >
                    {processingFiles.some(f => f.status === 'processing') ? 'Processing Files...' : 'Generate Exam'}
                  </button>
                </div>
              </form>
            </div>
          </ShaderBackground>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSetupScreen;