import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config';
import { DatabaseError } from '@/middleware/errorHandler';
import winston from 'winston';

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

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
    const fileExt = filename.split('.').pop()?.toLowerCase() || 'bin';
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
      preview = await this.extractTextPreview(fileBuffer, fileExt);
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
    const ext = doc.filename.split('.').pop()?.toLowerCase() || '';
    return this.extractText(buffer, ext);
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

  private static async extractTextPreview(buffer: Buffer, ext: string): Promise<string> {
    const text = await this.extractText(buffer, ext);
    return text.substring(0, 500);
  }

  private static async extractText(buffer: Buffer, ext: string): Promise<string> {
    switch (ext) {
      case 'pdf': {
        const data = await pdfParse(buffer);
        return data.text || '';
      }
      case 'docx': {
        const result = await mammoth.extractRawText({ buffer });
        return result.value || '';
      }
      case 'txt':
        return buffer.toString('utf-8');
      case 'png':
      case 'jpg':
      case 'jpeg': {
        try {
          const Tesseract = require('tesseract.js');
          const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
          return text || '';
        } catch {
          return '[Image — OCR not available]';
        }
      }
      default:
        return '';
    }
  }
}

export default DocumentService;
