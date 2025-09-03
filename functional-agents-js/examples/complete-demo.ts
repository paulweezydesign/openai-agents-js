#!/usr/bin/env node

/**
 * Complete demonstration of the functional OpenAI Agents SDK
 * 
 * This file showcases all major features and patterns in a single demo
 */

import { z } from 'zod';
import {
  // Core agent functions
  agent,
  tool,
  run,
  runStreaming,
  runParallel,
  
  // Composition functions
  pipe,
  compose,
  withTools,
  withModel,
  withContext,
  withOutputSchema,
  withHandoffs,
  withInputGuardrails,
  withOutputGuardrails,
  
  // Handoff functions
  createHandoff,
  keywordHandoffCondition,
  removeToolMessagesFilter,
  
  // Guardrail functions
  contentLengthGuardrail,
  jsonFormatGuardrail,
  profanityFilterGuardrail,
  
  // Tool enhancement
  requireApproval,
  withErrorHandling,
  withLogging,
  withCaching,
  composeTool,
  
  // Advanced patterns
  createAgentChain,
  createAgentParallel,
  createAgentRouter,
  createMapReduceWorkflow,
  AgentWorkflow,
  
  // Monadic composition
  Task,
  Either,
  Maybe,
  agentTask,
  safeRun,
  
  // Tool collections
  toolCollections,
  
} from '../src/index.js';

// Set up environment
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-api-key-here';

/**
 * 1. BASIC AGENT CREATION
 */
console.log('🤖 Creating basic agents...\n');

const assistantAgent = agent('General Assistant', 'You are a helpful and knowledgeable assistant')
  .withModel('gpt-4o')
  .build();

/**
 * 2. TOOLS AND FUNCTIONAL COMPOSITION
 */
console.log('🔧 Creating tools...\n');

const calculatorTool = tool({
  name: 'calculator',
  description: 'Perform mathematical calculations',
  parameters: z.object({
    expression: z.string().describe('Mathematical expression (e.g., "2 + 2", "sqrt(16)")'),
  }),
  execute: async ({ expression }) => {
    try {
      // In production, use a safe math evaluator
      const result = Function(`"use strict"; return (${expression})`)();
      return `Calculation result: ${result}`;
    } catch (error) {
      return `Error in calculation: ${error instanceof Error ? error.message : 'Invalid expression'}`;
    }
  },
});

const weatherTool = tool({
  name: 'get_weather',
  description: 'Get current weather for any city',
  parameters: z.object({
    city: z.string().describe('City name'),
    units: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
  execute: async ({ city, units }) => {
    // Mock weather data
    const temps = { celsius: '22°C', fahrenheit: '72°F' };
    const conditions = ['sunny', 'cloudy', 'rainy', 'snowy'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    return `Weather in ${city}: ${condition}, ${temps[units]}`;
  },
});

const enhancedCalculator = composeTool(
  withLogging(console.log),
  withErrorHandling(async (error) => `Calculation error: ${error.message}`),
  withCaching()
)(calculatorTool);

/**
 * 3. SPECIALIZED AGENTS WITH COMPOSITION
 */
console.log('🎯 Creating specialized agents...\n');

const mathAgent = pipe(
  agent('Math Specialist', 'You are a mathematics expert who helps with calculations and mathematical problems'),
  withTools([enhancedCalculator]),
  withModel('gpt-4o'),
  withContext({ specialty: 'mathematics', precision: 'high' })
).build();

const weatherAgent = pipe(
  agent('Weather Specialist', 'You provide accurate weather information for any location'),
  withTools([weatherTool]),
  withModel('gpt-4o'),
  withContext({ specialty: 'meteorology', dataSource: 'live' })
).build();

/**
 * 4. STRUCTURED OUTPUT AGENT
 */
const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  category: z.string(),
  estimatedHours: z.number().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
});

const taskManagerAgent = agent('Task Manager', 'You create detailed task structures from user requests')
  .withOutputSchema(TaskSchema)
  .withModel('gpt-4o')
  .build();

/**
 * 5. MULTI-LANGUAGE SUPPORT WITH HANDOFFS
 */
const spanishAgent = agent('Asistente en Español', 'Eres un asistente útil que solo habla en español')
  .withModel('gpt-4o')
  .withContext({ language: 'spanish', region: 'global' })
  .build();

const frenchAgent = agent('Assistant Français', 'Vous êtes un assistant utile qui ne parle qu\'en français')
  .withModel('gpt-4o')
  .withContext({ language: 'french', region: 'global' })
  .build();

const languageRouter = pipe(
  agent('Language Router', 'Route users to appropriate language specialists based on their input'),
  withModel('gpt-4o'),
  withHandoffs([
    createHandoff(spanishAgent, {
      condition: keywordHandoffCondition(['español', 'spanish', 'hola', 'gracias', 'por favor']),
      inputFilter: removeToolMessagesFilter,
      description: 'Handle Spanish language requests'
    }),
    createHandoff(frenchAgent, {
      condition: keywordHandoffCondition(['français', 'french', 'bonjour', 'merci', 'salut']),
      inputFilter: removeToolMessagesFilter,
      description: 'Handle French language requests'
    })
  ])
).build();

/**
 * 6. GUARDED AGENT WITH SAFETY MEASURES
 */
const safeAgent = pipe(
  agent('Safe Agent', 'You are a secure agent that follows all safety guidelines'),
  withTools([calculatorTool]),
  withInputGuardrails([
    contentLengthGuardrail(500, 5),
    profanityFilterGuardrail(['spam', 'hack', 'exploit'])
  ]),
  withOutputGuardrails([
    contentLengthGuardrail(1000)
  ]),
  withModel('gpt-4o')
).build();

/**
 * 7. ADVANCED WORKFLOWS
 */

// Sequential workflow
const researchWritingChain = createAgentChain([
  {
    config: agent('Researcher', 'Research topics thoroughly and provide detailed information')
      .withModel('gpt-4o')
      .build(),
    transform: (output) => `Based on this research: ${output}\n\nWrite an engaging article about this topic.`
  },
  {
    config: agent('Writer', 'Write engaging and informative articles based on research')
      .withModel('gpt-4o')
      .build(),
    transform: (output) => `Please edit and improve this article: ${output}`
  },
  {
    config: agent('Editor', 'Edit and refine written content for clarity and engagement')
      .withModel('gpt-4o')
      .build()
  }
]);

// Parallel analysis workflow
const analysisTeam = createAgentParallel([
  {
    config: agent('Technical Analyst', 'Analyze from technical perspective')
      .withModel('gpt-4o')
      .build(),
    input: 'Analyze the technical aspects'
  },
  {
    config: agent('Business Analyst', 'Analyze from business perspective')
      .withModel('gpt-4o')
      .build(),
    input: 'Analyze the business implications'
  },
  {
    config: agent('User Experience Analyst', 'Analyze from user perspective')
      .withModel('gpt-4o')
      .build(),
    input: 'Analyze the user experience impact'
  }
]);

// Router workflow
const expertRouter = createAgentRouter([
  {
    condition: (input) => input.toLowerCase().includes('math') || input.toLowerCase().includes('calculate'),
    agent: mathAgent
  },
  {
    condition: (input) => input.toLowerCase().includes('weather') || input.toLowerCase().includes('temperature'),
    agent: weatherAgent
  },
  {
    condition: (input) => input.toLowerCase().includes('task') || input.toLowerCase().includes('todo'),
    agent: taskManagerAgent
  }
], assistantAgent); // fallback

/**
 * 8. MONADIC COMPOSITION EXAMPLES
 */

// Task monad for chaining async operations
const monadicWorkflow = agentTask(mathAgent, 'Calculate 15 * 24')
  .flatMap(result => 
    agentTask(weatherAgent, `The calculation result was ${result.output}. What's the weather like?`)
  )
  .map(result => result.output);

// Safe execution with Either monad
const safeExecution = async (agentConfig: any, input: string) => {
  const result = await safeRun(agentConfig, input);
  return result.fold(
    error => `Error occurred: ${error.message}`,
    success => `Success: ${success.output}`
  );
};

/**
 * DEMONSTRATION FUNCTIONS
 */

async function demonstrateBasicUsage() {
  console.log('=== BASIC USAGE DEMONSTRATION ===\n');
  
  try {
    const result = await run(assistantAgent, 'Hello! Please introduce yourself.');
    console.log('Assistant response:', result.output);
    console.log('Metadata:', result.metadata);
  } catch (error) {
    console.log('Demo mode - actual API call would happen here');
  }
}

async function demonstrateToolUsage() {
  console.log('\n=== TOOL USAGE DEMONSTRATION ===\n');
  
  try {
    const mathResult = await run(mathAgent, 'What is 25 * 17 + 100?');
    console.log('Math result:', mathResult.output);
    
    const weatherResult = await run(weatherAgent, 'What\'s the weather in Paris?');
    console.log('Weather result:', weatherResult.output);
  } catch (error) {
    console.log('Demo mode - actual API calls would happen here');
  }
}

async function demonstrateStructuredOutput() {
  console.log('\n=== STRUCTURED OUTPUT DEMONSTRATION ===\n');
  
  try {
    const taskResult = await run(
      taskManagerAgent, 
      'Create a task for "Review quarterly financial reports" with high priority, estimated 4 hours'
    );
    console.log('Structured task output:', JSON.stringify(taskResult.output, null, 2));
  } catch (error) {
    console.log('Demo mode - would return structured TaskSchema object');
    console.log('Example output:', {
      id: 'task-123',
      title: 'Review quarterly financial reports',
      description: 'Comprehensive review of Q4 financial data',
      priority: 'high',
      category: 'finance',
      estimatedHours: 4,
      tags: ['finance', 'quarterly', 'review'],
      createdAt: new Date().toISOString(),
    });
  }
}

async function demonstrateWorkflows() {
  console.log('\n=== WORKFLOW DEMONSTRATIONS ===\n');
  
  // Router example
  console.log('1. Expert Router:');
  try {
    const routerResult = await expertRouter.run('What is 50 divided by 2?');
    console.log('Routed to math agent:', routerResult.output);
  } catch (error) {
    console.log('Demo: Would route to math agent for calculation');
  }
  
  // Chain example  
  console.log('\n2. Research-Writing Chain:');
  try {
    const chainResult = await researchWritingChain.run('artificial intelligence in education');
    console.log('Chain result:', chainResult.output);
  } catch (error) {
    console.log('Demo: Would execute Research → Write → Edit pipeline');
  }
  
  // Parallel example
  console.log('\n3. Parallel Analysis:');
  try {
    const parallelResults = await analysisTeam.run('new smartphone technology');
    parallelResults.forEach((result, index) => {
      console.log(`Analysis ${index + 1}:`, result.output);
    });
  } catch (error) {
    console.log('Demo: Would run 3 analysts in parallel');
  }
}

async function demonstrateMonadicComposition() {
  console.log('\n=== MONADIC COMPOSITION DEMONSTRATION ===\n');
  
  try {
    const result = await monadicWorkflow.run();
    console.log('Monadic workflow result:', result);
  } catch (error) {
    console.log('Demo: Would chain math → weather using Task monad');
  }
  
  const safeResult = await safeExecution(assistantAgent, 'Hello world');
  console.log('Safe execution result:', safeResult);
}

async function demonstrateStreaming() {
  console.log('\n=== STREAMING DEMONSTRATION ===\n');
  
  console.log('Streaming response:');
  try {
    for await (const event of runStreaming(assistantAgent, 'Write a short poem about functional programming')) {
      switch (event.type) {
        case 'message_delta':
          process.stdout.write(event.delta);
          break;
        case 'run_complete':
          console.log('\n✅ Streaming complete!');
          break;
      }
    }
  } catch (error) {
    console.log('Demo mode - would stream response in real-time');
    console.log('Example poem:');
    console.log('Functions pure and bright,\nComposing left and right,\nImmutable delight.');
  }
}

/**
 * MAIN DEMONSTRATION
 */
async function main() {
  console.log('🚀 FUNCTIONAL OPENAI AGENTS SDK - COMPLETE DEMO\n');
  console.log('================================================\n');
  
  await demonstrateBasicUsage();
  await demonstrateToolUsage();
  await demonstrateStructuredOutput();
  await demonstrateWorkflows();
  await demonstrateMonadicComposition();
  await demonstrateStreaming();
  
  console.log('\n🎉 DEMONSTRATION COMPLETE!\n');
  console.log('Key Features Demonstrated:');
  console.log('✅ Functional agent creation');
  console.log('✅ Tool integration and composition');
  console.log('✅ Structured outputs with Zod');
  console.log('✅ Multi-agent workflows');
  console.log('✅ Handoffs and routing');
  console.log('✅ Guardrails and safety');
  console.log('✅ Streaming responses');
  console.log('✅ Parallel and sequential execution');
  console.log('✅ Monadic composition patterns');
  console.log('✅ Modern JavaScript syntax (ES2022+)');
  console.log('✅ Full TypeScript support');
  console.log('✅ One-to-one feature parity with Python SDK\n');
  
  console.log('📚 Check out other examples:');
  console.log('  - examples/basic-usage.ts');
  console.log('  - examples/advanced-composition.ts');
  console.log('  - examples/streaming-example.ts');
  console.log('  - examples/feature-parity.ts');
  console.log('  - examples/python-to-js-migration.ts\n');
}

// Export everything for use in other files
export {
  assistantAgent,
  mathAgent,
  weatherAgent,
  taskManagerAgent,
  languageRouter,
  safeAgent,
  researchWritingChain,
  analysisTeam,
  expertRouter,
  calculatorTool,
  weatherTool,
  enhancedCalculator,
  TaskSchema,
};

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}