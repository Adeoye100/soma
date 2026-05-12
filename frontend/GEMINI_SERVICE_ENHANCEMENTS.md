# Gemini Service Enhancements

This document outlines the enhanced Gemini API service with exponential backoff, API key rotation, and advanced error handling.

## 🚀 Key Features

### Enhanced Error Handling
- **Exponential Backoff**: Automatically increases delay between retries (1s → 2s → 4s → 8s...)
- **Rate Limit Detection**: Specifically handles 429 (Rate Limit) and 503 (Server Error) responses
- **Network Error Recovery**: Robust handling of network connectivity issues
- **API Key Rotation**: Automatic switching between multiple API keys when limits are hit

### Dual Implementation Approach
- **SDK-based**: Uses the official Google GenAI SDK for advanced features
- **Direct API**: Raw fetch calls for fine-grained control and custom configurations

## 📋 Environment Setup

Your `.env.local` file already contains the API keys:

```env
# Gemini API Keys (comma-separated)
GEMINI_API_KEYS=key1,key2,key3
```

## 🛠️ Available Functions

### Core Functions (Enhanced)

#### `generateExam(config, materials)`
- **Purpose**: Generate exam questions from course materials
- **Enhanced with**: Exponential backoff and API key rotation
- **Returns**: Array of Question objects

#### `evaluateAnswer(question, userAnswer)`
- **Purpose**: Evaluate student answers with AI grading
- **Enhanced with**: Comprehensive error handling and retry logic
- **Returns**: Evaluation result with score and feedback

### Enhanced Functions (Direct API)

#### `generateExamEnhanced(config, materials)`
- **Purpose**: Same as generateExam but uses direct API calls
- **Benefits**: More control over request parameters, better error visibility
- **Returns**: Array of Question objects

#### `evaluateAnswerEnhanced(question, userAnswer)`
- **Purpose**: Same as evaluateAnswer but uses direct API calls
- **Benefits**: Enhanced error handling with detailed logging
- **Returns**: Evaluation result with score and feedback

### Batch Processing Functions

#### `runMultipleGeminiRequests(prompts, onProgress?)`
- **Purpose**: Process multiple prompts in sequence with progress tracking
- **Features**:
  - Progress callback for UI updates
  - Individual error handling per request
  - Automatic delays between requests
  - Comprehensive result reporting
- **Returns**: Array of results with success/failure status

#### `runMultipleGeminiRequestsEnhanced(prompts, onProgress?)`
- **Purpose**: Enhanced version using direct API calls
- **Benefits**: Better error handling and more detailed logging

### Utility Functions

#### `getServiceStatus()`
- **Purpose**: Get current service state and API key information
- **Returns**: Object with key count, current index, and timestamps

#### `resetToFirstKey()`
- **Purpose**: Manually reset to the first API key
- **Use Case**: Testing or manual recovery

#### `getNextKey()`
- **Purpose**: Preview next API key without making a request
- **Returns**: Current and next key information

## 💡 Usage Examples

### Basic Usage (Existing Functions - Now Enhanced)

```typescript
import { generateExam, evaluateAnswer } from './services/geminiService';

const config = {
  type: ExamType.OBJECTIVE,
  difficulty: 'medium',
  numQuestions: 10
};

const materials = [
  {
    content: 'PDF content or text...',
    mimeType: 'application/pdf'
  }
];

// Enhanced with exponential backoff and key rotation
const questions = await generateExam(config, materials);

// Enhanced answer evaluation
const result = await evaluateAnswer(questions[0], 'User answer here');
```

### Enhanced Direct API Usage

```typescript
import { generateExamEnhanced, evaluateAnswerEnhanced } from './services/geminiService';

// More control over request parameters
const questions = await generateExamEnhanced(config, materials);

// Enhanced error handling and logging
const result = await evaluateAnswerEnhanced(questions[0], 'User answer here');
```

### Batch Processing Example

```typescript
import { runMultipleGeminiRequests } from './services/geminiService';

const prompts = [
  "Explain quantum computing in simple terms",
  "What is machine learning?",
  "How do neural networks work?"
];

const results = await runMultipleGeminiRequests(
  prompts,
  (current, total, message) => {
    console.log(`Progress: ${current}/${total} - ${message}`);
    // Update UI progress bar here
  }
);

console.log(`Success: ${results.filter(r => r.success).length}/${results.length}`);
```

### Service Monitoring

```typescript
import { getServiceStatus, resetToFirstKey } from './services/geminiService';

// Check current service status
const status = getServiceStatus();
console.log(`Using key ${status.currentKeyIndex + 1}/${status.totalKeys}`);

// Reset to first key if needed
resetToFirstKey();
```

## 🔧 Error Handling Improvements

### Before (Original)
```typescript
try {
  const result = await generateExam(config, materials);
} catch (error) {
  console.error('Failed:', error.message);
}
```

### After (Enhanced)
```typescript
try {
  const result = await generateExam(config, materials);
} catch (error) {
  console.error('Enhanced error details:', {
    message: error.message,
    keyIndex: currentKeyIndex,
    retryCount: attempts,
    errorType: error.name
  });
  
  // Automatic backoff and key rotation already handled
}
```

## 📊 Performance Optimizations

### Automatic Optimizations
- **Rate Limit Detection**: Automatic 429 response handling
- **Exponential Backoff**: Progressive delay increases (1s, 2s, 4s, 8s...)
- **Key Rotation**: Seamless switching between API keys
- **Request Delays**: Built-in delays for batch operations

### Manual Optimizations
```typescript
// Use enhanced functions for better control
const result = await generateExamEnhanced(config, materials);

// Monitor service status
const status = getServiceStatus();
console.log(`Active key: ${status.currentKeyIndex + 1}/${status.totalKeys}`);
```

## 🐛 Troubleshooting

### Common Issues

#### All Keys Exhausted
```typescript
// Check status
const status = getServiceStatus();
if (status.totalKeys === 0) {
  console.error('No API keys available');
}

// Reset and try again
resetToFirstKey();
```

#### Rate Limiting
```typescript
// The service automatically handles this with exponential backoff
// Check logs for retry attempts:
console.log('Rate limit hit, retrying with backoff...');
```

#### Network Errors
```typescript
// Enhanced network error handling
try {
  const result = await generateExamEnhanced(config, materials);
} catch (error) {
  if (error.name === 'TypeError') {
    console.error('Network error detected, retrying with next key...');
  }
}
```

## 🔄 Migration Guide

### Existing Code
Your existing code continues to work without changes:

```typescript
// This still works, but now with enhanced error handling
const questions = await generateExam(config, materials);
```

### New Features
To use new features, simply import and use the enhanced functions:

```typescript
// Enhanced version
import { generateExamEnhanced } from './services/geminiService';
const questions = await generateExamEnhanced(config, materials);

// Batch processing
import { runMultipleGeminiRequests } from './services/geminiService';
const results = await runMultipleGeminiRequests(prompts);
```

## 📈 Monitoring and Logging

### Enhanced Logging
The service now provides detailed logging:

```
[geminiService] Error detected for API key index 0: Rate limit exceeded
[geminiService] Retrying with backoff 2000ms after 1 attempts...
[geminiService] Switched to next API key (index: 1) due to rate limiting
```

### Status Monitoring
```typescript
const status = getServiceStatus();
console.log('Service Status:', {
  currentKey: status.currentKeyIndex + 1,
  totalKeys: status.totalKeys,
  activeKeys: status.availableKeys.filter(k => !k.isActive).length
});
```

## 🎯 Best Practices

1. **Use Enhanced Functions**: For production applications, prefer `generateExamEnhanced` and `evaluateAnswerEnhanced`
2. **Monitor Status**: Regularly check `getServiceStatus()` for key rotation patterns
3. **Batch Operations**: Use `runMultipleGeminiRequests` for multiple prompts
4. **Error Handling**: Leverage the comprehensive error information for better user feedback
5. **Progressive Enhancement**: Start with existing functions, upgrade to enhanced versions as needed

## 🚀 Performance Benefits

- **Reduced Failed Requests**: Automatic retry logic recovers from temporary failures
- **Better Resource Utilization**: Efficient API key rotation prevents single-key exhaustion
- **Improved User Experience**: Progressive backoff provides smoother error recovery
- **Enhanced Monitoring**: Detailed logging for better debugging and optimization

The enhanced Gemini service provides enterprise-grade reliability while maintaining full backward compatibility with your existing code.