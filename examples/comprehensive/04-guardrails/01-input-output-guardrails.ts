/**
 * Input and Output Guardrails Example
 * 
 * This example demonstrates how to implement comprehensive guardrails
 * for both input validation and output filtering using the OpenAI Agents SDK.
 * 
 * Guardrails are essential for:
 * - Input validation and sanitization
 * - Content filtering and safety
 * - Rate limiting and usage controls
 * - Compliance and regulatory requirements
 * - Preventing harmful or inappropriate content
 * 
 * Key Concepts:
 * - Input Guardrails: Validate and sanitize inputs before processing
 * - Output Guardrails: Filter and validate outputs before delivery
 * - Guardrail Functions: Custom validation and filtering logic
 * - Guardrail Metadata: Information about guardrail execution
 * - Guardrail Results: Success/failure status and messages
 */

import { Agent, run, defineInputGuardrail, defineOutputGuardrail } from '@openai/agents';
import { z } from 'zod';

/**
 * Example 1: Basic Input Validation Guardrails
 * 
 * This demonstrates simple input validation using predefined schemas
 * and custom validation functions.
 */
async function basicInputGuardrails() {
  console.log('\n=== Basic Input Guardrails ===\n');
  
  // Create an input guardrail for content length
  const contentLengthGuardrail = defineInputGuardrail({
    name: 'content_length_check',
    description: 'Ensures input content is within acceptable length limits',
    function: async (input) => {
      const content = input.toString();
      
      if (content.length < 10) {
        return {
          passed: false,
          message: 'Input is too short. Please provide at least 10 characters.',
          metadata: {
            currentLength: content.length,
            minimumLength: 10,
            type: 'length_validation'
          }
        };
      }
      
      if (content.length > 1000) {
        return {
          passed: false,
          message: 'Input is too long. Please limit to 1000 characters.',
          metadata: {
            currentLength: content.length,
            maximumLength: 1000,
            type: 'length_validation'
          }
        };
      }
      
      return {
        passed: true,
        message: 'Content length is acceptable',
        metadata: {
          currentLength: content.length,
          type: 'length_validation'
        }
      };
    }
  });

  // Create an input guardrail for content type detection
  const contentTypeGuardrail = defineInputGuardrail({
    name: 'content_type_detection',
    description: 'Detects and validates content type appropriateness',
    function: async (input) => {
      const content = input.toString().toLowerCase();
      
      // Check for inappropriate content patterns
      const inappropriatePatterns = [
        'hack', 'exploit', 'bypass', 'cheat',
        'illegal', 'unauthorized', 'malicious'
      ];
      
      const detectedPatterns = inappropriatePatterns.filter(pattern => 
        content.includes(pattern)
      );
      
      if (detectedPatterns.length > 0) {
        return {
          passed: false,
          message: `Content contains potentially inappropriate terms: ${detectedPatterns.join(', ')}`,
          metadata: {
            detectedPatterns,
            type: 'content_filtering',
            severity: 'medium'
          }
        };
      }
      
      return {
        passed: true,
        message: 'Content type is appropriate',
        metadata: {
          type: 'content_filtering',
          severity: 'low'
        }
      };
    }
  });

  // Create an agent with input guardrails
  const guardedAgent = new Agent({
    name: 'GuardedAssistant',
    instructions: 'You are a helpful assistant that provides safe and appropriate responses.',
    inputGuardrails: [contentLengthGuardrail, contentTypeGuardrail]
  });

  try {
    // Test valid input
    console.log('--- Testing Valid Input ---');
    const validResult = await run(guardedAgent, 'Hello! I need help with a programming question about JavaScript.');
    console.log('Valid Input Response:', validResult.finalOutput);

    // Test short input (should trigger guardrail)
    console.log('\n--- Testing Short Input (Should Trigger Guardrail) ---');
    try {
      const shortResult = await run(guardedAgent, 'Hi');
      console.log('Short Input Response:', shortResult.finalOutput);
    } catch (error) {
      console.log('Guardrail Triggered:', error.message);
    }

    // Test inappropriate content (should trigger guardrail)
    console.log('\n--- Testing Inappropriate Content (Should Trigger Guardrail) ---');
    try {
      const inappropriateResult = await run(guardedAgent, 'I need help with hacking into a system');
      console.log('Inappropriate Content Response:', inappropriateResult.finalOutput);
    } catch (error) {
      console.log('Guardrail Triggered:', error.message);
    }
    
  } catch (error) {
    console.error('Error running basic input guardrails:', error);
  }
}

/**
 * Example 2: Advanced Input Validation with Custom Schemas
 * 
 * This example shows how to create sophisticated input validation
 * using custom schemas and business logic.
 */
async function advancedInputValidation() {
  console.log('\n=== Advanced Input Validation ===\n');
  
  // Create a guardrail for email validation
  const emailValidationGuardrail = defineInputGuardrail({
    name: 'email_validation',
    description: 'Validates email format and domain restrictions',
    function: async (input) => {
      const content = input.toString();
      
      // Check if content contains email patterns
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const emails = content.match(emailRegex) || [];
      
      if (emails.length === 0) {
        return {
          passed: true,
          message: 'No email addresses found in input',
          metadata: { type: 'email_validation', emailsFound: 0 }
        };
      }
      
      // Validate each email
      const invalidEmails = [];
      const restrictedDomains = ['temp-mail.org', '10minutemail.com', 'guerrillamail.com'];
      
      for (const email of emails) {
        const domain = email.split('@')[1];
        
        if (restrictedDomains.includes(domain)) {
          invalidEmails.push({
            email,
            reason: 'Restricted domain',
            domain
          });
        }
        
        if (email.length > 254) {
          invalidEmails.push({
            email,
            reason: 'Email too long',
            length: email.length
          });
        }
      }
      
      if (invalidEmails.length > 0) {
        return {
          passed: false,
          message: `Invalid emails detected: ${invalidEmails.map(e => e.email).join(', ')}`,
          metadata: {
            type: 'email_validation',
            invalidEmails,
            totalEmails: emails.length
          }
        };
      }
      
      return {
        passed: true,
        message: `All ${emails.length} email(s) are valid`,
        metadata: {
          type: 'email_validation',
          emailsFound: emails.length,
          validEmails: emails
        }
      };
    }
  });

  // Create a guardrail for sensitive data detection
  const sensitiveDataGuardrail = defineInputGuardrail({
    name: 'sensitive_data_detection',
    description: 'Detects and flags potentially sensitive information',
    function: async (input) => {
      const content = input.toString();
      
      // Patterns for sensitive data
      const sensitivePatterns = [
        { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'SSN', severity: 'high' },
        { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, type: 'Credit Card', severity: 'high' },
        { pattern: /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, type: 'Phone Number', severity: 'medium' },
        { pattern: /\b\d{5}[\s-]?\d{4}\b/g, type: 'ZIP Code', severity: 'low' }
      ];
      
      const detectedData = [];
      
      for (const { pattern, type, severity } of sensitivePatterns) {
        const matches = content.match(pattern) || [];
        if (matches.length > 0) {
          detectedData.push({
            type,
            count: matches.length,
            severity,
            examples: matches.slice(0, 2) // Show first 2 examples
          });
        }
      }
      
      if (detectedData.length > 0) {
        const highSeverity = detectedData.filter(d => d.severity === 'high');
        
        if (highSeverity.length > 0) {
          return {
            passed: false,
            message: `High-severity sensitive data detected: ${highSeverity.map(d => d.type).join(', ')}`,
            metadata: {
              type: 'sensitive_data_detection',
              detectedData,
              riskLevel: 'high'
            }
          };
        }
        
        return {
          passed: true,
          message: `Sensitive data detected but risk level is acceptable`,
          metadata: {
            type: 'sensitive_data_detection',
            detectedData,
            riskLevel: 'medium'
          }
        };
      }
      
      return {
        passed: true,
        message: 'No sensitive data detected',
        metadata: {
          type: 'sensitive_data_detection',
          riskLevel: 'low'
        }
      };
    }
  });

  // Create an agent with advanced input validation
  const advancedGuardedAgent = new Agent({
    name: 'AdvancedGuardedAssistant',
    instructions: 'You are a helpful assistant that handles various types of requests safely.',
    inputGuardrails: [emailValidationGuardrail, sensitiveDataGuardrail]
  });

  try {
    // Test with valid content
    console.log('--- Testing Valid Content ---');
    const validResult = await run(advancedGuardedAgent, 'I need help with my account. My email is user@example.com');
    console.log('Valid Content Response:', validResult.finalOutput);

    // Test with restricted email domain
    console.log('\n--- Testing Restricted Email Domain ---');
    try {
      const restrictedResult = await run(advancedGuardedAgent, 'Please help me with temp-mail.org account');
      console.log('Restricted Domain Response:', restrictedResult.finalOutput);
    } catch (error) {
      console.log('Guardrail Triggered:', error.message);
    }

    // Test with sensitive data
    console.log('\n--- Testing Sensitive Data Detection ---');
    try {
      const sensitiveResult = await run(advancedGuardedAgent, 'My SSN is 123-45-6789 and I need help');
      console.log('Sensitive Data Response:', sensitiveResult.finalOutput);
    } catch (error) {
      console.log('Guardrail Triggered:', error.message);
    }
    
  } catch (error) {
    console.error('Error running advanced input validation:', error);
  }
}

/**
 * Example 3: Output Guardrails for Content Filtering
 * 
 * This example demonstrates how to implement output guardrails
 * that filter and validate agent responses before delivery.
 */
async function outputContentFiltering() {
  console.log('\n=== Output Content Filtering ===\n');
  
  // Create an output guardrail for content safety
  const contentSafetyGuardrail = defineOutputGuardrail({
    name: 'content_safety_filter',
    description: 'Filters out potentially harmful or inappropriate content',
    function: async (output, metadata) => {
      const content = output.toString().toLowerCase();
      
      // Define inappropriate content patterns
      const inappropriatePatterns = [
        { pattern: 'hack', severity: 'high', category: 'security' },
        { pattern: 'exploit', severity: 'high', category: 'security' },
        { pattern: 'illegal', severity: 'medium', category: 'legal' },
        { pattern: 'unauthorized', severity: 'medium', category: 'legal' },
        { pattern: 'malicious', severity: 'high', category: 'safety' }
      ];
      
      const detectedIssues = [];
      
      for (const { pattern, severity, category } of inappropriatePatterns) {
        if (content.includes(pattern)) {
          detectedIssues.push({
            pattern,
            severity,
            category,
            context: content.substring(
              Math.max(0, content.indexOf(pattern) - 20),
              content.indexOf(pattern) + pattern.length + 20
            )
          });
        }
      }
      
      if (detectedIssues.length > 0) {
        const highSeverityIssues = detectedIssues.filter(issue => issue.severity === 'high');
        
        if (highSeverityIssues.length > 0) {
          return {
            passed: false,
            message: 'High-severity content issues detected. Response blocked.',
            metadata: {
              type: 'content_safety_filter',
              detectedIssues,
              action: 'blocked',
              reason: 'high_severity_content'
            }
          };
        }
        
        // For medium severity, allow but flag
        return {
          passed: true,
          message: 'Content flagged for review but allowed through',
          metadata: {
            type: 'content_safety_filter',
            detectedIssues,
            action: 'flagged',
            reason: 'medium_severity_content'
          }
        };
      }
      
      return {
        passed: true,
        message: 'Content passed safety checks',
        metadata: {
          type: 'content_safety_filter',
          action: 'passed'
        }
      };
    }
  });

  // Create an output guardrail for content quality
  const contentQualityGuardrail = defineOutputGuardrail({
    name: 'content_quality_check',
    description: 'Ensures output meets quality standards',
    function: async (output, metadata) => {
      const content = output.toString();
      
      // Quality checks
      const checks = [
        {
          name: 'length',
          check: () => content.length >= 50,
          message: 'Response is too short'
        },
        {
          name: 'structure',
          check: () => content.includes('\n') || content.includes('. '),
          message: 'Response lacks proper structure'
        },
        {
          name: 'specificity',
          check: () => !content.includes('I cannot') && !content.includes('I don\'t know'),
          message: 'Response is too generic'
        }
      ];
      
      const failedChecks = checks.filter(check => !check.check());
      
      if (failedChecks.length > 0) {
        return {
          passed: false,
          message: `Quality checks failed: ${failedChecks.map(c => c.message).join(', ')}`,
          metadata: {
            type: 'content_quality_check',
            failedChecks: failedChecks.map(c => c.name),
            totalChecks: checks.length
          }
        };
      }
      
      return {
        passed: true,
        message: 'Content meets quality standards',
        metadata: {
          type: 'content_quality_check',
          passedChecks: checks.length
        }
      };
    }
  });

  // Create an agent with output guardrails
  const outputGuardedAgent = new Agent({
    name: 'OutputGuardedAssistant',
    instructions: `
      You are a helpful assistant that provides detailed, well-structured responses.
      Always be specific and helpful in your answers.
      Avoid generic responses and provide actionable information.
    `,
    outputGuardrails: [contentSafetyGuardrail, contentQualityGuardrail]
  });

  try {
    // Test normal response
    console.log('--- Testing Normal Response ---');
    const normalResult = await run(outputGuardedAgent, 'Explain how to implement a binary search algorithm');
    console.log('Normal Response:', normalResult.finalOutput);

    // Test response that might trigger quality guardrail
    console.log('\n--- Testing Quality Guardrail ---');
    const qualityResult = await run(outputGuardedAgent, 'What is the meaning of life?');
    console.log('Quality Response:', qualityResult.finalOutput);
    
  } catch (error) {
    console.error('Error running output content filtering:', error);
  }
}

/**
 * Example 4: Rate Limiting and Usage Control Guardrails
 * 
 * This example shows how to implement guardrails for controlling
 * usage patterns and preventing abuse.
 */
async function rateLimitingGuardrails() {
  console.log('\n=== Rate Limiting and Usage Control ===\n');
  
  // Simple in-memory rate limiter (in production, use Redis or similar)
  const rateLimitStore = new Map();
  
  // Create a rate limiting guardrail
  const rateLimitGuardrail = defineInputGuardrail({
    name: 'rate_limit_check',
    description: 'Enforces rate limits to prevent abuse',
    function: async (input, context) => {
      const userId = context.userId || 'anonymous';
      const now = Date.now();
      const windowMs = 60000; // 1 minute window
      const maxRequests = 5; // Max 5 requests per minute
      
      // Get user's request history
      const userHistory = rateLimitStore.get(userId) || [];
      
      // Remove old requests outside the window
      const recentRequests = userHistory.filter(timestamp => 
        now - timestamp < windowMs
      );
      
      if (recentRequests.length >= maxRequests) {
        return {
          passed: false,
          message: `Rate limit exceeded. Maximum ${maxRequests} requests per minute.`,
          metadata: {
            type: 'rate_limit_check',
            userId,
            currentRequests: recentRequests.length,
            maxRequests,
            windowMs,
            resetTime: new Date(now + windowMs).toISOString()
          }
        };
      }
      
      // Add current request
      recentRequests.push(now);
      rateLimitStore.set(userId, recentRequests);
      
      return {
        passed: true,
        message: `Request allowed. ${maxRequests - recentRequests.length} requests remaining.`,
        metadata: {
          type: 'rate_limit_check',
          userId,
          currentRequests: recentRequests.length,
          maxRequests,
          windowMs
        }
      };
    }
  });

  // Create a usage tracking guardrail
  const usageTrackingGuardrail = defineInputGuardrail({
    name: 'usage_tracking',
    description: 'Tracks usage patterns for monitoring and billing',
    function: async (input, context) => {
      const userId = context.userId || 'anonymous';
      const inputLength = input.toString().length;
      
      // Simulate usage tracking
      console.log(`📊 Usage tracked for user ${userId}: ${inputLength} characters`);
      
      return {
        passed: true,
        message: 'Usage tracked successfully',
        metadata: {
          type: 'usage_tracking',
          userId,
          inputLength,
          timestamp: new Date().toISOString(),
          costEstimate: (inputLength / 1000) * 0.002 // $0.002 per 1K tokens
        }
      };
    }
  });

  // Create an agent with rate limiting
  const rateLimitedAgent = new Agent({
    name: 'RateLimitedAssistant',
    instructions: 'You are a helpful assistant with rate limiting enabled.',
    inputGuardrails: [rateLimitGuardrail, usageTrackingGuardrail]
  });

  try {
    // Simulate multiple rapid requests
    console.log('--- Testing Rate Limiting ---');
    
    for (let i = 1; i <= 7; i++) {
      try {
        console.log(`\nRequest ${i}:`);
        const result = await run(rateLimitedAgent, `Request number ${i}`);
        console.log('Response:', result.finalOutput);
      } catch (error) {
        console.log('Rate Limited:', error.message);
        break;
      }
    }
    
  } catch (error) {
    console.error('Error running rate limiting guardrails:', error);
  }
}

/**
 * Example 5: Composite Guardrails with Custom Logic
 * 
 * This example demonstrates how to combine multiple guardrails
 * and create custom composite validation logic.
 */
async function compositeGuardrails() {
  console.log('\n=== Composite Guardrails ===\n');
  
  // Create a composite guardrail that combines multiple checks
  const compositeGuardrail = defineInputGuardrail({
    name: 'comprehensive_content_validation',
    description: 'Comprehensive content validation combining multiple checks',
    function: async (input, context) => {
      const content = input.toString();
      const results = [];
      
      // Check 1: Content length
      if (content.length < 10) {
        results.push({
          check: 'length',
          passed: false,
          message: 'Content too short',
          details: { current: content.length, minimum: 10 }
        });
      } else {
        results.push({
          check: 'length',
          passed: true,
          message: 'Length acceptable'
        });
      }
      
      // Check 2: Content type
      const hasQuestion = content.includes('?') || content.includes('how') || content.includes('what');
      if (!hasQuestion) {
        results.push({
          check: 'question_format',
          passed: false,
          message: 'Input should be in question format',
          details: { suggestion: 'Try starting with "How", "What", "Why", etc.' }
        });
      } else {
        results.push({
          check: 'question_format',
          passed: true,
          message: 'Question format detected'
        });
      }
      
      // Check 3: Language detection (simplified)
      const englishWords = ['the', 'and', 'for', 'with', 'this', 'that', 'have', 'will'];
      const wordCount = content.toLowerCase().split(/\s+/).length;
      const englishWordCount = englishWords.filter(word => 
        content.toLowerCase().includes(word)
      ).length;
      
      const englishRatio = englishWordCount / Math.max(wordCount, 1);
      if (englishRatio < 0.3) {
        results.push({
          check: 'language',
          passed: false,
          message: 'Content may not be in English',
          details: { englishRatio: englishRatio.toFixed(2), threshold: 0.3 }
        });
      } else {
        results.push({
          check: 'language',
          passed: true,
          message: 'English content detected'
        });
      }
      
      // Determine overall result
      const failedChecks = results.filter(r => !r.passed);
      const overallPassed = failedChecks.length === 0;
      
      if (overallPassed) {
        return {
          passed: true,
          message: 'All validation checks passed',
          metadata: {
            type: 'composite_validation',
            checks: results,
            overallResult: 'passed'
          }
        };
      } else {
        return {
          passed: false,
          message: `${failedChecks.length} validation check(s) failed`,
          metadata: {
            type: 'composite_validation',
            checks: results,
            failedChecks: failedChecks.map(c => c.check),
            overallResult: 'failed'
          }
        };
      }
    }
  });

  // Create an agent with composite guardrails
  const compositeGuardedAgent = new Agent({
    name: 'CompositeGuardedAssistant',
    instructions: 'You are a helpful assistant that requires well-formed questions in English.',
    inputGuardrails: [compositeGuardrail]
  });

  try {
    // Test various inputs
    const testCases = [
      {
        description: 'Valid Question',
        input: 'How do I implement a binary search algorithm in Python?'
      },
      {
        description: 'Too Short',
        input: 'Hi'
      },
      {
        description: 'Not a Question',
        input: 'I need help with programming'
      },
      {
        description: 'Non-English Content',
        input: 'Hola necesito ayuda con programación'
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n--- Testing: ${testCase.description} ---`);
      try {
        const result = await run(compositeGuardedAgent, testCase.input);
        console.log('Response:', result.finalOutput);
      } catch (error) {
        console.log('Guardrail Triggered:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Error running composite guardrails:', error);
  }
}

/**
 * Main function that runs all guardrail examples
 */
async function main() {
  console.log('🛡️ OpenAI Agents SDK - Guardrails Examples\n');
  console.log('This example demonstrates comprehensive input and output validation.\n');
  
  try {
    await basicInputGuardrails();
    await advancedInputValidation();
    await outputContentFiltering();
    await rateLimitingGuardrails();
    await compositeGuardrails();
    
    console.log('\n✅ All guardrail examples completed successfully!');
    console.log('\nKey Takeaways:');
    console.log('1. Input guardrails validate and sanitize user inputs');
    console.log('2. Output guardrails filter and validate agent responses');
    console.log('3. Guardrails can be combined for comprehensive validation');
    console.log('4. Rate limiting prevents abuse and controls costs');
    console.log('5. Custom guardrail logic enables business-specific validation');
    
  } catch (error) {
    console.error('\n❌ Error running guardrail examples:', error);
    process.exit(1);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicInputGuardrails,
  advancedInputValidation,
  outputContentFiltering,
  rateLimitingGuardrails,
  compositeGuardrails
};