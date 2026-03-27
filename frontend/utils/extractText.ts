import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

const MAX_CONTENT_CHARS = 50_000;

export async function extractTextFromFile(file: File): Promise<string> {
  const fileExtension = file.name.toLowerCase().split('.').pop();
  
  let text: string;
  
  switch (fileExtension) {
    case 'txt':
    case 'md':
    case 'text':
      text = await file.text();
      break;
      
    case 'docx':
      text = await extractTextFromDocx(file);
      break;
      
    case 'pdf':
      text = await extractTextFromPdf(file);
      break;
      
    default:
      if (file.type.startsWith('text/')) {
        text = await file.text();
      } else {
        throw new Error(`Unsupported file type: ${fileExtension || file.type}`);
      }
  }
  
  const safeText = text.length > MAX_CONTENT_CHARS
    ? text.slice(0, MAX_CONTENT_CHARS)
    : text;
  
  if (text.length > MAX_CONTENT_CHARS) {
    console.warn(`[ExamGen] Content truncated from ${text.length} to ${MAX_CONTENT_CHARS} chars`);
  }
  
  return safeText;
}

async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}