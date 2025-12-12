/**
 * Captcha verification service for hCaptcha
 */

const HCAPTCHA_VERIFY_URL = 'https://hcaptcha.com/siteverify';

interface CaptchaVerificationResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  credit?: boolean;
  'error-codes'?: string[];
  score?: number;
  score_reason?: string[];
}

export class CaptchaService {
  /**
   * Verify hCaptcha token with the server
   */
  static async verifyToken(token: string): Promise<boolean> {
    const secretKey = import.meta.env.VITE_HCAPTCHA_SECRET_KEY;

    if (!secretKey) {
      console.error('hCaptcha secret key not configured');
      return false;
    }

    // Check for test keys and skip verification in development
    if (secretKey === '0x0000000000000000000000000000000000000000') {
      console.log('Using hCaptcha test keys - skipping verification in development');
      return true;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey);
      formData.append('response', token);

      const response = await fetch(HCAPTCHA_VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        if (response.status === 403) {
          console.error('hCaptcha verification failed: Invalid credentials or domain not allowed');
          console.log('Please check your hCaptcha credentials and domain configuration');
        } else {
          console.error('hCaptcha verification request failed:', response.status, response.statusText);
        }
        return false;
      }

      const result: CaptchaVerificationResponse = await response.json();

      if (result.success) {
        return true;
      } else {
        console.warn('hCaptcha verification failed:', result['error-codes']);
        console.log('Error codes:', result['error-codes']);
        return false;
      }
    } catch (error) {
      console.error('hCaptcha verification error:', error);
      return false;
    }
  }

  /**
   * Check if captcha is properly configured
   */
  static isConfigured(): boolean {
    const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;
    const secretKey = import.meta.env.VITE_HCAPTCHA_SECRET_KEY;

    return Boolean(siteKey && secretKey);
  }

  /**
   * Get configuration status for UI display
   */
  static getConfigStatus(): {
    configured: boolean;
    missingKeys: string[];
  } {
    const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;
    const secretKey = import.meta.env.VITE_HCAPTCHA_SECRET_KEY;
    const missingKeys: string[] = [];

    if (!siteKey) {
      missingKeys.push('VITE_HCAPTCHA_SITE_KEY');
    }

    if (!secretKey) {
      missingKeys.push('VITE_HCAPTCHA_SECRET_KEY');
    }

    return {
      configured: missingKeys.length === 0,
      missingKeys,
    };
  }
}
