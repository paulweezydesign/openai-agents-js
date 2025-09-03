/**
 * Basic usage examples demonstrating functional composition
 */

import { z } from 'zod';
import {
  agent,
  tool,
  run,
  pipe,
  withTools,
  withModel,
  withOutputSchema,
  createAgent,
  compose,
} from '../src/index.js';

// Example 1: Simple agent with fluent API
const simpleAgent = agent('Assistant', 'You are a helpful assistant')
  .withModel('gpt-4o')
  .build();

// Example 2: Agent with tools using functional composition
const weatherTool = tool({
  name: 'get_weather',
  description: 'Get weather information for a city',
  parameters: z.object({
    city: z.string().describe('The city name'),
    units: z.enum(['celsius', 'fahrenheit']).optional().default('celsius'),
  }),
  execute: async ({ city, units }) => {
    // Mock implementation
    return `The weather in ${city} is 22°${units === 'celsius' ? 'C' : 'F'} and sunny.`;
  },
});

const weatherAgent = pipe(
  createAgent({
    name: 'Weather Agent',
    instructions: 'You provide weather information. Always use the weather tool to get current data.',
  }),
  withTools([weatherTool]),
  withModel('gpt-4o')
);

// Example 3: Structured output agent
const TaskSchema = z.object({
  title: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const taskAgent = agent('Task Manager', 'You help organize tasks and return structured data')
  .withOutputSchema(TaskSchema)
  .withModel('gpt-4o')
  .build();

// Example 4: Agent with multiple tools using compose
const mathTool = tool({
  name: 'calculate',
  description: 'Perform mathematical calculations',
  parameters: z.object({
    expression: z.string().describe('Mathematical expression to evaluate'),
  }),
  execute: async ({ expression }) => {
    // In practice, use a safe math evaluator
    try {
      const result = eval(expression); // Don't use eval in production!
      return `Result: ${result}`;
    } catch (error) {
      return `Error: Invalid expression - ${error}`;
    }
  },
});

const timeTool = tool({
  name: 'get_time',
  description: 'Get current time information',
  parameters: z.object({
    timezone: z.string().optional().describe('Timezone (e.g., UTC, EST)'),
  }),
  execute: async ({ timezone }) => {
    const now = new Date();
    return `Current time${timezone ? ` in ${timezone}` : ''}: ${now.toISOString()}`;
  },
});

const utilityAgent = compose(
  withTools([mathTool, timeTool]),
  withModel('gpt-4o')
)(createAgent({
  name: 'Utility Agent',
  instructions: 'You are a helpful utility agent that can perform calculations and provide time information.',
}));

// Usage examples
async function runExamples() {
  console.log('=== Basic Agent Example ===');
  const result1 = await run(simpleAgent, 'Hello! How are you?');
  console.log(result1.output);

  console.log('\n=== Weather Agent Example ===');
  const result2 = await run(weatherAgent, 'What\'s the weather like in Tokyo?');
  console.log(result2.output);

  console.log('\n=== Structured Output Example ===');
  const result3 = await run(taskAgent, 'Create a task for "Review quarterly reports" with high priority');
  console.log('Structured output:', result3.output);

  console.log('\n=== Utility Agent Example ===');
  const result4 = await run(utilityAgent, 'What is 15 * 24 + 100? Also, what time is it?');
  console.log(result4.output);
}

// Export for use in other files
export {
  simpleAgent,
  weatherAgent,
  taskAgent,
  utilityAgent,
  weatherTool,
  mathTool,
  timeTool,
  runExamples,
};