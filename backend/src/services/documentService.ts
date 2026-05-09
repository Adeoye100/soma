import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config';
import { DatabaseError } from '@/middleware/errorHandler';
import { ILovePDFService } from '@/services/ilovepdf';
import winston from 'winston';
const pdfParse = require('pdf-parse');

export interface DocumentUploadResult {
  documentId: string;
  filename: string;
  fileUrl: string;
  preview: string;
}

const createSupabaseAdmin = (): SupabaseClient => {
  return createClient(config.supabaseUrl, config.supabaseServiceKey || config.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'soma-document-service' } }
  });
};

export class DocumentService {
  static async uploadAndProcess(
    fileBuffer: Buffer,
    filename: string,
    fileType: string,
    userId: string
  ): Promise<DocumentUploadResult> {
    const supabase = createSupabaseAdmin();
    const storagePath = `${userId}/${Date.now()}-${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('exam-documents')
      .upload(storagePath, fileBuffer, {
        contentType: fileType,
        upsert: false
      });

    if (uploadError) {
      throw new DatabaseError(`Failed to upload file to storage: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('exam-documents')
      .getPublicUrl(storagePath);

    const fileUrl = urlData.publicUrl;

    let preview = '';
    try {
      preview = await this.extractTextPreview(fileBuffer, filename, fileType);
    } catch (err) {
      winston.warn(`Could not extract text preview for ${filename}: ${(err as Error).message}`);
      preview = 'Preview not available for this file type.';
    }

    const { data: doc, error: dbError } = await supabase
      .from('documents')
      .insert([{
        user_id: userId,
        filename,
        file_url: fileUrl,
        file_type: fileType,
        size_bytes: fileBuffer.length,
        preview: preview.substring(0, 500)
      }])
      .select()
      .single();

    if (dbError) {
      throw new DatabaseError(`Failed to save document metadata: ${dbError.message}`);
    }

    return {
      documentId: doc.id,
      filename,
      fileUrl,
      preview: preview.substring(0, 500)
    };
  }

  static async getDocumentContent(documentId: string, userId: string): Promise<string> {
    const supabase = createSupabaseAdmin();

    const { data: doc, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (error || !doc) {
      throw new DatabaseError('Document not found or access denied');
    }

    const storagePath = doc.file_url.split('/exam-documents/')[1] || '';
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('exam-documents')
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new DatabaseError(`Failed to download document: ${downloadError?.message}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    return this.extractText(buffer, doc.filename, doc.file_type);
  }

  static async getDocumentsByUser(userId: string, page: number = 1, limit: number = 10) {
    const supabase = createSupabaseAdmin();
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new DatabaseError(`Failed to fetch documents: ${error.message}`);
    }

    return { data: data || [], total: count || 0 };
  }

  /**
   * Extract text from any supported file type.
   * Tries local pdf-parse first for PDFs, falls back to iLovePDF.
   */
  static async extractText(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    // 1. Try local extraction first for PDFs
    if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfData = await pdfParse(buffer);
        if (pdfData.text && pdfData.text.trim().length > 0) {
          winston.info(`Successfully extracted text locally from ${filename} using pdf-parse`);
          return pdfData.text;
        }
        winston.warn(`Local extraction from ${filename} returned empty text, falling back to iLovePDF`);
      } catch (err: any) {
        winston.warn(`Local extraction failed for ${filename}: ${err.message}, falling back to iLovePDF`);
      }
    }

    // 2. Fall back to iLovePDF (required for OCR/scanned PDFs and Office docs)
    try {
      return await ILovePDFService.extractTextFromBuffer(buffer, filename, mimeType);
    } catch (err: any) {
      // Determine if it's an iLovePDF configuration error
      if (err.message.includes('iLovePDF API keys not configured') || err.message.includes('iLovePDF authentication failed')) {
        throw new Error(
          'File conversion service auth failed. Check ILOVEPDF_PUBLIC_KEY in .env'
        );
      }
      if (err.response?.status === 422 || err.message.includes('status code 400')) {
        throw new Error('File format not supported for conversion or incompatible PDF.');
      }
      if (err.message.includes('Processing timeout')) {
        throw new Error('Processing timeout. File may be too large or corrupted.');
      }
      if (err.code === 'ECONNREFUSED') {
        throw new Error(
          'File conversion service unreachable. Check internet connection.'
        );
      }
      throw new Error(`File processing failed: ${err.message}`);
    }
  }

  private static async extractTextPreview(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    const text = await this.extractText(buffer, filename, mimeType);
    return text.substring(0, 500);
  }
}

export default DocumentService;
