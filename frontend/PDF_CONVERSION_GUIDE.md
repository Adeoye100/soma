# PDF Conversion for Exam Processing

This document explains how to use the enhanced PDF conversion functionality for converting PowerPoint (.pptx) and Word documents (.docx) to PDF before exam processing.

## Overview

The application includes a comprehensive document processing system that automatically converts .pptx and Word documents to PDF format for optimal exam processing. This ensures consistent formatting and compatibility across all document types.

## Key Features

- **Automatic Detection**: Identifies .pptx and .docx files that need conversion
- **Progress Tracking**: Real-time conversion progress updates
- **Error Handling**: Comprehensive error handling with detailed messages
- **Format Preservation**: Maintains original formatting, fonts, and layout
- **Security Validation**: Built-in file validation and security scanning
- **Performance Optimization**: Efficient conversion with memory management

## Usage

### Basic Conversion

```typescript
import { convertForExamProcessing, canConvertForExamProcessing } from '../utils/convertToPdf';

// Check if file can be converted
const validation = canConvertForExamProcessing(file);
if (!validation.canConvert) {
  console.error('Cannot convert file:', validation.reason);
  return;
}

// Convert file with progress tracking
const pdfFile = await convertForExamProcessing(file, (progress) => {
  console.log(`${progress.progress}% - ${progress.message}`);
});

// Use the converted PDF for exam processing
console.log('Converted to PDF:', pdfFile.name, pdfFile.size, 'bytes');
```

### Advanced Usage with Error Handling

```typescript
import { convertForExamProcessing, estimateConversionTime } from '../utils/convertToPdf';

async function processDocumentForExam(file: File): Promise<File> {
  try {
    // Validate file first
    const validation = canConvertForExamProcessing(file);
    if (!validation.canConvert) {
      throw new Error(`Cannot process file: ${validation.reason}`);
    }

    // Show estimated time
    const estimatedTime = estimateConversionTime(file);
    console.log(`Estimated conversion time: ${estimatedTime / 1000} seconds`);

    // Convert with progress callback
    const pdfFile = await convertForExamProcessing(
      file,
      (progress) => {
        switch (progress.stage) {
          case 'validation':
            console.log('🔍 Validating file...');
            break;
          case 'extraction':
            console.log('📄 Extracting content...');
            break;
          case 'generation':
            console.log('🔄 Generating PDF...');
            break;
          case 'formatting':
            console.log('🎨 Formatting document...');
            break;
          case 'rendering':
            console.log('📋 Rendering PDF...');
            break;
          case 'completion':
            console.log('✅ Conversion completed!');
            break;
        }
      }
    );

    return pdfFile;

  } catch (error) {
    console.error('Conversion failed:', error);
    throw new Error(`Failed to convert document: ${error.message}`);
  }
}
```

### Integration with Document Processing Pipeline

```typescript
import { documentProcessor } from '../services/documentProcessor';

// Use the comprehensive document processor (includes conversion)
async function processFileForExam(file: File) {
  try {
    const result = await documentProcessor.processFile(file);
    
    if (result.success) {
      const processedFile = result.pdfFile || result.originalFile;
      console.log('File processed successfully:', processedFile.name);
      
      // Convert to Material format for exam processing
      const materials = await documentProcessor.convertToMaterials([processedFile]);
      return materials[0];
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Document processing failed:', error);
    throw error;
  }
}
```

## Supported File Types

| Format | Extension | Description | Orientation |
|--------|-----------|-------------|-------------|
| Microsoft Word | .docx | Word documents | Portrait |
| PowerPoint | .pptx | Presentations | Landscape |
| PDF | .pdf | No conversion needed | Auto-detect |

## File Validation Rules

- **Maximum Size**: 10MB per file
- **Supported Extensions**: .docx, .pptx
- **File Integrity**: Non-empty files only
- **Security**: Automatic threat detection

## Progress Stages

The conversion process includes the following stages:

1. **Validation** (10%): File type and size validation
2. **Extraction** (25%): Content extraction from source document
3. **Generation** (50%): PDF generation from extracted content
4. **Formatting** (60%): Document formatting and styling
5. **Rendering** (80%): Final PDF rendering
6. **Completion** (100%): Conversion finished

## Error Handling

Common error scenarios and solutions:

### Unsupported File Type
```
Error: Unsupported file type. Only .docx and .pptx files can be converted for exam processing.
```
**Solution**: Convert file to supported format or use different file

### File Too Large
```
Error: File too large. Maximum size: 10MB
```
**Solution**: Split large document into smaller parts or compress content

### Extraction Failed
```
Error: Failed to extract content from Word document
```
**Solution**: Check document integrity, try opening in original application

### Memory Issues
```
Error: PDF conversion failed - insufficient memory
```
**Solution**: Close other applications, try with smaller file

## Performance Considerations

- **Small files** (< 1MB): ~2 seconds conversion time
- **Large files** (> 1MB): ~5 seconds conversion time
- **PowerPoint files**: ~50% longer conversion time due to slide processing
- **Memory usage**: Temporary increase during conversion process

## Best Practices

1. **File Preparation**: Ensure documents are properly formatted before upload
2. **Size Management**: Keep files under 5MB for optimal performance
3. **Progress Feedback**: Always provide user feedback during conversion
4. **Error Recovery**: Implement fallback mechanisms for failed conversions
5. **Memory Management**: Allow time for cleanup between conversions

## Integration with Exam System

```typescript
// Example: Complete exam material preparation
async function prepareExamMaterials(files: File[]): Promise<Material[]> {
  const materials: Material[] = [];
  
  for (const file of files) {
    try {
      // Convert to PDF if needed
      const processedFile = await processDocumentForExam(file);
      
      // Convert to Material format
      const material = {
        name: processedFile.name,
        content: await fileToBase64(processedFile),
        mimeType: 'application/pdf'
      };
      
      materials.push(material);
      
    } catch (error) {
      console.error(`Failed to process ${file.name}:`, error);
      // Continue with other files
    }
  }
  
  return materials;
}
```

## Troubleshooting

### Common Issues

1. **Conversion Timeout**
   - Large files may take longer than expected
   - Check browser memory usage
   - Try with smaller file segments

2. **Format Loss**
   - Some complex formatting may not preserve perfectly
   - Test with sample documents first
   - Consider manual PDF creation for critical documents

3. **Browser Compatibility**
   - Ensure modern browser with JavaScript enabled
   - Check for memory limitations
   - Update browser if conversion fails consistently

### Debug Mode

Enable debug logging to troubleshoot conversion issues:

```typescript
// Enable detailed logging
console.log('Starting conversion for:', file.name);

// Monitor conversion stages
convertForExamProcessing(file, (progress) => {
  console.log(`[${progress.progress}%] ${progress.stage}: ${progress.message}`);
});
```

## API Reference

### Functions

#### `convertForExamProcessing(file, onProgress?)`
Main conversion function for exam processing.

**Parameters:**
- `file`: File object (.docx or .pptx)
- `onProgress`: Optional callback for progress updates

**Returns:** Promise<File> - Converted PDF file

#### `canConvertForExamProcessing(file)`
Validates if a file can be converted.

**Parameters:**
- `file`: File object to validate

**Returns:** Object with `canConvert` boolean and optional `reason` string

#### `estimateConversionTime(file)`
Estimates conversion time for a file.

**Parameters:**
- `file`: File object to estimate

**Returns:** Number - Estimated time in milliseconds

## Security Features

- File signature validation
- Suspicious content detection
- Macro scanning for Office documents
- Hidden content detection
- Size and type validation

## Memory Management

The conversion system includes automatic memory cleanup:
- Temporary DOM elements are removed after conversion
- Large blobs are garbage collected
- Progress callbacks are cleaned up on completion
- Resource monitoring prevents memory leaks

This comprehensive PDF conversion system ensures reliable document processing for exam preparation while maintaining security and performance standards.