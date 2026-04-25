import { createHash } from 'crypto'
import { File } from 'node:file'

// We assume the existence of a supabase client and UserQuota type.
// In a real implementation, you would import these from your types or services.
// For now, we'll define the UserQuota interface as per the database.

interface UserQuota {
  user_id: string
  daily_uploads_count: number
  daily_uploads_limit: number
  monthly_credits_used: number
  monthly_credits_limit: number
  last_reset_date: string
  next_reset_date?: string // We'll compute this if needed
}

interface FileProcessingStrategy {
  useLocal:     boolean    // local extraction without iLovePDF
  compress:     boolean    // compress file before upload
  cached:       boolean    // use existing extraction
  estimatedCost: number   // iLovePDF credits
  extractedText?: string   // for cached extraction
}

/**
 * Analyze a file to determine the optimal processing strategy.
 * @param file - The file to process (as a File object or Buffer with name)
 * @param userQuota - The user's quota information
 * @returns A processing strategy
 */
export async function analyzeFileForProcessing(
  file:     File | Buffer & { name: string },
  userQuota: UserQuota
): Promise<FileProcessingStrategy> {

  // Normalize file to have size, type, and name
  const fileSize = file.size || (file.length || 0)
  const fileSizeKB = fileSize / 1024
  // We don't have MIME type from Buffer, so we'll rely on file extension for simplicity
  const fileName = (file.name || 'unknown').toLowerCase()
  let fileType = ''
  if (fileName.endsWith('.txt')) fileType = 'text/plain'
  else if (fileName.endsWith('.md')) fileType = 'text/markdown'
  else if (fileName.endsWith('.pdf')) fileType = 'application/pdf'
  else if (fileName.match(/\.(doc|docx)$/)) fileType = 'application/msword'
  else if (fileName.match(/\.(jpg|jpeg|png|tiff?)$/i)) fileType = 'image/' + fileName.split('.').pop()

  // ── Strategy 1: Local extraction (0 credits) ──
  // Plain text files → extract locally
  if (fileType === 'text/plain' && fileSizeKB < 5000) {
    return {
      useLocal: true,
      compress: false,
      cached: false,
      estimatedCost: 0
    }
  }

  // Markdown files → extract locally
  if (fileName.endsWith('.md') && fileSizeKB < 5000) {
    return {
      useLocal: true,
      compress: false,
      cached: false,
      estimatedCost: 0
    }
  }

  // ── Strategy 2: Check cache (0 credits) ──
  const fileHash = await computeFileHash(file)
  const cached = await checkExtractionCache(
    fileHash,
    userQuota.user_id
  )

  if (cached) {
    return {
      useLocal: false,
      compress: false,
      cached: true,
      estimatedCost: 0,
      extractedText: cached
    }
  }

  // ── Strategy 3: Compress large PDFs ──
  // Reduce PDF size by 40-60% before sending
  let shouldCompress = false
  let estimatedCost = 1  // base cost for 1 operation

  if (fileName.endsWith('.pdf') && fileSizeKB > 3000) {
    // Large PDF → compress
    shouldCompress = true
    // Cost scales with size: 5MB = 3 credits, 10MB = 5 credits
    estimatedCost = Math.ceil(fileSizeKB / 2000) + 1
  } else if (fileName.endsWith('.pdf')) {
    // Small PDF
    estimatedCost = 1
  } else if (fileType.includes('word') || fileType.includes('office')) {
    // Word/Office → convert to PDF first = 2 operations
    estimatedCost = 2
  } else if (fileType.includes('image') || fileName.match(/\.(jpg|png|tiff)$/i)) {
    // Image → OCR = 2-3 credits depending on size
    estimatedCost = Math.ceil(fileSizeKB / 1000) + 1
  }

  // ── Check if user has budget ──
  const remainingCredits = 
    userQuota.monthly_credits_limit - userQuota.monthly_credits_used

  if (estimatedCost > remainingCredits) {
    throw new Error(
      `Insufficient iLovePDF credits. ` +
      `This file requires ~${estimatedCost} credits. ` +
      `You have ${remainingCredits} remaining this month. ` +
      `Limit resets on ${userQuota.next_reset_date || 'unknown date'}.`
    )
  }

  return {
    useLocal: false,
    compress: shouldCompress,
    cached: false,
    estimatedCost
  }
}

/**
 * Compute the SHA-256 hash of a file.
 * @param file - The file as a Buffer or File object
 * @returns Hexadecimal string of the hash
 */
async function computeFileHash(file: File | Buffer): Promise<string> {
  const buffer = file instanceof Buffer ? file : await file.arrayBuffer()
  // In Node.js, we can use the crypto module directly
  const hash = createHash('sha256')
  hash.update(buffer)
  return hash.digest('hex')
}

/**
 * Check if we have a cached extraction for this file hash and user.
 * @param fileHash - SHA-256 hash of the file
 * @param userId - The user's ID
 * @returns The extracted text if found, null otherwise
 */
async function checkExtractionCache(
  fileHash:  string,
  userId:    string
): Promise<string | null> {
  // We assume a supabase client is available. In practice, you would inject it or use a service.
  // For this example, we'll use a global supabaseClient or import it.
  // Since we don't have the supabase client in this file, we'll need to adjust.
  // Let's assume we have a supabase service available.
  // We'll import supabase from '@/services/supabaseService' or create a client.
  // However, to avoid circular dependencies, we'll pass the supabase client as an argument or use a service locator.
  // For simplicity, we'll use a placeholder and expect the environment to provide supabase.
  // In a real implementation, you would get the supabase client from a context or service.

  // We'll try to import supabase from the supabaseService if available.
  let supabase
  try {
    // @ts-ignore
    supabase = require('@/services/supabaseService').supabase
  } catch (e) {
    // If we can't require, we'll try to create a client (but this is not ideal)
    // For now, we'll return null and log a warning.
    console.warn('Supabase client not available in fileProcessingService')
    return null
  }

  const { data, error } = await supabase
    .from('extraction_cache')
    .select('extracted_text')
    .eq('file_hash', fileHash)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
    console.error('Error checking extraction cache:', error)
    return null
  }

  return data?.extracted_text ?? null
}

export default {
  analyzeFileForProcessing,
  computeFileHash,
  checkExtractionCache
}