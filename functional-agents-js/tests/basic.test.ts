/**
 * Basic tests for functional agents SDK
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  agent,
  tool,
  createAgent,
  pipe,
  withTools,
  withModel,
  withContext,
  withOutputSchema,
  compose,
  run,
  validateAgentConfig,
} from '../src/index.js';

// Mock OpenAI client
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mock response',
              role: 'assistant',
            },
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        }),
      },
    };
  },
}));

describe('Agent Creation', () => {
  it('should create a basic agent with fluent API', () => {
    const testAgent = agent('Test Agent', 'You are a test agent')
      .withModel('gpt-4o')
      .build();

    expect(testAgent.name).toBe('Test Agent');
    expect(testAgent.instructions).toBe('You are a test agent');
    expect(testAgent.model).toBe('gpt-4o');
  });

  it('should create agent with functional composition', () => {
    const testAgent = pipe(
      createAgent({ name: 'Test', instructions: 'Test instructions' }),
      withModel('gpt-4o'),
      withContext({ userId: '123' })
    );

    expect(testAgent.name).toBe('Test');
    expect(testAgent.model).toBe('gpt-4o');
    expect(testAgent.context?.userId).toBe('123');
  });

  it('should validate agent configuration', () => {
    expect(() => validateAgentConfig({
      name: '',
      instructions: 'test',
    })).toThrow('Agent name is required');

    expect(() => validateAgentConfig({
      name: 'test',
      instructions: '',
    })).toThrow('Agent instructions are required');

    expect(validateAgentConfig({
      name: 'test',
      instructions: 'test instructions',
    })).toBe(true);
  });
});

describe('Tool Creation', () => {
  it('should create a basic tool', () => {
    const testTool = tool({
      name: 'test_tool',
      description: 'A test tool',
      parameters: z.object({
        input: z.string(),
      }),
      execute: async ({ input }) => `Processed: ${input}`,
    });

    expect(testTool.name).toBe('test_tool');
    expect(testTool.description).toBe('A test tool');
    expect(testTool.strict).toBe(true);
  });

  it('should execute tool with valid input', async () => {
    const testTool = tool({
      name: 'echo',
      description: 'Echo input',
      parameters: z.object({
        message: z.string(),
      }),
      execute: async ({ message }) => `Echo: ${message}`,
    });

    // This would require mocking the internal tool execution
    expect(testTool.execute).toBeDefined();
  });
});

describe('Functional Composition', () => {
  it('should compose multiple transformations', () => {
    const mockTool = tool({
      name: 'mock',
      description: 'Mock tool',
      parameters: z.object({ input: z.string() }),
      execute: async ({ input }) => input,
    });

    const composedAgent = compose(
      withModel('gpt-4o'),
      withTools([mockTool]),
      withContext({ test: true })
    )(createAgent({
      name: 'Composed',
      instructions: 'Test'
    }));

    expect(composedAgent.model).toBe('gpt-4o');
    expect(composedAgent.tools).toHaveLength(1);
    expect(composedAgent.context?.test).toBe(true);
  });

  it('should pipe transformations in order', () => {
    const agent1 = createAgent({ name: 'Test', instructions: 'Test' });
    
    const agent2 = pipe(
      agent1,
      withModel('gpt-4o'),
      withContext({ step: 1 }),
      withContext({ step: 2 }) // Should merge contexts
    );

    expect(agent2.model).toBe('gpt-4o');
    expect(agent2.context?.step).toBe(2);
  });
});

describe('Output Schema', () => {
  it('should handle structured output schema', () => {
    const TestSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const structuredAgent = agent('Structured', 'Return structured data')
      .withOutputSchema(TestSchema)
      .build();

    expect(structuredAgent.outputSchema).toBe(TestSchema);
  });
});

describe('Context Management', () => {
  it('should merge contexts correctly', () => {
    const agent1 = pipe(
      createAgent({ name: 'Test', instructions: 'Test' }),
      withContext({ a: 1, b: 2 }),
      withContext({ b: 3, c: 4 }) // Should override b, add c
    );

    expect(agent1.context).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('should handle function instructions with context', async () => {
    const dynamicAgent = createAgent({
      name: 'Dynamic',
      instructions: async (context) => `Hello ${context?.userName || 'user'}!`,
    });

    const systemPrompt = await dynamicAgent.instructions?.({ userName: 'Alice' });
    expect(systemPrompt).toBe('Hello Alice!');
  });
});

describe('Tool Integration', () => {
  it('should add tools to agent configuration', () => {
    const tool1 = tool({
      name: 'tool1',
      description: 'First tool',
      parameters: z.object({}),
      execute: async () => 'result1',
    });

    const tool2 = tool({
      name: 'tool2', 
      description: 'Second tool',
      parameters: z.object({}),
      execute: async () => 'result2',
    });

    const agentWithTools = pipe(
      createAgent({ name: 'Test', instructions: 'Test' }),
      withTools([tool1]),
      withTools([tool2]) // Should accumulate tools
    );

    expect(agentWithTools.tools).toHaveLength(2);
    expect(agentWithTools.tools?.[0].name).toBe('tool1');
    expect(agentWithTools.tools?.[1].name).toBe('tool2');
  });
});

// Integration tests would require actual OpenAI API calls
describe.skip('Integration Tests', () => {
  beforeEach(() => {
    // Set up real OpenAI client for integration tests
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('should run a basic agent', async () => {
    const testAgent = agent('Test', 'You are helpful').build();
    const result = await run(testAgent, 'Hello!');
    
    expect(result.output).toBeTruthy();
    expect(result.messages).toBeDefined();
    expect(result.metadata.agentName).toBe('Test');
  });
});