import { supabase } from '../services/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const MAX_CONTENT_CHARS = 50_000;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Authentication required. Please sign in.');
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.toLowerCase().split('.').pop();

  if (ext === 'txt' || ext === 'md' || ext === 'csv' || file.type === 'text/plain') {
    const text = await file.text();
    return text.length > MAX_CONTENT_CHARS
      ? text.slice(0, MAX_CONTENT_CHARS)
      : text;
  }

  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/documents/extract-text`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.message || `File extraction failed (${response.status})`);
  }

  const data = await response.json();
  return data.text || '';
}
