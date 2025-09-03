import { z } from 'zod';
import type {
  AgentConfig,
  ExtendedAgentConfig,
  AgentContext,
  Message,
  ToolDefinition,
  HandoffConfig,
  InputGuardrail,
  OutputGuardrail,
  ModelSettings,
  AgentTransformer,
} from './types.js';

/**
 * Create an agent configuration using functional composition
 */
export const createAgent = <TOutput = string>(
  config: AgentConfig<TOutput>
): AgentConfig<TOutput> => ({
  maxTurns: 10,
  tools: [],
  context: {},
  ...config,
});

/**
 * Add tools to an agent configuration
 */
export const withTools = <TConfig extends AgentConfig>(
  tools: ToolDefinition[]
): AgentTransformer<TConfig> => (config) => ({
  ...config,
  tools: [...(config.tools || []), ...tools],
});

/**
 * Set model settings for an agent
 */
export const withModelSettings = <TConfig extends AgentConfig>(
  settings: ModelSettings
): AgentTransformer<TConfig> => (config) => ({
  ...config,
  modelSettings: { ...config.modelSettings, ...settings },
});

/**
 * Set the model for an agent
 */
export const withModel = <TConfig extends AgentConfig>(
  model: string
): AgentTransformer<TConfig> => (config) => ({
  ...config,
  model,
});

/**
 * Add context to an agent
 */
export const withContext = <TConfig extends AgentConfig>(
  context: AgentContext
): AgentTransformer<TConfig> => (config) => ({
  ...config,
  context: { ...config.context, ...context },
});

/**
 * Set output schema for structured outputs
 */
export const withOutputSchema = <TOutput, TConfig extends AgentConfig>(
  schema: z.ZodSchema<TOutput>
): AgentTransformer<TConfig> => (config) => ({
  ...config,
  outputSchema: schema,
} as TConfig);

/**
 * Set maximum turns for an agent
 */
export const withMaxTurns = <TConfig extends AgentConfig>(
  maxTurns: number
): AgentTransformer<TConfig> => (config) => ({
  ...config,
  maxTurns,
});

/**
 * Add handoff capabilities to an agent
 */
export const withHandoffs = <TConfig extends ExtendedAgentConfig>(
  handoffs: HandoffConfig[]
): AgentTransformer<TConfig> => (config) => ({
  ...config,
  handoffs: [...(config.handoffs || []), ...handoffs],
});

/**
 * Add input guardrails to an agent
 */
export const withInputGuardrails = <TConfig extends ExtendedAgentConfig>(
  guardrails: InputGuardrail[]
): AgentTransformer<TConfig> => (config) => ({
  ...config,
  inputGuardrails: [...(config.inputGuardrails || []), ...guardrails],
});

/**
 * Add output guardrails to an agent
 */
export const withOutputGuardrails = <TConfig extends ExtendedAgentConfig>(
  guardrails: OutputGuardrail[]
): AgentTransformer<TConfig> => (config) => ({
  ...config,
  outputGuardrails: [...(config.outputGuardrails || []), ...guardrails],
});

/**
 * Compose multiple agent transformers
 */
export const compose = <TConfig extends AgentConfig>(
  ...transformers: AgentTransformer<TConfig>[]
): AgentTransformer<TConfig> => (config) =>
  transformers.reduce((acc, transformer) => transformer(acc), config);

/**
 * Pipe operator for functional composition
 */
export const pipe = <TConfig extends AgentConfig>(
  config: TConfig,
  ...transformers: AgentTransformer<TConfig>[]
): TConfig => compose(...transformers)(config);

/**
 * Agent builder type
 */
export type AgentBuilder<TOutput = string> = {
  config: AgentConfig<TOutput>;
  withTools(tools: ToolDefinition[]): AgentBuilder<TOutput>;
  withModel(model: string): AgentBuilder<TOutput>;
  withModelSettings(settings: ModelSettings): AgentBuilder<TOutput>;
  withContext(context: AgentContext): AgentBuilder<TOutput>;
  withOutputSchema<T>(schema: z.ZodSchema<T>): AgentBuilder<T>;
  withMaxTurns(maxTurns: number): AgentBuilder<TOutput>;
  withHandoffs(handoffs: HandoffConfig[]): AgentBuilder<TOutput>;
  withInputGuardrails(guardrails: InputGuardrail[]): AgentBuilder<TOutput>;
  withOutputGuardrails(guardrails: OutputGuardrail[]): AgentBuilder<TOutput>;
  build(): AgentConfig<TOutput>;
};

/**
 * Create an agent with fluent API
 */
export const agent = <TOutput = string>(name: string, instructions: string): AgentBuilder<TOutput> => ({
  config: createAgent<TOutput>({ name, instructions }),
  
  withTools: function(tools: ToolDefinition[]) {
    return { ...this, config: withTools(tools)(this.config) };
  },
  
  withModel: function(model: string) {
    return { ...this, config: withModel(model)(this.config) };
  },
  
  withModelSettings: function(settings: ModelSettings) {
    return { ...this, config: withModelSettings(settings)(this.config) };
  },
  
  withContext: function(context: AgentContext) {
    return { ...this, config: withContext(context)(this.config) };
  },
  
  withOutputSchema: function<T>(schema: z.ZodSchema<T>): any {
    return { ...this, config: withOutputSchema(schema)(this.config) };
  },
  
  withMaxTurns: function(maxTurns: number) {
    return { ...this, config: withMaxTurns(maxTurns)(this.config) };
  },
  
  withHandoffs: function(handoffs: HandoffConfig[]) {
    return { ...this, config: withHandoffs(handoffs)(this.config as any) };
  },
  
  withInputGuardrails: function(guardrails: InputGuardrail[]) {
    return { ...this, config: withInputGuardrails(guardrails)(this.config as any) };
  },
  
  withOutputGuardrails: function(guardrails: OutputGuardrail[]) {
    return { ...this, config: withOutputGuardrails(guardrails)(this.config as any) };
  },
  
  build: function() {
    return this.config;
  },
});

/**
 * Utility to get system prompt from agent config
 */
export const getSystemPrompt = async (
  config: AgentConfig,
  context?: AgentContext
): Promise<string> => {
  if (typeof config.instructions === 'function') {
    return await config.instructions(context || config.context || {});
  }
  return config.instructions;
};

/**
 * Validate agent configuration
 */
export const validateAgentConfig = (config: AgentConfig): boolean => {
  if (!config.name?.trim()) {
    throw new Error('Agent name is required');
  }
  if (!config.instructions) {
    throw new Error('Agent instructions are required');
  }
  if (config.maxTurns && config.maxTurns < 1) {
    throw new Error('maxTurns must be greater than 0');
  }
  return true;
};

/**
 * Clone an agent configuration
 */
export const cloneAgent = <TConfig extends AgentConfig>(
  config: TConfig
): TConfig => ({
  ...config,
  tools: [...(config.tools || [])],
  context: { ...(config.context || {}) },
  modelSettings: { ...(config.modelSettings || {}) },
});