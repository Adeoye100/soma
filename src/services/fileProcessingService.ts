import { createHash } from 'crypto';
import { File } from 'buffer';
import { supabase } from '../lib/supabase';

interface FileProcessingStrategy {
  useLocal: boolean;
  compress: boolean;
  cached: boolean;
  estimatedCost: number;
}

interface UserQuota {
  user_id: string;
  monthly_credits_limit: number;
  monthly_credits_used: number;
  daily_uploads_limit: number;
  daily_uploads_count: number;
  next_reset_date: string;
}

export async function analyzeFileForProcessing(
  file: File,
  userQuota: UserQuota
): Promise<FileProcessingStrategy> {
  const fileSize = file.size;
  const fileSizeKB = fileSize / 1024;
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // Local extraction for plain text and markdown files under 5MB
  if ((fileType === 'text/plain' || fileName.endsWith('.md')) && fileSizeKB < 5000) {
    return {
      useLocal: true,
      compress: false,
      cached: false,
      estimatedCost: 0,
    };
  }

  // Check cache
  const fileHash = await computeFileHash(file);
  const cached = await checkExtractionCache(fileHash, userQuota.user_id);
  if (cached) {
    return {
      useLocal: false,
      compress: false,
      cached: true,
      estimatedCost: 0,
    };
  }

  // Determine cost for iLovePDF processing
  let shouldCompress = false;
  let estimatedCost = 1;

  if (fileName.endsWith('.pdf') && fileSizeKB > 3000) {
    shouldCompress = true;
    estimatedCost = Math.ceil(fileSizeKB / 2000) + 1;
  } else if (fileName.endsWith('.pdf')) {
    estimatedCost = 1;
  } else if (fileType.includes('word') || fileType.includes('office')) {
    estimatedCost = 2;
  } else if (fileType.includes('image') || fileName.match(/\.(jpg|png|tiff)$/i)) {
    estimatedCost = Math.ceil(fileSizeKB / 1000) + 1;
  }

  // Check user's remaining credits
  const remainingCredits = userQuota.monthly_credits_limit - userQuota.monthly_credits_used;
  if (estimatedCost > remainingCredits) {
    throw new Error(
      `Insufficient iLovePDF credits. Requires ~${estimatedCost} credits. You have ${remainingCredits} remaining.`
    );
  }

  return {
    useLocal: false,
    compress: shouldCompress,
    cached: false,
    estimatedCost,
  };
}

async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function checkExtractionCache(fileHash: string, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('extraction_cache')
    .select('extracted_text')
    .eq('file_hash', fileHash)
    .eq('user_id', userId)
    .single();

  return data?.extracted_text ?? null;
}