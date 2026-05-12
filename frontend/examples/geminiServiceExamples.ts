/**
 * Example usage of the enhanced Gemini service
 * This file demonstrates various ways to use the enhanced features
 */

import { 
  generateExam, 
  generateExamEnhanced,
  evaluateAnswer, 
  evaluateAnswerEnhanced,
  runMultipleGeminiRequests,
  runMultipleGeminiRequestsEnhanced,
  getServiceStatus,
  resetToFirstKey,
  getNextKey
} from '../services/geminiService';
import { ExamConfig, ExamType, Difficulty, TimeIntensity, Material } from '../types';

// Example exam configuration
const exampleConfig: ExamConfig = {
  type: ExamType.OBJECTIVE,
  difficulty: Difficulty.INTERMEDIATE,
  intensity: TimeIntensity.MODERATE,
  numQuestions: 5
};

// Example materials
const exampleMaterials: Material[] = [
  {
    name: 'machine-learning-guide.txt',
    content: 'Machine learning is a subset of artificial intelligence...',
    mimeType: 'text/plain'
  }
];

// Example questions for evaluation
const exampleQuestions = [
  {
    question: 'What is machine learning?',
    correctAnswer: 'Machine learning is a subset of AI that enables computers to learn from data',
    options: ['A programming language', 'A database system', 'A subset of AI', 'A web framework'],
    topic: 'artificial intelligence'
  }
];

// Example user answers
const exampleUserAnswers = [
  'A subset of AI',
  'Machine learning is a subset of artificial intelligence that allows systems to learn and improve from experience'
];

/**
 * Example 1: Basic enhanced exam generation
 */
export async function basicExamGenerationExample() {
  try {
    console.log('🔄 Generating exam with enhanced error handling...');
    
    // This uses the enhanced version with exponential backoff
    const questions = await generateExamEnhanced(exampleConfig, exampleMaterials);
    
    console.log('✅ Generated', questions.length, 'questions successfully');
    console.log('First question:', questions[0]);
    
    return questions;
  } catch (error) {
    console.error('❌ Failed to generate exam:', error);
    throw error;
  }
}

/**
 * Example 2: Enhanced answer evaluation
 */
export async function enhancedEvaluationExample() {
  try {
    console.log('🔄 Evaluating answer with enhanced error handling...');
    
    const result = await evaluateAnswerEnhanced(
      exampleQuestions[0], 
      exampleUserAnswers[0]
    );
    
    console.log('✅ Evaluation result:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to evaluate answer:', error);
    throw error;
  }
}

/**
 * Example 3: Batch processing with progress tracking
 */
export async function batchProcessingExample() {
  const prompts = [
    "Explain the concept of artificial intelligence",
    "What are the main types of machine learning?",
    "How does deep learning differ from traditional ML?",
    "What is neural network architecture?",
    "Explain supervised vs unsupervised learning"
  ];

  try {
    console.log('🔄 Processing multiple requests with progress tracking...');
    
    const results = await runMultipleGeminiRequestsEnhanced(
      prompts,
      (current, total, message) => {
        console.log(`📊 Progress: ${current}/${total} - ${message}`);
        // Here you could update a progress bar in the UI
      }
    );
    
    console.log('✅ Batch processing completed!');
    console.log(`Success: ${results.filter(r => r.success).length}/${results.length}`);
    
    results.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ Request ${index + 1}: Success`);
      } else {
        console.log(`❌ Request ${index + 1}: Failed - ${result.error}`);
      }
    });
    
    return results;
  } catch (error) {
    console.error('❌ Failed batch processing:', error);
    throw error;
  }
}

/**
 * Example 4: Service monitoring and management
 */
export async function serviceMonitoringExample() {
  try {
    console.log('🔍 Checking service status...');
    
    const status = getServiceStatus();
    console.log('📊 Service Status:', status);
    
    console.log('🔄 Checking next key...');
    const keyInfo = getNextKey();
    console.log('🔑 Key Info:', keyInfo);
    
    console.log('🔄 Resetting to first key...');
    resetToFirstKey();
    console.log('✅ Reset completed');
    
    // Check status again
    const newStatus = getServiceStatus();
    console.log('📊 New Status:', newStatus);
    
    return { status, keyInfo, newStatus };
  } catch (error) {
    console.error('❌ Service monitoring failed:', error);
    throw error;
  }
}

/**
 * Example 5: Error simulation and recovery
 * This example simulates various error conditions and shows how the service recovers
 */
export async function errorRecoveryExample() {
  try {
    console.log('🧪 Testing error recovery mechanisms...');
    
    // Simulate a request that might fail
    const prompts = [
      "This should succeed",
      "This might trigger rate limiting",
      "This should also succeed"
    ];
    
    const results = await runMultipleGeminiRequests(
      prompts,
      (current, total, message) => {
        console.log(`📊 Error test progress: ${current}/${total} - ${message}`);
      }
    );
    
    console.log('✅ Error recovery test completed');
    console.log('Results summary:', {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
    
    // Check final service status
    const finalStatus = getServiceStatus();
    console.log('📊 Final service status:', finalStatus);
    
    return { results, finalStatus };
  } catch (error) {
    console.error('❌ Error recovery test failed:', error);
    throw error;
  }
}

/**
 * Example 6: Comprehensive workflow
 * Shows a complete workflow using multiple enhanced features
 */
export async function comprehensiveWorkflowExample() {
  try {
    console.log('🚀 Starting comprehensive workflow...');
    
    // Step 1: Check service status
    console.log('Step 1: Checking service status...');
    const initialStatus = getServiceStatus();
    console.log(`Using ${initialStatus.totalKeys} API keys, currently on key ${initialStatus.currentKeyIndex + 1}`);
    
    // Step 2: Generate exam
    console.log('Step 2: Generating exam...');
    const questions = await generateExamEnhanced(exampleConfig, exampleMaterials);
    console.log(`Generated ${questions.length} questions`);
    
    // Step 3: Evaluate multiple answers
    console.log('Step 3: Evaluating answers...');
    const evaluationPrompts = exampleUserAnswers.map((answer, index) => 
      `Evaluate this answer: "${answer}" for the question: "${exampleQuestions[0].question}"`
    );
    
    const evaluations = await runMultipleGeminiRequests(evaluationPrompts);
    console.log(`Evaluated ${evaluations.length} answers`);
    
    // Step 4: Check final status
    console.log('Step 4: Checking final service status...');
    const finalStatus = getServiceStatus();
    console.log(`Final status: Using key ${finalStatus.currentKeyIndex + 1}/${finalStatus.totalKeys}`);
    
    return {
      questions,
      evaluations,
      status: { initial: initialStatus, final: finalStatus }
    };
  } catch (error) {
    console.error('❌ Comprehensive workflow failed:', error);
    throw error;
  }
}

/**
 * Example 7: Performance testing
 * Tests the enhanced error handling under various conditions
 */
export async function performanceTestingExample() {
  try {
    console.log('⚡ Starting performance testing...');
    
    const testPrompts = Array.from({ length: 10 }, (_, i) => 
      `Generate a brief explanation of AI topic ${i + 1}`
    );
    
    const startTime = Date.now();
    
    const results = await runMultipleGeminiRequestsEnhanced(
      testPrompts,
      (current, total, message) => {
        console.log(`⚡ Performance test: ${current}/${total} - ${message}`);
      }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('⚡ Performance test completed!');
    console.log(`Duration: ${duration}ms`);
    console.log(`Average per request: ${duration / testPrompts.length}ms`);
    console.log(`Success rate: ${(results.filter(r => r.success).length / results.length * 100).toFixed(1)}%`);
    
    return {
      duration,
      results,
      averageTime: duration / testPrompts.length,
      successRate: results.filter(r => r.success).length / results.length
    };
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    throw error;
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🎯 Running all Gemini service examples...\n');
  
  try {
    // Run examples in sequence
    await basicExamGenerationExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await enhancedEvaluationExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await batchProcessingExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await serviceMonitoringExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await errorRecoveryExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await comprehensiveWorkflowExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await performanceTestingExample();
    
    console.log('\n🎉 All examples completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Example execution failed:', error);
  }
}

/**
 * Quick test function for development
 */
export async function quickTest() {
  try {
    console.log('🧪 Quick test of enhanced service...');
    
    // Test basic functionality
    const status = getServiceStatus();
    console.log(`Service has ${status.totalKeys} API keys available`);
    
    if (status.totalKeys > 0) {
      const testResult = await runMultipleGeminiRequests(["Hello, can you respond?"]);
      console.log('✅ Quick test passed:', testResult[0].success ? 'Success' : 'Failed');
    } else {
      console.log('⚠️ No API keys available for testing');
    }
    
  } catch (error) {
    console.error('❌ Quick test failed:', error);
  }
}