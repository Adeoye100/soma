
const dotenv = require('dotenv');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function verifyKeys() {
  const geminiKeysString = process.env.GEMINI_API_KEYS || '';
  const geminiKeys = geminiKeysString.split(',').map((key) => key.trim()).filter((key) => key);

  console.log(`Found ${geminiKeys.length} Gemini API keys.`);

  for (let i = 0; i < geminiKeys.length; i++) {
    const key = geminiKeys[i];
    const maskedKey = key.substring(0, 6) + '...' + key.substring(key.length - 4);
    console.log(`Verifying key ${i + 1}: ${maskedKey}`);
    
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "test" }] }]
        })
      });

      if (response.ok) {
        console.log(`✅ Key ${i + 1} is VALID.`);
      } else {
        const errorData = await response.json();
        console.error(`❌ Key ${i + 1} is INVALID: ${response.status} ${response.statusText}`);
        console.error(`   Error message: ${errorData.error ? errorData.error.message : JSON.stringify(errorData)}`);
      }
    } catch (error) {
       console.error(`❌ Key ${i + 1} hit a network error: ${error.message}`);
    }
  }

  const firebaseKey = process.env.VITE_FIREBASE_API_KEY;
  if (firebaseKey) {
    const maskedFirebaseKey = firebaseKey.substring(0, 6) + '...' + firebaseKey.substring(firebaseKey.length - 4);
    console.log(`\nVerifying Firebase API key: ${maskedFirebaseKey}`);
    try {
        // Firebase keys are often restricted to certain services or referrers.
        // A simple way to check if it's at least syntactically valid and not revoked 
        // is to try a public Google API that might be enabled.
        // However, checking Firebase keys accurately usually requires specific service calls.
        // For now, we'll just check if it's present and looks like a Google API key.
        if (firebaseKey.startsWith('AIzaSy')) {
            console.log(`✅ Firebase API key format looks valid (starts with AIzaSy).`);
        } else {
            console.log(`❌ Firebase API key format looks suspicious.`);
        }
    } catch (error) {
        console.error(`❌ Firebase API key check failed: ${error.message}`);
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    console.log(`\nVerifying Supabase credentials...`);
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        if (response.ok) {
            console.log(`✅ Supabase credentials are VALID.`);
        } else {
            console.log(`❌ Supabase credentials returned status: ${response.status}`);
            const text = await response.text();
            console.log(`Response: ${text}`);
        }
    } catch (error) {
        console.error(`❌ Supabase verification failed: ${error.message}`);
    }
  }
}

verifyKeys();
