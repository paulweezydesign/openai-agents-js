/**
 * Functional OpenAI Agents SDK
 * 
 * A modern, functional approach to building AI agents with:
 * - Immutable data structures
 * - Functional composition
 * - Type safety
 * - Modern JavaScript syntax (ES2022+)
 * - One-to-one feature parity with Python SDK
 */

// Re-export everything from core
export * from './core/index.js';

// Re-export composition utilities
export * from './composition/index.js';

// Convenience exports for common patterns
export {
  createMapReduceWorkflow,
  createObservableAgent,
  createAgentStrategy,
  createCircuitBreakerAgent,
  createAgentDecorator,
  withMemoization,
  withTimeout,
  curry,
  partial,
  composeFunction,
  composeAsync,
  Maybe,
  Either,
} from './composition/patterns.js';

/**
 * Quick start utilities
 */

/**
 * Create a simple agent with sensible defaults
 */
export const quickAgent = (name: string, instructions: string) => {
  const { pipe, createAgent, withModel, withMaxTurns } = require('./core/agent.js');
  return pipe(
    createAgent({ name, instructions }),
    withModel('gpt-4o'),
    withMaxTurns(10)
  );
};

/**
 * Create an agent with common tools
 */
export const agentWithCommonTools = (name: string, instructions: string) => {
  const { pipe, createAgent, withTools, withModel } = require('./core/agent.js');
  const { webSearchTool, fileOperationsTool } = require('./core/tools.js');
  return pipe(
    createAgent({ name, instructions }),
    withTools([webSearchTool(), fileOperationsTool()]),
    withModel('gpt-4o')
  );
};

/**
 * Default export with fluent API
 */
const FunctionalAgents = {
  // Agent creation
  agent: quickAgent,
  
  // Quick access to common functions
  run: async (config: any, input: any, runConfig?: any) => {
    const { run } = await import('./core/runner.js');
    return run(config, input, runConfig);
  },
};

export default FunctionalAgents;