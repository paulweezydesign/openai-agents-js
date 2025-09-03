/**
 * Streaming examples demonstrating real-time agent interaction
 */

import { z } from 'zod';
import {
  agent,
  tool,
  runStreaming,
  collectStreamingRun,
  pipe,
  withTools,
  withModel,
} from '../src/index.js';

// Create a tool that simulates long-running operations
const longRunningTool = tool({
  name: 'process_data',
  description: 'Process large amounts of data (simulates long operation)',
  parameters: z.object({
    dataSize: z.number().describe('Size of data to process'),
    operation: z.string().describe('Type of operation to perform'),
  }),
  execute: async ({ dataSize, operation }) => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `Processed ${dataSize} items using ${operation} operation. Results: [mock results]`;
  },
});

const streamingAgent = pipe(
  agent('Streaming Agent', 'You process data and provide real-time updates'),
  withTools([longRunningTool]),
  withModel('gpt-4o')
).build();

// Example 1: Basic streaming
export const basicStreamingExample = async () => {
  console.log('=== Basic Streaming Example ===');
  
  for await (const event of runStreaming(
    streamingAgent, 
    'Process 1000 records using machine learning algorithms'
  )) {
    switch (event.type) {
      case 'message_start':
        console.log('🚀 Agent started responding...');
        break;
        
      case 'message_delta':
        process.stdout.write(event.delta);
        break;
        
      case 'message_complete':
        console.log('\n✅ Message complete');
        break;
        
      case 'tool_call_start':
        console.log(`🔧 Starting tool: ${event.toolCall.function.name}`);
        break;
        
      case 'tool_call_complete':
        console.log(`✅ Tool completed: ${event.toolCall.function.name}`);
        console.log(`Result: ${event.result.result}`);
        break;
        
      case 'run_complete':
        console.log('🎉 Run completed!');
        console.log('Final result:', event.result.output);
        break;
    }
  }
};

// Example 2: Collect all streaming events
export const collectStreamingExample = async () => {
  console.log('\n=== Collect Streaming Example ===');
  
  const { result, events } = await collectStreamingRun(
    streamingAgent,
    'Analyze 500 data points for patterns and anomalies'
  );
  
  console.log(`Total events: ${events.length}`);
  console.log(`Final output: ${result.output}`);
  console.log(`Duration: ${result.metadata.duration}ms`);
  console.log(`Turns: ${result.turns}`);
};

// Example 3: Streaming with progress tracking
export const progressTrackingExample = async () => {
  console.log('\n=== Progress Tracking Example ===');
  
  let messageCount = 0;
  let toolCallCount = 0;
  
  for await (const event of runStreaming(
    streamingAgent,
    'Process multiple datasets: customer data, sales data, and inventory data'
  )) {
    switch (event.type) {
      case 'message_delta':
        messageCount++;
        if (messageCount % 10 === 0) {
          process.stdout.write('.');
        }
        break;
        
      case 'tool_call_start':
        toolCallCount++;
        console.log(`\n[Tool ${toolCallCount}] ${event.toolCall.function.name}`);
        break;
        
      case 'tool_call_complete':
        console.log(`[Tool ${toolCallCount}] ✅ Complete`);
        break;
        
      case 'run_complete':
        console.log(`\n🎉 Processing complete! Used ${toolCallCount} tools.`);
        break;
    }
  }
};

// Example 4: Multiple streaming agents
export const multipleStreamingExample = async () => {
  console.log('\n=== Multiple Streaming Agents Example ===');
  
  const agents = [
    pipe(
      agent('Data Analyst', 'You analyze data patterns'),
      withModel('gpt-4o')
    ).build(),
    pipe(
      agent('Report Writer', 'You write comprehensive reports'),
      withModel('gpt-4o')
    ).build(),
    pipe(
      agent('Validator', 'You validate and verify information'),
      withModel('gpt-4o')
    ).build(),
  ];
  
  const promises = agents.map((agentConfig, index) => 
    collectStreamingRun(agentConfig, `Task ${index + 1}: Process quarterly business data`)
  );
  
  const results = await Promise.all(promises);
  
  results.forEach((result, index) => {
    console.log(`\nAgent ${index + 1} (${agents[index].name}):`);
    console.log(result.result.output);
  });
};

// Example 5: Streaming workflow with functional composition
export const streamingWorkflowExample = async () => {
  console.log('\n=== Streaming Workflow Example ===');
  
  const workflow = AgentWorkflow
    .create<string>(async (input: string) => {
      console.log('🔍 Step 1: Research phase');
      const { result } = await collectStreamingRun(
        agent('Researcher', 'You research topics thoroughly')
          .withModel('gpt-4o')
          .build(),
        `Research: ${input}`
      );
      return result.output;
    })
    .pipe(async (researchOutput: string) => {
      console.log('✍️ Step 2: Writing phase');
      const { result } = await collectStreamingRun(
        agent('Writer', 'You write based on research')
          .withModel('gpt-4o')
          .build(),
        `Write content based on: ${researchOutput}`
      );
      return result.output;
    })
    .pipe(async (draftOutput: string) => {
      console.log('📝 Step 3: Editing phase');
      const { result } = await collectStreamingRun(
        agent('Editor', 'You edit and refine content')
          .withModel('gpt-4o')
          .build(),
        `Edit and improve: ${draftOutput}`
      );
      return result.output;
    })
    .withMiddleware(
      loggingMiddleware((msg, data) => console.log(`[LOG] ${msg}`, data)),
      retryMiddleware(2, 500)
    );
  
  const finalOutput = await workflow.execute('renewable energy trends 2024');
  console.log('\n🎉 Final workflow output:', finalOutput);
};

// Example 6: Real-time chat simulation
export const chatSimulationExample = async () => {
  console.log('\n=== Chat Simulation Example ===');
  
  const chatAgent = agent('Chat Agent', 'You are a conversational AI assistant')
    .withModel('gpt-4o')
    .build();
  
  const messages = [
    'Hello, how are you?',
    'Can you help me with a coding problem?',
    'I need to sort an array in JavaScript',
    'Thank you for your help!'
  ];
  
  let conversationHistory: any[] = [];
  
  for (const message of messages) {
    console.log(`\n👤 User: ${message}`);
    console.log('🤖 Assistant: ', { end: '' });
    
    for await (const event of runStreaming(chatAgent, [
      ...conversationHistory,
      { role: 'user', content: message }
    ])) {
      if (event.type === 'message_delta') {
        process.stdout.write(event.delta);
      } else if (event.type === 'run_complete') {
        console.log(''); // New line
        conversationHistory = event.result.messages;
      }
    }
  }
};

// Main function to run all examples
export const runStreamingExamples = async () => {
  await basicStreamingExample();
  await collectStreamingExample();
  await progressTrackingExample();
  await multipleStreamingExample();
  await streamingWorkflowExample();
  await chatSimulationExample();
};

// Export individual examples
export {
  streamingAgent,
  longRunningTool,
  analysisTool,
};