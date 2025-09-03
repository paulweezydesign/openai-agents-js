/**
 * Advanced composition examples showing functional programming patterns
 */

import { z } from 'zod';
import {
  agent,
  tool,
  run,
  runParallel,
  runSequence,
  pipe,
  compose,
  withTools,
  withModel,
  withContext,
  createHandoff,
  keywordHandoffCondition,
  removeToolMessagesFilter,
  createAgentChain,
  createAgentParallel,
  createAgentRouter,
  createMapReduceWorkflow,
  createObservableAgent,
  AgentWorkflow,
  loggingMiddleware,
  retryMiddleware,
  cachingMiddleware,
  withMiddleware,
  createPipeline,
} from '../src/index.js';

// Advanced tool with error handling and logging
const analysisTool = tool({
  name: 'analyze_text',
  description: 'Analyze text for sentiment, topics, and key information',
  parameters: z.object({
    text: z.string(),
    analysisType: z.enum(['sentiment', 'topics', 'summary', 'all']),
  }),
  execute: async ({ text, analysisType }) => {
    // Mock analysis
    const analyses = {
      sentiment: `Sentiment: ${Math.random() > 0.5 ? 'Positive' : 'Negative'}`,
      topics: `Topics: Technology, Innovation, ${text.split(' ').slice(0, 3).join(', ')}`,
      summary: `Summary: ${text.substring(0, 100)}...`,
      all: `Full analysis of "${text.substring(0, 50)}..."`
    };
    
    return analysisType === 'all' 
      ? Object.values(analyses).join('\n')
      : analyses[analysisType];
  },
});

// Research agent with specialized tools
const researchAgent = pipe(
  agent('Research Agent', 'You are a research specialist who analyzes information thoroughly'),
  withTools([analysisTool]),
  withModel('gpt-4o'),
  withContext({ specialty: 'research', depth: 'detailed' })
).build();

// Writing agent
const writingAgent = agent('Writing Agent', 'You are a creative writer who crafts engaging content')
  .withModel('gpt-4o')
  .withContext({ style: 'creative', tone: 'engaging' })
  .build();

// Editor agent  
const editorAgent = agent('Editor Agent', 'You are an editor who refines and improves text')
  .withModel('gpt-4o')
  .withContext({ focus: 'clarity', style: 'professional' })
  .build();

// Example 1: Sequential agent chain (Research -> Write -> Edit)
const contentCreationChain = createAgentChain([
  { 
    config: researchAgent,
    transform: (output) => `Based on this research: ${output}\n\nWrite a blog post about this topic.`
  },
  {
    config: writingAgent,
    transform: (output) => `Please edit and improve this draft: ${output}`
  },
  {
    config: editorAgent,
  }
]);

// Example 2: Parallel analysis agents
const analysisAgents = createAgentParallel([
  { 
    config: pipe(
      researchAgent,
      withContext({ analysisType: 'technical' })
    ),
    input: 'Analyze this from a technical perspective'
  },
  {
    config: pipe(
      researchAgent, 
      withContext({ analysisType: 'business' })
    ),
    input: 'Analyze this from a business perspective'
  },
  {
    config: pipe(
      researchAgent,
      withContext({ analysisType: 'user' })
    ),
    input: 'Analyze this from a user experience perspective'
  }
]);

// Example 3: Agent router based on input type
const agentRouter = createAgentRouter([
  {
    condition: (input) => input.toLowerCase().includes('weather'),
    agent: pipe(
      agent('Weather Specialist', 'You specialize in weather information'),
      withModel('gpt-4o')
    ).build(),
  },
  {
    condition: (input) => input.toLowerCase().includes('code') || input.toLowerCase().includes('program'),
    agent: agent('Code Assistant', 'You are a programming expert who helps with code')
      .withModel('gpt-4o')
      .build(),
  },
  {
    condition: (input) => input.toLowerCase().includes('write') || input.toLowerCase().includes('article'),
    agent: writingAgent,
  }
], researchAgent); // fallback agent

// Example 4: Map-Reduce workflow for processing multiple documents
const documentProcessor = createMapReduceWorkflow(
  [researchAgent, researchAgent, researchAgent], // Map agents
  agent('Synthesizer', 'Combine multiple analyses into a comprehensive summary')
    .withModel('gpt-4o')
    .build(), // Reduce agent
  (input: string) => input.split('\n\n'), // Split by paragraphs
  (outputs) => outputs.join('\n---\n') // Combine with separators
);

// Example 5: Observable agent with monitoring
const monitoredAgent = createObservableAgent(researchAgent);

// Subscribe to events
monitoredAgent.subscribe((event, data) => {
  console.log(`[${new Date().toISOString()}] ${event}:`, data);
});

// Example 6: Workflow with middleware
const enhancedPipeline = withMiddleware(
  createPipeline(async (input: string) => {
    const result = await run(researchAgent, input);
    return result.output;
  }),
  loggingMiddleware(console.log),
  retryMiddleware(3, 1000),
  cachingMiddleware()
);

// Example 7: Complex workflow using AgentWorkflow class
const complexWorkflow = AgentWorkflow
  .create<string>(async (input: string) => {
    // Step 1: Research
    const researchResult = await run(researchAgent, `Research this topic: ${input}`);
    return researchResult.output;
  })
  .pipe(async (researchOutput: string) => {
    // Step 2: Write based on research
    const writeResult = await run(writingAgent, `Write content based on: ${researchOutput}`);
    return writeResult.output;
  })
  .pipe(async (draftOutput: string) => {
    // Step 3: Edit and refine
    const editResult = await run(editorAgent, `Edit and improve: ${draftOutput}`);
    return editResult.output;
  })
  .withMiddleware(
    loggingMiddleware(),
    retryMiddleware(2)
  );

// Example 8: Functional handoff pattern
const spanishAgent = agent('Spanish Agent', 'You only speak Spanish and are very helpful')
  .withModel('gpt-4o')
  .build();

const triageAgent = pipe(
  agent('Triage Agent', 'Route users to the appropriate agent based on their language'),
  withModel('gpt-4o'),
  withHandoffs([
    createHandoff(spanishAgent, {
      condition: keywordHandoffCondition(['español', 'spanish', 'hola', 'gracias']),
      inputFilter: removeToolMessagesFilter,
      description: 'Handle Spanish language requests'
    })
  ])
).build();

// Usage functions
export const runAdvancedExamples = async () => {
  console.log('=== Sequential Chain Example ===');
  const chainResult = await contentCreationChain.run('artificial intelligence in healthcare');
  console.log(chainResult.output);

  console.log('\n=== Parallel Analysis Example ===');
  const parallelResults = await analysisAgents.run('blockchain technology adoption');
  parallelResults.forEach((result, index) => {
    console.log(`Analysis ${index + 1}:`, result.output);
  });

  console.log('\n=== Agent Router Example ===');
  const routerResult1 = await agentRouter.run('What\'s the weather like today?');
  console.log('Weather query:', routerResult1.output);
  
  const routerResult2 = await agentRouter.run('Help me write a function in Python');
  console.log('Code query:', routerResult2.output);

  console.log('\n=== Map-Reduce Workflow Example ===');
  const docResult = await documentProcessor.run(
    'AI is transforming healthcare.\n\nMachine learning helps diagnose diseases.\n\nRobots assist in surgery.'
  );
  console.log('Document analysis:', docResult.output);

  console.log('\n=== Enhanced Pipeline Example ===');
  const pipelineResult = await enhancedPipeline('quantum computing applications');
  console.log('Pipeline result:', pipelineResult);

  console.log('\n=== Complex Workflow Example ===');
  const workflowResult = await complexWorkflow.execute('sustainable energy solutions');
  console.log('Workflow result:', workflowResult);
};

// Export all examples
export {
  researchAgent,
  writingAgent,
  editorAgent,
  contentCreationChain,
  analysisAgents,
  agentRouter,
  documentProcessor,
  monitoredAgent,
  enhancedPipeline,
  complexWorkflow,
  triageAgent,
  spanishAgent,
};