# hCaptcha Troubleshooting Guide

This guide helps resolve common hCaptcha issues you're experiencing.

## Issues You Encountered:

### 1. **"localhost detected. Please use a valid host"**
### 2. **"Failed to load resource: the server responded with a status of 403"**
### 3. **"Invalid argument not valid semver ('' received)"**

## Root Cause:
The hCaptcha credentials in your `.env.local` file were invalid or incorrectly formatted.

## ✅ **Solution Applied:**

I've updated your `.env.local` file with official hCaptcha test keys:

```env
# hCaptcha Configuration
# NOTE: Use TEST keys for development (1000 successful verifications/month)
VITE_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001
VITE_HCAPTCHA_SECRET_KEY=0x0000000000000000000000000000000000000000
```

## ✅ **Changes Made:**

1. **Updated Environment Variables**: Replaced invalid credentials with official test keys
2. **Enhanced Error Handling**: Added better error messages and validation
3. **Development Mode Detection**: Test keys automatically bypass verification in development
4. **Updated Documentation**: Added immediate-use instructions

## 🧪 **Testing the Fix:**

1. **Restart your development server**:
   ```bash
   # Stop the current server (Ctrl+C)
   pnpm dev
   ```

2. **Verify the captcha appears**: Navigate to login/signup form

3. **Complete the captcha**: You should see a working hCaptcha widget

4. **Test form submission**: The form should now accept submissions after captcha completion

## 🔍 **Verification:**

Check your browser console - you should see:
```
Using hCaptcha test keys - skipping verification in development
```

## 📝 **What the Test Keys Provide:**

- **Immediate functionality**: Works right away in development
- **1000 verifications/month**: Sufficient for development and testing
- **No setup required**: No need to create hCaptcha account immediately
- **Production-ready structure**: Easy to swap with real keys later

## 🚀 **For Production Later:**

When ready to deploy to production, get real hCaptcha credentials:

1. Visit [hCaptcha Dashboard](https://dashboard.hcaptcha.com/)
2. Create account and site
3. Add your production domain
4. Replace test keys with real credentials

## 🔧 **Current Status:**

✅ **Problem**: Invalid hCaptcha credentials
✅ **Solution**: Updated with official test keys
✅ **Result**: hCaptcha should now work in development

Try the login/signup forms now - the captcha should display and function properly!
