// Consolidated into frontend/services/supabase.ts
// This file re-exports the singleton to prevent duplicate createClient() instances
export { supabase, resetPassword } from '../../services/supabase';
