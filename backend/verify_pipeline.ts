import { googleVisionService } from './backend/src/services/googleVisionService';
import { officeDocumentService } from './backend/src/services/officeDocumentService';

async function verify() {
  console.log('--- Verification Started ---');
  
  try {
    console.log('Testing GoogleVisionService initialization...');
    // We expect it to be initialized, but might not be configured (isConfigured = false)
    // if no env vars are set.
    const visionHealth = await googleVisionService.healthCheck();
    console.log('Google Vision Health:', visionHealth.status, '-', visionHealth.message);
    
    console.log('\nTesting OfficeDocumentService initialization...');
    const loAvailable = await (officeDocumentService as any).isLibreOfficeAvailable();
    console.log('LibreOffice Available:', loAvailable);
    
    console.log('\nTesting Supported Formats...');
    const visionFormats = GoogleVisionService.getSupportedFormats();
    const officeFormats = OfficeDocumentService.getSupportedFormats();
    
    console.log('Vision Formats:', visionFormats.map(f => f.extension).join(', '));
    console.log('Office Formats:', officeFormats.map(f => f.extension).join(', '));

    console.log('\n--- Verification Finished ---');
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

import { GoogleVisionService } from './backend/src/services/googleVisionService';
import { OfficeDocumentService } from './backend/src/services/officeDocumentService';

verify();
