import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';
import pptx2html from 'pptx2html';

/**
 * Converts a .docx or .pptx file to a PDF File object.
 * @param file The input file (.docx or .pptx)
 * @returns Promise<File> A PDF file
 */
export async function convertToPdf(file: File): Promise<File> {
  const fileExtension = file.name.toLowerCase().split('.').pop();

  if (fileExtension === 'docx') {
    return convertDocxToPdf(file);
  } else if (fileExtension === 'pptx') {
    return convertPptxToPdf(file);
  } else {
    throw new Error('Unsupported file type. Only .docx and .pptx files can be converted to PDF.');
  }
}

/**
 * Enhanced function to convert PowerPoint (.pptx) and Word documents to PDF for exam processing
 * Provides comprehensive error handling and progress tracking
 * 
 * @param file The input file (.docx or .pptx)
 * @param onProgress Optional callback for progress updates
 * @returns Promise<File> A PDF file ready for exam processing
 */
export async function convertForExamProcessing(
  file: File, 
  onProgress?: (progress: { stage: string; progress: number; message: string }) => void
): Promise<File> {
  const startTime = Date.now();
  const fileExtension = file.name.toLowerCase().split('.').pop();

  // Validate file type
  if (!['docx', 'pptx'].includes(fileExtension || '')) {
    throw new Error('Unsupported file type. Only .docx and .pptx files can be converted for exam processing.');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error(`File size too large. Maximum allowed size is ${maxSize / (1024 * 1024)}MB`);
  }

  try {
    onProgress?.({ stage: 'validation', progress: 10, message: 'Validating file...' });

    if (fileExtension === 'docx') {
      return await convertDocxToPdfEnhanced(file, onProgress, startTime);
    } else if (fileExtension === 'pptx') {
      return await convertPptxToPdfEnhanced(file, onProgress, startTime);
    }

    throw new Error('Unsupported file type');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error';
    console.error(`PDF conversion failed for ${file.name}:`, errorMessage);
    throw new Error(`Failed to convert ${file.name} to PDF: ${errorMessage}`);
  }
}

/**
 * Enhanced DOCX to PDF conversion with progress tracking
 */
async function convertDocxToPdfEnhanced(
  file: File, 
  onProgress?: (progress: { stage: string; progress: number; message: string }) => void,
  startTime?: number
): Promise<File> {
  try {
    onProgress?.({ stage: 'extraction', progress: 25, message: 'Extracting content from Word document...' });

    const arrayBuffer = await file.arrayBuffer();
    
    // Convert to HTML using mammoth
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const htmlContent = result.value;

    if (!htmlContent) {
      throw new Error('Failed to extract content from Word document');
    }

    onProgress?.({ stage: 'generation', progress: 50, message: 'Generating PDF...' });

    const pdfFile = await generatePdfFromHtml(
      htmlContent, 
      file.name.replace('.docx', '.pdf'), 
      'portrait',
      onProgress
    );

    onProgress?.({ stage: 'completion', progress: 100, message: 'Word document converted successfully!' });

    console.log(`DOCX conversion completed: ${file.name} -> ${pdfFile.name} (${pdfFile.size} bytes)`);
    return pdfFile;

  } catch (error) {
    throw new Error(`DOCX conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Enhanced PPTX to PDF conversion with progress tracking
 */
async function convertPptxToPdfEnhanced(
  file: File, 
  onProgress?: (progress: { stage: string; progress: number; message: string }) => void,
  startTime?: number
): Promise<File> {
  try {
    onProgress?.({ stage: 'extraction', progress: 25, message: 'Extracting slides from PowerPoint...' });

    const arrayBuffer = await file.arrayBuffer();
    
    // Convert PPTX to HTML using pptx2html
    const htmlContent = await pptx2html(arrayBuffer);
    
    if (!htmlContent) {
      throw new Error('Failed to extract content from PowerPoint presentation');
    }

    onProgress?.({ stage: 'generation', progress: 50, message: 'Generating PDF...' });

    const pdfFile = await generatePdfFromHtml(
      htmlContent, 
      file.name.replace('.pptx', '.pdf'), 
      'landscape',
      onProgress
    );

    onProgress?.({ stage: 'completion', progress: 100, message: 'PowerPoint presentation converted successfully!' });

    console.log(`PPTX conversion completed: ${file.name} -> ${pdfFile.name} (${pdfFile.size} bytes)`);
    return pdfFile;

  } catch (error) {
    throw new Error(`PPTX conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate PDF from HTML content with enhanced formatting
 */
async function generatePdfFromHtml(
  htmlContent: string, 
  filename: string, 
  orientation: 'portrait' | 'landscape',
  onProgress?: (progress: { stage: string; progress: number; message: string }) => void
): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      onProgress?.({ stage: 'formatting', progress: 60, message: 'Formatting document...' });

      // Create a temporary container with enhanced styling
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      // Enhanced CSS for better formatting
      const style = document.createElement('style');
      style.textContent = `
        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-size: 12px;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        h1 { font-size: 24px; margin: 20px 0 10px 0; font-weight: bold; }
        h2 { font-size: 20px; margin: 18px 0 8px 0; font-weight: bold; }
        h3 { font-size: 16px; margin: 16px 0 6px 0; font-weight: bold; }
        h4 { font-size: 14px; margin: 14px 0 4px 0; font-weight: bold; }
        p { margin: 10px 0; text-align: justify; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        ul, ol { margin: 10px 0; padding-left: 30px; }
        li { margin: 5px 0; }
        img { max-width: 100%; height: auto; margin: 10px 0; }
        .slide { 
          page-break-after: always; 
          min-height: 90vh; 
          padding: 20px; 
          border: 1px solid #eee;
          margin-bottom: 20px;
        }
        .slide:last-child { page-break-after: avoid; }
        @media print {
          body { font-size: 10px; }
          .slide { min-height: 100vh; }
        }
      `;
      
      tempDiv.appendChild(style);

      onProgress?.({ stage: 'rendering', progress: 80, message: 'Rendering PDF...' });

      // Enhanced html2pdf options
      const options = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename,
        image: { 
          type: 'jpeg', 
          quality: 0.95,
          format: 'JPEG',
          compression: 'FAST'
        },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          letterRendering: true,
          logging: false
        },
        jsPDF: { 
          unit: 'in', 
          format: 'a4', 
          orientation,
          compress: true,
          putOnlyUsedFonts: true,
          floatPrecision: 16
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.slide'
        }
      };

      // Generate PDF
      const worker = html2pdf().set(options).from(tempDiv);
      worker.outputPdf('blob').then((pdfBlob) => {
        const pdfFile = new File([pdfBlob], filename, { 
          type: 'application/pdf',
          lastModified: Date.now()
        });
        
        // Cleanup
        setTimeout(() => {
          try {
            document.head.removeChild(style);
          } catch (e) {
            // Ignore cleanup errors
          }
        }, 1000);
        
        resolve(pdfFile);
      }).catch(reject);
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Basic DOCX to PDF conversion
 */
async function convertDocxToPdf(file: File): Promise<File> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const htmlContent = result.value;

    // Create a temporary element to hold the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '12px';
    tempDiv.style.lineHeight = '1.5';

    // Configure html2pdf options
    const options = {
      margin: 1,
      filename: file.name.replace('.docx', '.pdf'),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    // Generate PDF blob
    const pdfBlob = await html2pdf().set(options).from(tempDiv).outputPdf('blob');

    // Create and return File object
    return new File([pdfBlob], file.name.replace('.docx', '.pdf'), { type: 'application/pdf' });
  } catch (error) {
    throw new Error(`Failed to convert DOCX to PDF: ${error}`);
  }
}

/**
 * Basic PPTX to PDF conversion
 */
async function convertPptxToPdf(file: File): Promise<File> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // Convert PPTX to HTML using pptx2html
    const htmlContent = await pptx2html(arrayBuffer);

    // Create a temporary element to hold the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '12px';

    // Configure html2pdf options
    const options = {
      margin: 1,
      filename: file.name.replace('.pptx', '.pdf'),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    // Generate PDF blob
    const pdfBlob = await html2pdf().set(options).from(tempDiv).outputPdf('blob');

    // Create and return File object
    return new File([pdfBlob], file.name.replace('.pptx', '.pdf'), { type: 'application/pdf' });
  } catch (error) {
    throw new Error(`Failed to convert PPTX to PDF: ${error}`);
  }
}

/**
 * Validate if a file can be converted to PDF for exam processing
 */
export function canConvertForExamProcessing(file: File): {
  canConvert: boolean;
  reason?: string;
  fileExtension?: string;
} {
  const fileExtension = file.name.toLowerCase().split('.').pop();
  const supportedExtensions = ['docx', 'pptx'];
  
  if (!fileExtension || !supportedExtensions.includes(fileExtension)) {
    return {
      canConvert: false,
      reason: `Unsupported file type. Supported formats: ${supportedExtensions.map(ext => '.' + ext).join(', ')}`
    };
  }

  // Check file size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      canConvert: false,
      reason: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      canConvert: false,
      reason: 'File is empty'
    };
  }

  return {
    canConvert: true,
    fileExtension
  };
}

/**
 * Get estimated conversion time for a file
 */
export function estimateConversionTime(file: File): number {
  const baseTime = file.size < 1024 * 1024 ? 2000 : 5000; // 2s for <1MB, 5s for larger
  const extension = file.name.toLowerCase().split('.').pop();
  const multiplier = extension === 'pptx' ? 1.5 : 1.0; // PPTX takes longer
  return Math.round(baseTime * multiplier);
}
