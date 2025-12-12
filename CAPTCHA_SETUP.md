# hCaptcha Setup Guide

This guide will help you properly configure hCaptcha for your Soma application to protect login, signup, and password reset forms from bots and spam.

## What is hCaptcha?

hCaptcha is a privacy-friendly alternative to reCAPTCHA that provides bot protection while respecting user privacy. It has been integrated into your application for the following forms:

- User login
- User registration/signup
- Password reset request

## Setup Steps

### 1. Get hCaptcha Credentials

1. Visit [hCaptcha Dashboard](https://dashboard.hcaptcha.com/)
2. Sign up for an account (if you don't have one)
3. Create a new site by clicking "New Site"
4. Choose your domain (e.g., `localhost` for development, `yourdomain.com` for production)
5. Select the difficulty level (we recommend starting with "Easy")
6. Copy your **Site Key** and **Secret Key**

### 2. Configure Environment Variables

Create or update your `.env.local` file in the root directory:

#### For Development/Testing (Immediate Use):
```env
# hCaptcha Configuration - TEST KEYS (for development only)
VITE_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001
VITE_HCAPTCHA_SECRET_KEY=0x0000000000000000000000000000000000000000
```

#### For Production (Get your own keys):
```env
# hCaptcha Configuration
VITE_HCAPTCHA_SITE_KEY=your_hcaptcha_site_key_here
VITE_HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key_here

# Supabase Configuration (already configured)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Environment
VITE_APP_ENV=development
```

**Important:**
- **Development**: Use the test keys above for immediate functionality
- **Production**: Replace with your actual hCaptcha credentials
- Never commit your `.env.local` file to version control
- Test keys allow 1000 verifications/month and are suitable for development

### 3. Development vs Production

#### For Development:
- Use your Site Key for `localhost` domain
- The captcha will work in development mode

#### For Production:
- Make sure to add your production domain to hCaptcha
- Use the production Site Key
- Ensure the Secret Key matches your production domain

### 4. Testing the Integration

1. Start your development server: `pnpm dev`
2. Navigate to the login page
3. Fill in the form fields
4. Complete the hCaptcha challenge
5. Verify that the submit button becomes enabled
6. Test the form submission

## How it Works

### Frontend Flow:
1. User fills out the form
2. User completes hCaptcha challenge
3. hCaptcha returns a verification token
4. Form submission includes the token
5. Backend verifies the token with hCaptcha

### Security Features:
- **Bot Protection**: Prevents automated submissions
- **Rate Limiting**: Helps prevent abuse
- **User Verification**: Ensures human interaction
- **Privacy-Focused**: No Google tracking required

## Configuration Options

### Site Key Configuration:
The site key is safe to be public and is used on the frontend. It's configured via `VITE_HCAPTCHA_SITE_KEY`.

### Secret Key Configuration:
The secret key must be kept confidential and is used for server-side verification. It's configured via `VITE_HCAPTCHA_SECRET_KEY`.

### Widget Options:
The hCaptcha widget supports various customization options:
- Theme: Light/Dark/Auto
- Size: Normal/Compact
- Language: Auto-detected based on user locale

## Troubleshooting

### Common Issues:

1. **Captcha Not Displaying**
   - Check that `VITE_HCAPTCHA_SITE_KEY` is set correctly
   - Ensure the domain matches your hCaptcha site configuration
   - Verify no ad blockers are interfering

2. **Form Submission Failing**
   - Check browser console for errors
   - Verify `VITE_HCAPTCHA_SECRET_KEY` is configured
   - Ensure the captcha is completed before submission

3. **Verification Errors**
   - Confirm domain matches hCaptcha configuration
   - Check that environment variables are loaded
   - Verify network connectivity to hCaptcha servers

### Debug Mode:
You can add this to your component to debug captcha state:

```typescript
import { CaptchaService } from '@/services/captchaService';

// Debug captcha configuration
const configStatus = CaptchaService.getConfigStatus();
console.log('Captcha Config:', configStatus);
```

## Security Best Practices

1. **Keep Secrets Safe**: Never expose your Secret Key in client-side code
2. **Domain Verification**: Ensure your domain is properly configured in hCaptcha
3. **Rate Limiting**: Consider implementing additional rate limiting on backend
4. **Monitor Usage**: Check your hCaptcha dashboard for usage statistics
5. **Update Regularly**: Keep your hCaptcha integration up to date

## Support and Resources

- [hCaptcha Documentation](https://docs.hcaptcha.com/)
- [hCaptcha Dashboard](https://dashboard.hcaptcha.com/)
- [React hCaptcha Library](https://www.npmjs.com/package/@hcaptcha/react-hcaptcha)

## Configuration Status Check

To verify your captcha configuration, you can check the status in your application:

```typescript
import { CaptchaService } from '@/services/captchaService';

const isConfigured = CaptchaService.isConfigured();
if (!isConfigured) {
  console.warn('hCaptcha not properly configured');
}
```

This will help you identify missing configuration during development and deployment.
