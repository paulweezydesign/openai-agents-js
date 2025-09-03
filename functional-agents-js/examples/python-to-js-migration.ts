/**
 * Python to JavaScript migration examples
 * 
 * This file shows direct translations from Python SDK patterns
 * to the functional JavaScript equivalent
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
  withHandoffs,
  withInputGuardrails,
  withOutputGuardrails,
  createHandoff,
  keywordHandoffCondition,
  contentLengthGuardrail,
  jsonFormatGuardrail,
  requireApproval,
  withErrorHandling,
} from '../src/index.js';

/**
 * EXAMPLE 1: Basic Agent Creation
 */

// Python:
// from openai_agents import Agent
// agent = Agent(
//     name="Assistant",
//     instructions="You are a helpful assistant",
//     model="gpt-4o"
// )

// JavaScript Functional Equivalent:
const basicAgent = agent('Assistant', 'You are a helpful assistant')
  .withModel('gpt-4o')
  .build();

/**
 * EXAMPLE 2: Function Tools
 */

// Python:
// from openai_agents import function_tool
// 
// @function_tool
// def get_weather(city: str) -> str:
//     """Get weather information for a city."""
//     return f"The weather in {city} is sunny"

// JavaScript Functional Equivalent:
const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get weather information for a city',
  parameters: z.object({
    city: z.string().describe('The city name'),
  }),
  execute: async ({ city }) => `The weather in ${city} is sunny`,
});

/**
 * EXAMPLE 3: Agent with Tools
 */

// Python:
// agent = Agent(
//     name="Weather Agent",
//     instructions="You provide weather information",
//     tools=[get_weather],
//     model="gpt-4o"
// )

// JavaScript Functional Equivalent:
const weatherAgent = pipe(
  agent('Weather Agent', 'You provide weather information'),
  withTools([getWeatherTool]),
  withModel('gpt-4o')
).build();

/**
 * EXAMPLE 4: Structured Output with Pydantic/Zod
 */

// Python:
// from pydantic import BaseModel
// from typing import Literal, Optional
// 
// class TaskOutput(BaseModel):
//     title: str
//     priority: Literal["low", "medium", "high"]
//     due_date: Optional[str] = None
//     tags: list[str] = []
// 
// task_agent = Agent(
//     name="Task Manager",
//     instructions="Create and manage tasks",
//     output_type=TaskOutput
// )

// JavaScript Functional Equivalent:
const TaskOutputSchema = z.object({
  title: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const taskAgent = agent('Task Manager', 'Create and manage tasks')
  .withOutputSchema(TaskOutputSchema)
  .withModel('gpt-4o')
  .build();

/**
 * EXAMPLE 5: Handoffs Between Agents
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

// JavaScript Functional Equivalent:
const spanishAgent = agent('Spanish Agent', 'You only speak Spanish')
  .withModel('gpt-4o')
  .build();

const mainAgent = pipe(
  agent('Main Agent', 'Route to Spanish agent for Spanish requests'),
  withModel('gpt-4o'),
  withHandoffs([
    createHandoff(spanishAgent, {
      condition: keywordHandoffCondition(['español', 'spanish', 'hola']),
      description: 'Handle Spanish language requests'
    })
  ])
).build();

/**
 * EXAMPLE 6: Input/Output Guardrails
 */

// Python:
// from openai_agents import input_guardrail, output_guardrail
// 
// @input_guardrail
// def check_length(input_text: str) -> bool:
//     return len(input_text) <= 1000
// 
// @output_guardrail
// def check_json_format(output: str) -> bool:
//     try:
//         json.loads(output)
//         return True
//     except:
//         return False
// 
// guarded_agent = Agent(
//     name="Guarded Agent",
//     instructions="You are safe and reliable",
//     input_guardrails=[check_length],
//     output_guardrails=[check_json_format]
// )

// JavaScript Functional Equivalent:
const guardedAgent = pipe(
  agent('Guarded Agent', 'You are safe and reliable'),
  withInputGuardrails([contentLengthGuardrail(1000)]),
  withOutputGuardrails([jsonFormatGuardrail()]),
  withModel('gpt-4o')
).build();

/**
 * EXAMPLE 7: Tool with Approval
 */

// Python:
// @function_tool(needs_approval=True)
// def execute_code(code: str) -> str:
//     """Execute code safely."""
//     return subprocess.run(code, capture_output=True, text=True).stdout

// JavaScript Functional Equivalent:
const codeExecutionTool = compose(
  requireApproval(async (input) => {
    // Custom approval logic
    return !input.code.includes('rm -rf');
  }),
  withErrorHandling(async (error, input) => {
    return `Code execution failed: ${error.message}`;
  })
)(tool({
  name: 'execute_code',
  description: 'Execute code safely',
  parameters: z.object({
    code: z.string().describe('Code to execute'),
  }),
  execute: async ({ code }) => {
    // Mock execution
    return `Executed: ${code}\nOutput: [mock result]`;
  },
}));

/**
 * EXAMPLE 8: Agent as Tool
 */

// Python:
// research_agent = Agent(name="Researcher", instructions="Research topics")
// main_agent = Agent(
//     name="Main Agent",
//     instructions="Use research when needed",
//     tools=[research_agent.as_tool(description="Research topics")]
// )

// JavaScript Functional Equivalent:
const researchAgent = agent('Researcher', 'Research topics thoroughly')
  .withModel('gpt-4o')
  .build();

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
  'Research topics thoroughly'
);

const mainAgentWithResearch = pipe(
  agent('Main Agent', 'Use research when needed'),
  withTools([researchTool]),
  withModel('gpt-4o')
).build();

/**
 * EXAMPLE 9: Context and State Management
 */

// Python:
// agent = Agent(
//     name="Stateful Agent",
//     instructions="Remember user context",
//     context={"user_id": "123", "session": "abc"}
// )

// JavaScript Functional Equivalent:
const statefulAgent = pipe(
  agent('Stateful Agent', 'Remember user context'),
  withContext({
    userId: '123',
    sessionId: 'abc',
    preferences: { theme: 'dark' },
  }),
  withModel('gpt-4o')
).build();

/**
 * EXAMPLE 10: Parallel Execution
 */

// Python:
// import asyncio
// 
// results = await asyncio.gather(
//     run(agent1, "task 1"),
//     run(agent2, "task 2"), 
//     run(agent3, "task 3")
// )

// JavaScript Functional Equivalent:
const parallelExecution = async () => {
  const agents = [
    agent('Agent 1', 'Handle task 1').withModel('gpt-4o').build(),
    agent('Agent 2', 'Handle task 2').withModel('gpt-4o').build(),
    agent('Agent 3', 'Handle task 3').withModel('gpt-4o').build(),
  ];
  
  const results = await Promise.all([
    run(agents[0], 'task 1'),
    run(agents[1], 'task 2'),
    run(agents[2], 'task 3'),
  ]);
  
  return results.map(r => r.output);
};

/**
 * EXAMPLE 11: Streaming with Events
 */

// Python:
// async for event in run_stream(agent, "Hello"):
//     if event.type == "message_delta":
//         print(event.delta, end="")
//     elif event.type == "tool_call":
//         print(f"\nTool: {event.tool_name}")

// JavaScript Functional Equivalent:
const streamingExample = async () => {
  for await (const event of runStreaming(weatherAgent, 'Hello')) {
    if (event.type === 'message_delta') {
      process.stdout.write(event.delta);
    } else if (event.type === 'tool_call_start') {
      console.log(`\nTool: ${event.toolCall.function.name}`);
    }
  }
};

/**
 * EXAMPLE 12: Error Handling
 */

// Python:
// try:
//     result = await run(agent, "input")
// except MaxTurnsExceededError:
//     print("Too many turns")
// except GuardrailTripwireTriggered as e:
//     print(f"Guardrail failed: {e}")

// JavaScript Functional Equivalent:
const errorHandlingExample = async () => {
  try {
    const result = await run(guardedAgent, 'input');
    console.log(result.output);
  } catch (error) {
    if (error.message.includes('Maximum turns')) {
      console.log('Too many turns');
    } else if (error.message.includes('guardrail')) {
      console.log(`Guardrail failed: ${error.message}`);
    } else {
      console.log(`Unexpected error: ${error.message}`);
    }
  }
};

// Demo function to run all migration examples
export const runMigrationExamples = async () => {
  console.log('=== Python to JavaScript Migration Examples ===\n');
  
  console.log('1. Basic Agent');
  const basic = await run(basicAgent, 'Hello!');
  console.log('Output:', basic.output);
  
  console.log('\n2. Weather Tool');
  const weather = await run(weatherAgent, 'Weather in London?');
  console.log('Output:', weather.output);
  
  console.log('\n3. Structured Output');
  const task = await run(taskAgent, 'Create task: "Review code" with high priority');
  console.log('Structured output:', task.output);
  
  console.log('\n4. Handoff Example');
  const handoff = await run(mainAgent, 'Hola, ¿cómo estás?');
  console.log('Handoff result:', handoff.output);
  
  console.log('\n5. Parallel Execution');
  const parallel = await parallelExecution();
  console.log('Parallel results:', parallel);
  
  console.log('\n✅ All migration examples completed!');
};

export {
  basicAgent,
  weatherAgent,
  taskAgent,
  guardedAgent,
  mainAgent,
  spanishAgent,
  statefulAgent,
  codeExecutionTool,
  researchAgent,
  mainAgentWithResearch,
};