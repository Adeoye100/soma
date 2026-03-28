import { supabase } from '@/services/supabase';
import { Session, User } from '@supabase/supabase-js';

// Admin whitelist - can be extended with database queries later
const ADMIN_EMAILS = ['adeoyeopeyemi951@gmail.com'];

export class AdminAuthService {
  /**
   * Verify if a user has admin access
   */
  static async isAdmin(user: User | null): Promise<boolean> {
    if (!user?.email) return false;
    
    // Check if user email is in admin whitelist
    return ADMIN_EMAILS.includes(user.email);
  }

  /**
   * Get the current user's admin status
   */
  static async checkAdminStatus(session: Session | null): Promise<boolean> {
    if (!session?.user) return false;
    return this.isAdmin(session.user);
  }

  /**
   * Verify admin access via backend API
   */
  static async verifyAdminAccessViaAPI(token: string): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return false;

      const data = await response.json();
      return data.isAdmin === true;
    } catch (error) {
      console.error('[AdminAuthService] Error verifying admin access:', error);
      return false;
    }
  }

  /**
   * Add an email to the admin whitelist (if allowed)
   */
  static addAdminEmail(email: string): void {
    if (!ADMIN_EMAILS.includes(email)) {
      ADMIN_EMAILS.push(email);
    }
  }

  /**
   * Get all admin emails (for management purposes)
   */
  static getAdminEmails(): string[] {
    return [...ADMIN_EMAILS];
  }
}
