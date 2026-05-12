/**
 * Example usage of PDF conversion for exam processing
 * This file demonstrates various ways to use the PDF conversion functionality
 */

import { convertForExamProcessing, canConvertForExamProcessing, estimateConversionTime } from '../utils/convertToPdf';
import { documentProcessor } from '../services/documentProcessor';
import { Material } from '../types';

// Example 1: Simple file conversion
export async function simpleFileConversionExample() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.docx,.pptx';

  fileInput.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const pdfFile = await convertForExamProcessing(file);
      console.log('Converted file:', pdfFile.name, pdfFile.size, 'bytes');
      
      // Use the converted PDF for exam processing
      const base64 = await fileToBase64(pdfFile);
      const material: Material = {
        name: pdfFile.name,
        content: base64,
        mimeType: 'application/pdf'
      };
      console.log('Ready for exam:', material);
      
    } catch (error) {
      console.error('Conversion failed:', error);
    }
  };

  fileInput.click();
}

// Example 2: Batch conversion with progress tracking
export async function batchConversionExample() {
  const files: File[] = []; // Array of selected files
  
  for (const file of files) {
    try {
      const validation = canConvertForExamProcessing(file);
      if (!validation.canConvert) {
        console.warn(`Skipping ${file.name}: ${validation.reason}`);
        continue;
      }

      const pdfFile = await convertForExamProcessing(file, (progress) => {
        console.log(`${file.name}: ${progress.progress}% - ${progress.message}`);
      });
      
      console.log(`✅ Successfully converted: ${file.name}`);
      
    } catch (error) {
      console.error(`❌ Failed to convert ${file.name}:`, error);
    }
  }
}

// Example 3: Integration with document processor
export async function integratedProcessingExample(file: File) {
  try {
    // Use the comprehensive document processor
    const result = await documentProcessor.processFile(file);
    
    if (result.success) {
      const processedFile = result.pdfFile || result.originalFile;
      
      // Convert to Material format for exam system
      const materials = await documentProcessor.convertToMaterials([processedFile]);
      
      return {
        materials,
        metadata: result.metadata,
        processingTime: result.processingTime
      };
    } else {
      throw new Error(result.error || 'Processing failed');
    }
    
  } catch (error) {
    console.error('Integrated processing failed:', error);
    throw error;
  }
}

// Example 4: Drag and drop interface
export function createDragDropConverter() {
  const dropZone = document.createElement('div');
  dropZone.className = 'drop-zone';
  dropZone.style.cssText = `
    border: 2px dashed #ccc;
    padding: 20px;
    text-align: center;
    cursor: pointer;
  `;

  dropZone.ondragover = (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#007bff';
  };

  dropZone.ondragleave = () => {
    dropZone.style.borderColor = '#ccc';
  };

  dropZone.ondrop = async (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#ccc';
    
    const files = Array.from(e.dataTransfer.files);
    
    for (const file of files) {
      await processFileWithUI(file, dropZone);
    }
  };

  return dropZone;
}

// Example 5: File processing with UI feedback
async function processFileWithUI(file: File, container: HTMLElement) {
  // Clear previous content
  container.innerHTML = '';

  // Create progress elements
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    width: 100%;
    height: 20px;
    background-color: #f0f0f0;
    border-radius: 10px;
    overflow: hidden;
  `;

  const progressFill = document.createElement('div');
  progressFill.style.cssText = `
    height: 100%;
    background-color: #007bff;
    width: 0%;
    transition: width 0.3s ease;
  `;

  const statusText = document.createElement('div');
  statusText.style.cssText = `
    margin-top: 10px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    color: #333;
  `;

  progressBar.appendChild(progressFill);
  container.appendChild(progressBar);
  container.appendChild(statusText);

  try {
    const validation = canConvertForExamProcessing(file);
    if (!validation.canConvert) {
      throw new Error(validation.reason);
    }

    statusText.textContent = `Converting ${file.name}...`;
    
    const pdfFile = await convertForExamProcessing(file, (progress) => {
      progressFill.style.width = `${progress.progress}%`;
      statusText.textContent = `${progress.message} (${progress.progress}%)`;
    });

    // Success state
    container.style.backgroundColor = '#d4edda';
    container.style.borderColor = '#c3e6cb';
    statusText.textContent = `✅ Conversion complete: ${pdfFile.name}`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfFile);
    link.download = pdfFile.name;
    link.click();

  } catch (error) {
    // Error state
    container.style.backgroundColor = '#f8d7da';
    container.style.borderColor = '#f5c6cb';
    statusText.textContent = `❌ Error: ${error.message}`;
  }
}

// Example 6: Custom hook for React components
export function useDocumentConverter() {
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; progress: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<File | null>(null);

  const convertFile = async (file: File) => {
    setIsConverting(true);
    setError(null);
    setResult(null);

    try {
      const validation = canConvertForExamProcessing(file);
      if (!validation.canConvert) {
        throw new Error(validation.reason);
      }

      const pdfFile = await convertForExamProcessing(file, setProgress);
      setResult(pdfFile);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsConverting(false);
      setProgress(null);
    }
  };

  return {
    convertFile,
    isConverting,
    progress,
    error,
    result
  };
}

// Example 7: Exam preparation workflow
export async function prepareExamMaterials(files: File[]): Promise<Material[]> {
  const materials: Material[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      console.log(`Processing: ${file.name}`);
      
      // Method 1: Direct conversion
      const validation = canConvertForExamProcessing(file);
      if (validation.canConvert) {
        const pdfFile = await convertForExamProcessing(file);
        const material = await fileToMaterial(pdfFile);
        materials.push(material);
        console.log(`✅ Converted: ${file.name}`);
      } else {
        // Method 2: Use document processor for complex files
        const result = await documentProcessor.processFile(file);
        if (result.success) {
          const processedFile = result.pdfFile || result.originalFile;
          const material = await fileToMaterial(processedFile);
          materials.push(material);
          console.log(`✅ Processed: ${file.name}`);
        } else {
          throw new Error(result.error || 'Processing failed');
        }
      }
      
    } catch (error) {
      const errorMsg = `Failed to process ${file.name}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }
  }

  if (errors.length > 0) {
    console.warn(`Completed with ${errors.length} errors:`, errors);
  }

  return materials;
}

// Helper function to convert File to Material
async function fileToMaterial(file: File): Promise<Material> {
  const base64 = await fileToBase64(file);
  
  return {
    name: file.name.replace(/\.(docx|pptx)$/i, '.pdf'), // Ensure PDF extension
    content: base64,
    mimeType: 'application/pdf'
  };
}

// Helper function to convert File to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
}

// Example 8: Performance monitoring
export async function monitoredConversion(file: File) {
  const startTime = Date.now();
  const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;
  
  try {
    const validation = canConvertForExamProcessing(file);
    const estimatedTime = estimateConversionTime(file);
    
    console.log(`Starting conversion: ${file.name}`);
    console.log(`File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`Estimated time: ${estimatedTime / 1000}s`);
    
    const pdfFile = await convertForExamProcessing(file, (progress) => {
      console.log(`Progress: ${progress.progress}% - ${progress.message}`);
    });
    
    const endTime = Date.now();
    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
    const actualTime = endTime - startTime;
    
    console.log('Conversion completed successfully!');
    console.log(`Actual time: ${(actualTime / 1000).toFixed(2)}s (estimated: ${(estimatedTime / 1000).toFixed(2)}s)`);
    console.log(`Output size: ${(pdfFile.size / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`Memory usage: ${((memoryAfter - memoryBefore) / (1024 * 1024)).toFixed(2)}MB`);
    
    return {
      success: true,
      originalFile: file,
      convertedFile: pdfFile,
      metrics: {
        actualTime,
        estimatedTime,
        outputSize: pdfFile.size,
        memoryDelta: memoryAfter - memoryBefore,
        compressionRatio: 1 - (pdfFile.size / file.size)
      }
    };
    
  } catch (error) {
    console.error('Conversion failed:', error);
    return {
      success: false,
      originalFile: file,
      error: error.message,
      metrics: {
        actualTime: Date.now() - startTime,
        memoryDelta: ((performance as any).memory?.usedJSHeapSize || 0) - memoryBefore
      }
    };
  }
}

// Import React hooks for the custom hook example
import { useState } from 'react';