import type {
  AgentConfig,
  Message,
  RunResult,
  RunConfig,
  Pipeline,
  Middleware,
  HandoffConfig,
  AgentContext,
} from '../core/types.js';

/**
 * Functional composition utilities for agents
 */

/**
 * Create a pipeline that can be composed with other operations
 */
export const createPipeline = <TInput, TOutput>(
  fn: (input: TInput) => Promise<TOutput>
): Pipeline<TInput, TOutput> => fn;

/**
 * Compose multiple pipelines together
 */
export const composePipelines = <T1, T2, T3>(
  pipeline1: Pipeline<T1, T2>,
  pipeline2: Pipeline<T2, T3>
): Pipeline<T1, T3> => async (input: T1) => {
  const intermediate = await pipeline1(input);
  return pipeline2(intermediate);
};

/**
 * Chain multiple pipelines together using reduce
 */
export const chainPipelines = <T>(...pipelines: Pipeline<T, T>[]): Pipeline<T, T> =>
  pipelines.reduce(composePipelines);

/**
 * Create middleware for agent runs
 */
export const createMiddleware = <TInput, TOutput>(
  middleware: Middleware<TInput, TOutput>
): Middleware<TInput, TOutput> => middleware;

/**
 * Logging middleware
 */
export const loggingMiddleware = <TInput, TOutput>(
  logger: (message: string, data?: any) => void = console.log
): Middleware<TInput, TOutput> => (next) => async (input) => {
  logger('Pipeline input:', input);
  const startTime = Date.now();
  try {
    const result = await next(input);
    logger('Pipeline output:', result);
    logger('Pipeline duration:', Date.now() - startTime);
    return result;
  } catch (error) {
    logger('Pipeline error:', error);
    throw error;
  }
};

/**
 * Retry middleware
 */
export const retryMiddleware = <TInput, TOutput>(
  maxRetries: number = 3,
  delay: number = 1000
): Middleware<TInput, TOutput> => (next) => async (input) => {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await next(input);
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError;
};

/**
 * Caching middleware
 */
export const cachingMiddleware = <TInput, TOutput>(
  cache: Map<string, TOutput> = new Map(),
  keyGenerator: (input: TInput) => string = (input) => JSON.stringify(input)
): Middleware<TInput, TOutput> => (next) => async (input) => {
  const key = keyGenerator(input);
  
  if (cache.has(key)) {
    return cache.get(key)!;
  }
  
  const result = await next(input);
  cache.set(key, result);
  return result;
};

/**
 * Apply middleware to a pipeline
 */
export const withMiddleware = <TInput, TOutput>(
  pipeline: Pipeline<TInput, TOutput>,
  ...middlewares: Middleware<TInput, TOutput>[]
): Pipeline<TInput, TOutput> => 
  middlewares.reduceRight((acc, middleware) => middleware(acc), pipeline);

/**
 * Agent composition patterns
 */

/**
 * Create a sequential agent chain
 */
export const createAgentChain = (
  agents: Array<{
    config: AgentConfig;
    transform?: (output: string, context?: AgentContext) => string;
  }>
) => ({
  run: async (input: string, runConfig?: RunConfig) => {
    const { runSequence } = await import('../core/runner.js');
    return runSequence(agents, input, runConfig);
  },
    
  config: agents,
});

/**
 * Create parallel agent execution
 */
export const createAgentParallel = (
  agents: Array<{ config: AgentConfig; input?: string | Message[] }>
) => ({
  run: async (defaultInput: string, runConfig?: RunConfig) => {
    const { runParallel } = await import('../core/runner.js');
    const agentInputs = agents.map(({ config, input }) => ({
      config,
      input: input || defaultInput,
    }));
    return runParallel(agentInputs, runConfig);
  },
  
  configs: agents.map(a => a.config),
});

/**
 * Create a conditional agent router
 */
export const createAgentRouter = (
  routes: Array<{
    condition: (input: string, context?: AgentContext) => boolean;
    agent: AgentConfig;
  }>,
  fallbackAgent?: AgentConfig
) => ({
  run: async (input: string, runConfig?: RunConfig) => {
    const { run } = await import('../core/runner.js');
    const route = routes.find(r => r.condition(input, runConfig?.context));
    const selectedAgent = route?.agent || fallbackAgent;
    
    if (!selectedAgent) {
      throw new Error('No matching route found and no fallback agent provided');
    }
    
    return run(selectedAgent, input, runConfig);
  },
  
  routes,
  fallbackAgent,
});

/**
 * Create an agent with handoff capabilities
 */
export const createHandoffAgent = (
  primaryAgent: AgentConfig,
  handoffs: HandoffConfig[]
) => ({
  ...primaryAgent,
  handoffs,
});

/**
 * Functional utilities for message manipulation
 */

/**
 * Filter messages by type
 */
export const filterMessages = (
  predicate: (message: Message) => boolean
) => (messages: Message[]): Message[] => messages.filter(predicate);

/**
 * Transform messages
 */
export const transformMessages = <T>(
  transformer: (message: Message) => T
) => (messages: Message[]): T[] => messages.map(transformer);

/**
 * Get last N messages
 */
export const takeLastMessages = (n: number) => (messages: Message[]): Message[] =>
  messages.slice(-n);

/**
 * Get first N messages
 */
export const takeFirstMessages = (n: number) => (messages: Message[]): Message[] =>
  messages.slice(0, n);

/**
 * Remove tool messages
 */
export const removeToolMessages = filterMessages(msg => msg.role !== 'tool');

/**
 * Remove system messages
 */
export const removeSystemMessages = filterMessages(msg => msg.role !== 'system');

/**
 * Compose message transformations
 */
export const composeMessageTransforms = <T>(...transforms: Array<(input: T) => T>): (input: T) => T =>
  transforms.reduce((acc, transform) => (input) => transform(acc(input)), (x) => x);

/**
 * Higher-order functions for agent enhancement
 */

/**
 * Add context injection to an agent
 */
export const withContextInjection = (
  contextProvider: () => Promise<AgentContext> | AgentContext
) => (config: AgentConfig): AgentConfig => ({
  ...config,
  instructions: async (context) => {
    const injectedContext = await contextProvider();
    const mergedContext = { ...context, ...injectedContext };
    
    if (typeof config.instructions === 'function') {
      return config.instructions(mergedContext);
    }
    return config.instructions;
  },
});

/**
 * Add dynamic tool selection
 */
export const withDynamicTools = (
  toolSelector: (input: string, context?: AgentContext) => any[]
) => (config: AgentConfig): AgentConfig => ({
  ...config,
  // This would need to be handled in the runner to dynamically select tools
  tools: config.tools || [],
});

/**
 * Add result transformation
 */
export const withResultTransform = <TInput, TOutput>(
  transformer: (result: RunResult<TInput>) => RunResult<TOutput>
) => async (
  agentRun: (input: string | Message[], config?: RunConfig) => Promise<RunResult<TInput>>
) => async (input: string | Message[], config?: RunConfig): Promise<RunResult<TOutput>> => {
  const result = await agentRun(input, config);
  return transformer(result);
};

/**
 * Functional pattern for agent workflows
 */
export class AgentWorkflow<TInput = string, TOutput = string> {
  private pipeline: Pipeline<TInput, TOutput>;

  constructor(pipeline: Pipeline<TInput, TOutput>) {
    this.pipeline = pipeline;
  }

  static create<T>(fn: Pipeline<T, T>): AgentWorkflow<T, T> {
    return new AgentWorkflow(fn);
  }

  pipe<TNewOutput>(
    nextStep: Pipeline<TOutput, TNewOutput>
  ): AgentWorkflow<TInput, TNewOutput> {
    return new AgentWorkflow(composePipelines(this.pipeline, nextStep));
  }

  withMiddleware(
    ...middlewares: Middleware<TInput, TOutput>[]
  ): AgentWorkflow<TInput, TOutput> {
    return new AgentWorkflow(withMiddleware(this.pipeline, ...middlewares));
  }

  async execute(input: TInput): Promise<TOutput> {
    return this.pipeline(input);
  }
}