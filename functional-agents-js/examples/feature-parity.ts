/**
 * Feature parity examples demonstrating one-to-one matching with Python SDK
 * 
 * This file shows how the functional JavaScript implementation provides
 * equivalent functionality to the Python OpenAI Agents SDK
 */

import { z } from 'zod';
import {
  agent,
  tool,
  run,
  runStreaming,
  pipe,
  compose,
  withTools,
  withModel,
  withContext,
  withOutputSchema,
  withInputGuardrails,
  withOutputGuardrails,
  createHandoff,
  keywordHandoffCondition,
  removeToolMessagesFilter,
  contentLengthGuardrail,
  jsonFormatGuardrail,
  requireApproval,
  withErrorHandling,
  withLogging,
} from '../src/index.js';

/**
 * Python SDK Equivalent: @function_tool decorator
 * JavaScript: tool() function with Zod schema
 */

// Python: 
// @function_tool
// def get_weather(city: str) -> str:
//     """Get weather for a city."""
//     return f"Weather in {city}: sunny"

// JavaScript equivalent:
const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get weather for a city',
  parameters: z.object({
    city: z.string().describe('The city name'),
  }),
  execute: async ({ city }) => `Weather in ${city}: sunny`,
});

/**
 * Python SDK Equivalent: Agent class with tools
 * JavaScript: Functional agent composition
 */

// Python:
// agent = Agent(
//     name="Weather Agent",
//     instructions="You provide weather information",
//     tools=[get_weather]
// )

// JavaScript equivalent:
const weatherAgent = pipe(
  agent('Weather Agent', 'You provide weather information'),
  withTools([getWeatherTool]),
  withModel('gpt-4o')
).build();

/**
 * Python SDK Equivalent: Structured outputs with Pydantic
 * JavaScript: Structured outputs with Zod
 */

// Python:
// class TaskOutput(BaseModel):
//     title: str
//     priority: Literal["low", "medium", "high"]
//     due_date: Optional[str] = None

// JavaScript equivalent:
const TaskOutputSchema = z.object({
  title: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional(),
});

const taskAgent = pipe(
  agent('Task Agent', 'You manage tasks and return structured data'),
  withOutputSchema(TaskOutputSchema),
  withModel('gpt-4o')
).build();

/**
 * Python SDK Equivalent: Handoffs between agents
 * JavaScript: Functional handoff composition
 */

// Python:
// spanish_agent = Agent(
//     name="Spanish Agent",
//     instructions="You only speak Spanish"
// )
// 
// main_agent = Agent(
//     name="Main Agent", 
//     instructions="Route to Spanish agent for Spanish requests",
//     handoffs=[spanish_agent]
// )

// JavaScript equivalent:
const spanishAgent = agent('Spanish Agent', 'You only speak Spanish')
  .withModel('gpt-4o')
  .build();

const mainAgent = pipe(
  agent('Main Agent', 'Route to Spanish agent for Spanish requests'),
  withModel('gpt-4o'),
  withHandoffs([
    createHandoff(spanishAgent, {
      condition: keywordHandoffCondition(['español', 'spanish', 'hola']),
      inputFilter: removeToolMessagesFilter,
    })
  ])
).build();

/**
 * Python SDK Equivalent: Guardrails
 * JavaScript: Functional guardrail composition
 */

// Python:
// @input_guardrail
// def check_length(input_text: str) -> bool:
//     return len(input_text) <= 1000

// JavaScript equivalent:
const lengthGuardrail = contentLengthGuardrail(1000);
const jsonOutputGuardrail = jsonFormatGuardrail();

const guardedAgent = pipe(
  agent('Guarded Agent', 'You are a safe and reliable agent'),
  withInputGuardrails([lengthGuardrail]),
  withOutputGuardrails([jsonOutputGuardrail]),
  withModel('gpt-4o')
).build();

/**
 * Python SDK Equivalent: Tool approval and error handling
 * JavaScript: Functional tool enhancement
 */

// Python:
// @function_tool(needs_approval=True)
// def execute_code(code: str) -> str:
//     """Execute code safely."""
//     return subprocess.run(code, capture_output=True, text=True).stdout

// JavaScript equivalent:
const codeExecutionTool = compose(
  requireApproval(async (input, context) => {
    // Custom approval logic
    return !input.code.includes('rm -rf') && !input.code.includes('delete');
  }),
  withErrorHandling(async (error, input) => {
    return `Error executing code: ${error.message}. Input was: ${JSON.stringify(input)}`;
  }),
  withLogging()
)(tool({
  name: 'execute_code',
  description: 'Execute code safely in a sandboxed environment',
  parameters: z.object({
    code: z.string().describe('Code to execute'),
    language: z.enum(['python', 'javascript', 'bash']).describe('Programming language'),
  }),
  execute: async ({ code, language }) => {
    // Mock execution
    return `Executed ${language} code:\n${code}\n\nOutput: [mock execution result]`;
  },
}));

/**
 * Python SDK Equivalent: Agent as tool
 * JavaScript: Functional agent composition as tool
 */

// Python:
// research_agent = Agent(name="Researcher", instructions="Research topics")
// main_agent = Agent(
//     name="Main", 
//     instructions="Use research agent when needed",
//     tools=[research_agent.as_tool()]
// )

// JavaScript equivalent:
const researchAgent = agent('Researcher', 'You research topics thoroughly')
  .withModel('gpt-4o')
  .build();

// Create a tool that wraps an agent
const createAgentTool = (agentConfig: any, toolName: string, description: string) => tool({
  name: toolName,
  description,
  parameters: z.object({
    input: z.string().describe('Input to send to the agent'),
  }),
  execute: async ({ input }) => {
    const result = await run(agentConfig, input);
    return result.output;
  },
});

const researchTool = createAgentTool(
  researchAgent,
  'research_topic',
  'Research a topic thoroughly and provide detailed information'
);

const mainAgentWithResearch = pipe(
  agent('Main Agent', 'You help users and can research topics when needed'),
  withTools([researchTool]),
  withModel('gpt-4o')
).build();

/**
 * Python SDK Equivalent: Context and state management
 * JavaScript: Functional context composition
 */

// Python:
// agent = Agent(
//     name="Stateful Agent",
//     instructions="Remember user preferences",
//     context={"user_id": "123", "preferences": {"theme": "dark"}}
// )

// JavaScript equivalent:
const statefulAgent = pipe(
  agent('Stateful Agent', 'Remember user preferences and provide personalized responses'),
  withContext({
    userId: '123',
    preferences: { theme: 'dark', language: 'en' },
    sessionId: crypto.randomUUID(),
  }),
  withModel('gpt-4o')
).build();

/**
 * Python SDK Equivalent: Parallel execution
 * JavaScript: Functional parallel composition
 */

// Python:
// results = await asyncio.gather(
//     run(agent1, "task 1"),
//     run(agent2, "task 2"),
//     run(agent3, "task 3")
// )

// JavaScript equivalent:
export const parallelExecutionExample = async () => {
  const agents = [
    agent('Analyst 1', 'Analyze from perspective 1').withModel('gpt-4o').build(),
    agent('Analyst 2', 'Analyze from perspective 2').withModel('gpt-4o').build(), 
    agent('Analyst 3', 'Analyze from perspective 3').withModel('gpt-4o').build(),
  ];
  
  const results = await Promise.all([
    run(agents[0], 'Analyze market trends'),
    run(agents[1], 'Analyze customer feedback'),
    run(agents[2], 'Analyze competitive landscape'),
  ]);
  
  return results.map(r => r.output);
};

/**
 * Feature parity demonstration function
 */
export const demonstrateFeatureParity = async () => {
  console.log('=== Feature Parity Demonstration ===\n');
  
  // 1. Basic agent execution
  console.log('1. Basic Agent Execution');
  const basicResult = await run(weatherAgent, 'What\'s the weather in Paris?');
  console.log('Result:', basicResult.output);
  
  // 2. Structured output
  console.log('\n2. Structured Output');
  const taskResult = await run(taskAgent, 'Create a high priority task for "Review code"');
  console.log('Structured result:', taskResult.output);
  
  // 3. Tool execution with approval
  console.log('\n3. Tool with Approval (simulated)');
  const codeAgent = pipe(
    agent('Code Agent', 'You help with code execution'),
    withTools([codeExecutionTool]),
    withModel('gpt-4o')
  ).build();
  
  try {
    const codeResult = await run(codeAgent, 'Execute: console.log("Hello World")');
    console.log('Code result:', codeResult.output);
  } catch (error) {
    console.log('Approval required or error:', error);
  }
  
  // 4. Handoff demonstration
  console.log('\n4. Agent Handoff');
  const handoffResult = await run(mainAgent, 'Hola, ¿cómo estás?');
  console.log('Handoff result:', handoffResult.output);
  
  // 5. Context usage
  console.log('\n5. Context Usage');
  const contextResult = await run(statefulAgent, 'What are my preferences?');
  console.log('Context result:', contextResult.output);
  
  // 6. Parallel execution
  console.log('\n6. Parallel Execution');
  const parallelResults = await parallelExecutionExample();
  parallelResults.forEach((result, index) => {
    console.log(`Parallel result ${index + 1}:`, result);
  });
  
  console.log('\n✅ All features demonstrated successfully!');
};

// Export all components for testing
export {
  getWeatherTool,
  weatherAgent,
  taskAgent,
  TaskOutputSchema,
  spanishAgent,
  mainAgent,
  guardedAgent,
  codeExecutionTool,
  researchAgent,
  researchTool,
  mainAgentWithResearch,
  statefulAgent,
};