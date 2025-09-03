/**
 * Basic Agent Example
 * 
 * This example demonstrates the fundamental concepts of creating and running an agent
 * using the OpenAI Agents SDK. It covers:
 * 
 * 1. Basic agent configuration
 * 2. Running agents with simple inputs
 * 3. Understanding agent responses
 * 4. Basic error handling
 * 
 * Key Concepts:
 * - Agent: A configured LLM with instructions and capabilities
 * - Instructions: The system prompt that defines agent behavior
 * - Run: The execution of an agent with specific input
 * - Response: The structured output from agent execution
 */

import { Agent, run } from '@openai/agents';

/**
 * Example 1: Simple Text Agent
 * 
 * This is the most basic form of an agent - just instructions and a name.
 * The agent will respond to any input based on its instructions.
 */
async function simpleTextAgent() {
  console.log('\n=== Simple Text Agent ===\n');
  
  // Create a basic agent with simple instructions
  const agent = new Agent({
    name: 'PoetryBot',
    instructions: 'You are a creative poetry bot. Always respond with original poems.',
  });

  try {
    // Run the agent with a simple text input
    const result = await run(agent, 'Write a poem about artificial intelligence');
    
    console.log('Agent Response:');
    console.log(result.finalOutput);
    console.log('\nResponse Metadata:');
    console.log('- Run ID:', result.runId);
    console.log('- Model Used:', result.model);
    console.log('- Tokens Used:', result.usage?.totalTokens);
    console.log('- Duration:', result.duration, 'ms');
    
  } catch (error) {
    console.error('Error running agent:', error);
  }
}

/**
 * Example 2: Specialized Agent with Detailed Instructions
 * 
 * This example shows how to create a more specialized agent with detailed
 * instructions that guide its behavior in specific ways.
 */
async function specializedAgent() {
  console.log('\n=== Specialized Agent ===\n');
  
  const codingAgent = new Agent({
    name: 'CodeReviewer',
    instructions: `
      You are an expert code reviewer with 20+ years of experience.
      
      Your responsibilities:
      1. Analyze code for bugs, security issues, and performance problems
      2. Suggest improvements for readability and maintainability
      3. Provide specific, actionable feedback
      4. Always be constructive and educational
      
      Response format:
      - Start with a brief summary of the code
      - List critical issues first (bugs, security, performance)
      - Provide specific suggestions with examples
      - End with overall assessment and next steps
      
      Be thorough but concise. Focus on the most important issues.
    `,
  });

  try {
    const codeToReview = `
      function calculateTotal(items) {
        let total = 0;
        for (let i = 0; i < items.length; i++) {
          total += items[i].price;
        }
        return total;
      }
    `;
    
    const result = await run(codingAgent, `Please review this code:\n${codeToReview}`);
    
    console.log('Code Review Result:');
    console.log(result.finalOutput);
    
  } catch (error) {
    console.error('Error running code review agent:', error);
  }
}

/**
 * Example 3: Agent with Dynamic Instructions
 * 
 * This example demonstrates how to create agents with instructions that
 * can change based on context or runtime conditions.
 */
async function dynamicInstructionsAgent() {
  console.log('\n=== Dynamic Instructions Agent ===\n');
  
  // Create an agent with dynamic instructions that change based on context
  const adaptiveAgent = new Agent({
    name: 'AdaptiveAssistant',
    instructions: async (runContext, agent) => {
      // Get the current time to adjust behavior
      const hour = new Date().getHours();
      
      if (hour < 12) {
        return 'You are a morning person. Be energetic and optimistic. Use exclamation marks!';
      } else if (hour < 17) {
        return 'You are focused and professional. Be concise and business-like.';
      } else {
        return 'You are relaxed and friendly. Be conversational and warm.';
      }
    },
  });

  try {
    const result = await run(adaptiveAgent, 'How are you feeling today?');
    
    console.log('Adaptive Agent Response:');
    console.log(result.finalOutput);
    console.log('\nCurrent Hour:', new Date().getHours());
    
  } catch (error) {
    console.error('Error running adaptive agent:', error);
  }
}

/**
 * Example 4: Agent with Structured Output
 * 
 * This example shows how to configure an agent to return structured data
 * instead of plain text, using JSON schemas.
 */
async function structuredOutputAgent() {
  console.log('\n=== Structured Output Agent ===\n');
  
  const analysisAgent = new Agent({
    name: 'DataAnalyzer',
    instructions: 'Analyze the given text and provide insights in a structured format.',
    outputType: {
      type: 'object',
      properties: {
        sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
        keyTopics: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        summary: { type: 'string' },
        recommendations: { type: 'array', items: { type: 'string' } }
      },
      required: ['sentiment', 'keyTopics', 'confidence', 'summary']
    }
  });

  try {
    const textToAnalyze = `
      The new product launch was incredibly successful! Customers love the innovative features
      and the user interface is intuitive. Sales exceeded expectations by 150%. However,
      some users reported minor bugs in the mobile app that need attention.
    `;
    
    const result = await run(analysisAgent, `Analyze this text: ${textToAnalyze}`);
    
    console.log('Structured Analysis Result:');
    console.log(JSON.stringify(result.finalOutput, null, 2));
    
  } catch (error) {
    console.error('Error running structured output agent:', error);
  }
}

/**
 * Example 5: Error Handling and Validation
 * 
 * This example demonstrates proper error handling when working with agents,
 * including common error types and how to handle them gracefully.
 */
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===\n');
  
  const robustAgent = new Agent({
    name: 'RobustAssistant',
    instructions: 'You are a helpful assistant that handles errors gracefully.',
  });

  try {
    // This should work normally
    const result1 = await run(robustAgent, 'Hello, how are you?');
    console.log('Normal response:', result1.finalOutput);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }

  try {
    // Simulate a potential error scenario
    const result2 = await run(robustAgent, '');
    console.log('Empty input response:', result2.finalOutput);
    
  } catch (error) {
    if (error.name === 'UserError') {
      console.log('Handled user error gracefully:', error.message);
    } else {
      console.error('Unhandled error:', error);
    }
  }
}

/**
 * Main function that runs all examples
 */
async function main() {
  console.log('🚀 OpenAI Agents SDK - Basic Agent Examples\n');
  console.log('This example demonstrates the core concepts of agent creation and usage.\n');
  
  try {
    await simpleTextAgent();
    await specializedAgent();
    await dynamicInstructionsAgent();
    await structuredOutputAgent();
    await errorHandlingExample();
    
    console.log('\n✅ All examples completed successfully!');
    console.log('\nKey Takeaways:');
    console.log('1. Agents are configured with instructions that define their behavior');
    console.log('2. The run() function executes agents and returns structured results');
    console.log('3. Instructions can be static strings or dynamic functions');
    console.log('4. Agents can return structured outputs using schemas');
    console.log('5. Proper error handling is essential for production use');
    
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  simpleTextAgent,
  specializedAgent,
  dynamicInstructionsAgent,
  structuredOutputAgent,
  errorHandlingExample
};