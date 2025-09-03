/**
 * Streaming Agents Example
 * 
 * This example demonstrates how to implement streaming agents that provide
 * real-time responses and handle streaming data flows.
 * 
 * Streaming enables:
 * - Real-time response generation
 * - Progressive content delivery
 * - Interactive user experiences
 * - Long-running operations
 * - Event-driven architectures
 * 
 * Key Concepts:
 * - StreamedRunResult: Real-time streaming of agent responses
 * - Event Handling: Processing streaming events and updates
 * - Progressive Rendering: Displaying content as it's generated
 * - Stream Management: Controlling and monitoring stream flows
 * - Real-time Interaction: Dynamic user-agent communication
 */

import { Agent, run, StreamedRunResult } from '@openai/agents';

/**
 * Example 1: Basic Streaming Agent
 * 
 * This demonstrates the simplest form of streaming - an agent that
 * streams its response in real-time.
 */
async function basicStreamingAgent() {
  console.log('\n=== Basic Streaming Agent ===\n');
  
  // Create a streaming agent
  const streamingAgent = new Agent({
    name: 'StreamingAssistant',
    instructions: `
      You are a helpful streaming assistant. When responding:
      1. Start with an introduction
      2. Provide detailed explanations step by step
      3. Include examples and code snippets
      4. End with a summary and next steps
      
      Make your responses comprehensive and well-structured.
    `
  });

  try {
    console.log('Starting streaming response...\n');
    
    // Run the agent with streaming enabled
    const streamedResult = await run(streamingAgent, 'Explain how to build a REST API with Node.js and Express', {
      stream: true
    }) as StreamedRunResult;

    // Process the streaming response
    let fullResponse = '';
    let eventCount = 0;
    
    for await (const event of streamedResult) {
      eventCount++;
      
      if (event.type === 'text_stream') {
        // Handle text streaming
        const textChunk = event.text;
        fullResponse += textChunk;
        
        // Display the chunk in real-time
        process.stdout.write(textChunk);
        
        // Add a small delay to simulate real-time display
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } else if (event.type === 'response_completed') {
        console.log('\n\n--- Stream Completed ---');
        console.log('Total events processed:', eventCount);
        console.log('Final response length:', fullResponse.length);
        
      } else if (event.type === 'agent_updated') {
        console.log('\n[Agent Update]', event.agent.name, 'is processing...');
        
      } else if (event.type === 'tool_call') {
        console.log('\n[Tool Call]', event.tool.name, 'executed');
        
      } else if (event.type === 'tool_result') {
        console.log('\n[Tool Result]', event.tool.name, 'completed');
      }
    }
    
    console.log('\n\n✅ Streaming completed successfully!');
    
  } catch (error) {
    console.error('Error running streaming agent:', error);
  }
}

/**
 * Example 2: Progressive Content Generation
 * 
 * This example shows how to handle progressive content generation
 * and provide real-time feedback to users.
 */
async function progressiveContentGeneration() {
  console.log('\n=== Progressive Content Generation ===\n');
  
  const progressiveAgent = new Agent({
    name: 'ProgressiveWriter',
    instructions: `
      You are a progressive content writer. When creating content:
      1. Start with an outline or structure
      2. Build each section progressively
      3. Provide detailed explanations for each part
      4. Include practical examples and use cases
      5. End with actionable next steps
      
      Make your content build logically from concept to implementation.
    `
  });

  try {
    console.log('Starting progressive content generation...\n');
    
    const streamedResult = await run(progressiveAgent, 'Create a comprehensive guide to implementing authentication in web applications', {
      stream: true
    }) as StreamedRunResult;

    let currentSection = '';
    let sectionCount = 0;
    
    for await (const event of streamedResult) {
      if (event.type === 'text_stream') {
        const textChunk = event.text;
        
        // Detect section headers (simplified detection)
        if (textChunk.includes('##') || textChunk.includes('###')) {
          if (currentSection !== textChunk.trim()) {
            currentSection = textChunk.trim();
            sectionCount++;
            console.log(`\n📝 Section ${sectionCount}: ${currentSection}`);
          }
        }
        
        // Display the content progressively
        process.stdout.write(textChunk);
        
        // Simulate real-time processing
        await new Promise(resolve => setTimeout(resolve, 30));
        
      } else if (event.type === 'response_completed') {
        console.log('\n\n🎯 Progressive content generation completed!');
        console.log(`Total sections created: ${sectionCount}`);
      }
    }
    
  } catch (error) {
    console.error('Error running progressive content generation:', error);
  }
}

/**
 * Example 3: Interactive Streaming with User Feedback
 * 
 * This example demonstrates how to create interactive streaming
 * where users can provide feedback during generation.
 */
async function interactiveStreaming() {
  console.log('\n=== Interactive Streaming ===\n');
  
  const interactiveAgent = new Agent({
    name: 'InteractiveAssistant',
    instructions: `
      You are an interactive assistant that adapts to user feedback.
      When responding:
      1. Start with a brief overview
      2. Ask for clarification if needed
      3. Provide detailed explanations
      4. Check for understanding
      5. Offer to elaborate on specific points
      
      Be conversational and responsive to user needs.
    `
  });

  try {
    console.log('Starting interactive streaming session...\n');
    
    // Simulate a conversation with streaming
    const conversation = [
      'Explain the concept of microservices architecture',
      'Can you provide more details about service discovery?',
      'What are the main challenges with microservices?'
    ];

    for (let i = 0; i < conversation.length; i++) {
      const userInput = conversation[i];
      console.log(`\n👤 User: ${userInput}`);
      console.log('🤖 Assistant: ');
      
      const streamedResult = await run(interactiveAgent, userInput, {
        stream: true
      }) as StreamedRunResult;

      let response = '';
      
      for await (const event of streamedResult) {
        if (event.type === 'text_stream') {
          const textChunk = event.text;
          response += textChunk;
          process.stdout.write(textChunk);
          await new Promise(resolve => setTimeout(resolve, 40));
        }
      }
      
      console.log('\n');
      
      // Simulate processing time between responses
      if (i < conversation.length - 1) {
        console.log('⏳ Processing next question...\n');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('✅ Interactive streaming session completed!');
    
  } catch (error) {
    console.error('Error running interactive streaming:', error);
  }
}

/**
 * Example 4: Real-time Data Processing Stream
 * 
 * This example shows how to handle real-time data processing
 * with streaming agents for live data analysis.
 */
async function realtimeDataProcessing() {
  console.log('\n=== Real-time Data Processing Stream ===\n');
  
  const dataProcessingAgent = new Agent({
    name: 'DataStreamProcessor',
    instructions: `
      You are a real-time data processing specialist. When analyzing data:
      1. Identify patterns and trends quickly
      2. Provide immediate insights and alerts
      3. Suggest actions based on real-time analysis
      4. Highlight anomalies or important changes
      5. Offer predictive insights when possible
      
      Focus on speed and actionable intelligence.
    `
  });

  try {
    console.log('Starting real-time data processing...\n');
    
    // Simulate real-time data streams
    const dataStreams = [
      'Sales data: Q1 revenue increased 15%, Q2 shows 8% growth, Q3 indicates 12% increase',
      'User engagement: Daily active users up 23%, session duration increased 18%, conversion rate stable at 3.2%',
      'System performance: Response time improved 25%, uptime at 99.9%, error rate reduced to 0.1%',
      'Market trends: Competitor analysis shows 5% market share increase, customer satisfaction scores up 12%'
    ];

    for (const dataStream of dataStreams) {
      console.log(`\n📊 Processing: ${dataStream}`);
      console.log('🔍 Analysis: ');
      
      const streamedResult = await run(dataProcessingAgent, `Analyze this real-time data: ${dataStream}`, {
        stream: true
      }) as StreamedRunResult;

      for await (const event of streamedResult) {
        if (event.type === 'text_stream') {
          process.stdout.write(event.text);
          await new Promise(resolve => setTimeout(resolve, 25));
        }
      }
      
      console.log('\n');
      
      // Simulate real-time processing delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('✅ Real-time data processing completed!');
    
  } catch (error) {
    console.error('Error running real-time data processing:', error);
  }
}

/**
 * Example 5: Multi-Agent Streaming Workflow
 * 
 * This example demonstrates how to coordinate multiple streaming agents
 * in a workflow where each agent contributes to the final result.
 */
async function multiAgentStreamingWorkflow() {
  console.log('\n=== Multi-Agent Streaming Workflow ===\n');
  
  // Create specialized agents for different aspects
  const researchAgent = new Agent({
    name: 'ResearchSpecialist',
    instructions: 'You are a research specialist. Gather and analyze information thoroughly.'
  });

  const analysisAgent = new Agent({
    name: 'AnalysisExpert',
    instructions: 'You are an analysis expert. Provide deep insights and interpretations.'
  });

  const recommendationAgent = new Agent({
    name: 'RecommendationEngine',
    instructions: 'You are a recommendation engine. Provide actionable advice and next steps.'
  });

  try {
    console.log('Starting multi-agent streaming workflow...\n');
    
    const researchQuestion = 'What are the emerging trends in artificial intelligence for 2024?';
    
    // Phase 1: Research
    console.log('🔬 Phase 1: Research and Information Gathering');
    const researchStream = await run(researchAgent, researchQuestion, { stream: true }) as StreamedRunResult;
    
    let researchData = '';
    for await (const event of researchStream) {
      if (event.type === 'text_stream') {
        researchData += event.text;
        process.stdout.write(event.text);
        await new Promise(resolve => setTimeout(resolve, 35));
      }
    }
    
    console.log('\n\n📊 Phase 2: Analysis and Insights');
    
    // Phase 2: Analysis
    const analysisStream = await run(analysisAgent, `Based on this research: ${researchData}\n\nProvide deep analysis and insights.`, {
      stream: true
    }) as StreamedRunResult;
    
    let analysisResults = '';
    for await (const event of analysisStream) {
      if (event.type === 'text_stream') {
        analysisResults += event.text;
        process.stdout.write(event.text);
        await new Promise(resolve => setTimeout(resolve, 35));
      }
    }
    
    console.log('\n\n💡 Phase 3: Recommendations and Action Items');
    
    // Phase 3: Recommendations
    const recommendationStream = await run(recommendationAgent, `Based on the research and analysis:\n\nResearch: ${researchData}\n\nAnalysis: ${analysisResults}\n\nProvide specific recommendations and action items.`, {
      stream: true
    }) as StreamedRunResult;
    
    for await (const event of recommendationStream) {
      if (event.type === 'text_stream') {
        process.stdout.write(event.text);
        await new Promise(resolve => setTimeout(resolve, 35));
      }
    }
    
    console.log('\n\n✅ Multi-agent streaming workflow completed!');
    
  } catch (error) {
    console.error('Error running multi-agent streaming workflow:', error);
  }
}

/**
 * Example 6: Stream Event Monitoring and Control
 * 
 * This example shows how to monitor and control streaming events,
 * including error handling and stream management.
 */
async function streamEventMonitoring() {
  console.log('\n=== Stream Event Monitoring and Control ===\n');
  
  const monitoredAgent = new Agent({
    name: 'MonitoredAssistant',
    instructions: 'You are a monitored assistant. Provide detailed responses with clear structure.'
  });

  try {
    console.log('Starting monitored streaming session...\n');
    
    const streamedResult = await run(monitoredAgent, 'Explain the principles of object-oriented programming with examples', {
      stream: true
    }) as StreamedRunResult;

    let eventStats = {
      textStream: 0,
      agentUpdates: 0,
      toolCalls: 0,
      toolResults: 0,
      errors: 0
    };
    
    let totalTextLength = 0;
    let startTime = Date.now();
    
    try {
      for await (const event of streamedResult) {
        // Track event statistics
        switch (event.type) {
          case 'text_stream':
            eventStats.textStream++;
            totalTextLength += event.text.length;
            process.stdout.write(event.text);
            break;
            
          case 'agent_updated':
            eventStats.agentUpdates++;
            console.log(`\n[Agent Update] ${event.agent.name} status: ${event.agent.status || 'processing'}`);
            break;
            
          case 'tool_call':
            eventStats.toolCalls++;
            console.log(`\n[Tool Call] ${event.tool.name} initiated`);
            break;
            
          case 'tool_result':
            eventStats.toolResults++;
            console.log(`\n[Tool Result] ${event.tool.name} completed`);
            break;
            
          case 'response_completed':
            const duration = Date.now() - startTime;
            console.log('\n\n📊 Stream Statistics:');
            console.log('Total events processed:', Object.values(eventStats).reduce((a, b) => a + b, 0));
            console.log('Text stream events:', eventStats.textStream);
            console.log('Agent updates:', eventStats.agentUpdates);
            console.log('Tool calls:', eventStats.toolCalls);
            console.log('Tool results:', eventStats.toolResults);
            console.log('Total text length:', totalTextLength);
            console.log('Stream duration:', duration, 'ms');
            console.log('Average processing speed:', (totalTextLength / duration * 1000).toFixed(2), 'chars/sec');
            break;
            
          default:
            console.log(`\n[Unknown Event] Type: ${event.type}`);
        }
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
    } catch (streamError) {
      eventStats.errors++;
      console.error('\n❌ Stream error occurred:', streamError.message);
    }
    
    console.log('\n✅ Stream monitoring completed!');
    
  } catch (error) {
    console.error('Error running stream event monitoring:', error);
  }
}

/**
 * Main function that runs all streaming examples
 */
async function main() {
  console.log('🌊 OpenAI Agents SDK - Streaming Examples\n');
  console.log('This example demonstrates real-time streaming and event handling.\n');
  
  try {
    await basicStreamingAgent();
    await progressiveContentGeneration();
    await interactiveStreaming();
    await realtimeDataProcessing();
    await multiAgentStreamingWorkflow();
    await streamEventMonitoring();
    
    console.log('\n✅ All streaming examples completed successfully!');
    console.log('\nKey Takeaways:');
    console.log('1. Streaming enables real-time response generation and delivery');
    console.log('2. Event-driven architecture provides fine-grained control over streams');
    console.log('3. Progressive content generation improves user experience');
    console.log('4. Multi-agent workflows can coordinate streaming responses');
    console.log('5. Stream monitoring enables debugging and performance optimization');
    
  } catch (error) {
    console.error('\n❌ Error running streaming examples:', error);
    process.exit(1);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicStreamingAgent,
  progressiveContentGeneration,
  interactiveStreaming,
  realtimeDataProcessing,
  multiAgentStreamingWorkflow,
  streamEventMonitoring
};