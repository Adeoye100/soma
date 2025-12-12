import React, { useState, useCallback } from 'react';
import { convertForExamProcessing, canConvertForExamProcessing, estimateConversionTime } from '../utils/convertToPdf';

interface DocumentConverterProps {
  onConversionComplete: (pdfFile: File) => void;
  onConversionError: (error: string) => void;
}

interface ConversionProgress {
  stage: string;
  progress: number;
  message: string;
}

const DocumentConverter: React.FC<DocumentConverterProps> = ({
  onConversionComplete,
  onConversionError
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationError(null);
    setProgress(null);

    // Validate file
    const validation = canConvertForExamProcessing(file);
    if (!validation.canConvert) {
      setValidationError(validation.reason || 'Invalid file');
      setSelectedFile(null);
      return;
    }

    // Estimate conversion time
    const time = estimateConversionTime(file);
    setEstimatedTime(time);
  }, []);

  // Handle conversion
  const handleConvert = useCallback(async () => {
    if (!selectedFile) return;

    setIsConverting(true);
    setProgress({ stage: 'initialization', progress: 0, message: 'Initializing conversion...' });

    try {
      const pdfFile = await convertForExamProcessing(selectedFile, (progressUpdate) => {
        setProgress(progressUpdate);
      });

      onConversionComplete(pdfFile);
      
      // Reset state
      setSelectedFile(null);
      setProgress(null);
      setEstimatedTime(0);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error';
      onConversionError(errorMessage);
      setValidationError(errorMessage);
    } finally {
      setIsConverting(false);
    }
  }, [selectedFile, onConversionComplete, onConversionError]);

  // Get stage icon
  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'validation':
        return '🔍';
      case 'extraction':
        return '📄';
      case 'generation':
        return '🔄';
      case 'formatting':
        return '🎨';
      case 'rendering':
        return '📋';
      case 'completion':
        return '✅';
      default:
        return '⚙️';
    }
  };

  // Format time
  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <div className="document-converter p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Document Converter for Exam Processing
      </h2>

      {/* File Upload */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Document (.docx or .pptx)
        </label>
        <input
          type="file"
          accept=".docx,.pptx"
          onChange={handleFileSelect}
          disabled={isConverting}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
      </div>

      {/* File Information */}
      {selectedFile && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="text-sm">
            <div className="font-medium text-gray-700">Selected file:</div>
            <div className="text-gray-600">{selectedFile.name}</div>
            <div className="text-gray-500">
              Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </div>
            {estimatedTime > 0 && (
              <div className="text-gray-500">
                Estimated time: {formatTime(estimatedTime)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-600">{validationError}</div>
        </div>
      )}

      {/* Conversion Progress */}
      {progress && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {getStageIcon(progress.stage)} {progress.message}
            </span>
            <span className="text-sm text-gray-500">{progress.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Convert Button */}
      <button
        onClick={handleConvert}
        disabled={!selectedFile || isConverting}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isConverting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Converting...
          </span>
        ) : (
          'Convert to PDF'
        )}
      </button>

      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Supported formats:</strong> Microsoft Word (.docx), PowerPoint (.pptx)</p>
        <p><strong>Maximum size:</strong> 10MB</p>
        <p><strong>Output:</strong> PDF optimized for exam processing</p>
      </div>
    </div>
  );
};

// Example usage component
const ExamDocumentProcessor: React.FC = () => {
  const [convertedFiles, setConvertedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleConversionComplete = useCallback((pdfFile: File) => {
    setConvertedFiles(prev => [...prev, pdfFile]);
    console.log('✅ Document converted successfully:', pdfFile.name);
  }, []);

  const handleConversionError = useCallback((error: string) => {
    setErrors(prev => [...prev, error]);
    console.error('❌ Conversion failed:', error);
  }, []);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Exam Document Processing
        </h1>

        {/* Converter Component */}
        <DocumentConverter
          onConversionComplete={handleConversionComplete}
          onConversionError={handleConversionError}
        />

        {/* Converted Files List */}
        {convertedFiles.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Converted Files ({convertedFiles.length})
            </h2>
            <div className="space-y-2">
              {convertedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                  <div>
                    <div className="font-medium text-green-800">{file.name}</div>
                    <div className="text-sm text-green-600">
                      Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                  <div className="text-green-600">
                    ✅ Ready for exam processing
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errors List */}
        {errors.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-red-800">
              Errors ({errors.length})
            </h2>
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-sm text-red-600">{error}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
            <li>Select a Word document (.docx) or PowerPoint (.pptx) file</li>
            <li>The system validates the file type and size</li>
            <li>Click "Convert to PDF" to start the conversion process</li>
            <li>Monitor the real-time conversion progress</li>
            <li>Once converted, the PDF is ready for exam processing</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ExamDocumentProcessor;