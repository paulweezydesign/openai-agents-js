import type { ZodObject, ZodSchema } from 'zod';
import type OpenAI from 'openai';

// Core types for functional agent system
export type AgentContext = Record<string, unknown>;

export type ModelSettings = {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
  responseFormat?: OpenAI.ChatCompletionCreateParams['response_format'];
};

export type Message = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
};

export type ToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

export type ToolResult = {
  toolCallId: string;
  result: string;
  success: boolean;
  error?: string;
};

// Functional tool definition
export type ToolDefinition<TInput = any, TOutput = any> = {
  name: string;
  description: string;
  parameters: ZodSchema<TInput>;
  execute: (input: TInput, context?: AgentContext) => Promise<TOutput> | TOutput;
  needsApproval?: boolean | ((input: TInput, context?: AgentContext) => Promise<boolean> | boolean);
  strict?: boolean;
};

// Agent configuration as immutable data structure
export type AgentConfig<TOutput = any> = {
  name: string;
  instructions: string | ((context: AgentContext) => Promise<string> | string);
  model?: string;
  modelSettings?: ModelSettings;
  tools?: ToolDefinition[];
  outputSchema?: ZodSchema<TOutput>;
  maxTurns?: number;
  context?: AgentContext;
};

// Run configuration
export type RunConfig = {
  model?: string;
  modelSettings?: ModelSettings;
  maxTurns?: number;
  context?: AgentContext;
  streaming?: boolean;
  tracing?: boolean;
};

// Results
export type RunResult<TOutput = string> = {
  output: TOutput;
  messages: Message[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  turns: number;
  metadata: {
    agentName: string;
    model: string;
    timestamp: Date;
    duration: number;
  };
};

// Stream events
export type StreamEvent = 
  | { type: 'message_start'; message: Partial<Message> }
  | { type: 'message_delta'; delta: string }
  | { type: 'message_complete'; message: Message }
  | { type: 'tool_call_start'; toolCall: ToolCall }
  | { type: 'tool_call_complete'; toolCall: ToolCall; result: ToolResult }
  | { type: 'agent_handoff'; fromAgent: string; toAgent: string }
  | { type: 'run_complete'; result: RunResult };

// Handoff types
export type HandoffConfig = {
  targetAgent: AgentConfig;
  condition?: (messages: Message[], context?: AgentContext) => boolean;
  inputFilter?: (messages: Message[]) => Message[];
  description?: string;
};

// Extended agent config with optional handoffs and guardrails
export type ExtendedAgentConfig<TOutput = any> = AgentConfig<TOutput> & {
  handoffs?: HandoffConfig[];
  inputGuardrails?: InputGuardrail[];
  outputGuardrails?: OutputGuardrail<TOutput>[];
};

// Guardrail types
export type InputGuardrail = {
  name: string;
  check: (input: string, context?: AgentContext) => Promise<boolean> | boolean;
  errorMessage?: string;
};

export type OutputGuardrail<TOutput = any> = {
  name: string;
  check: (output: TOutput, context?: AgentContext) => Promise<boolean> | boolean;
  errorMessage?: string;
};

// Composition types
export type Pipeline<TInput, TOutput> = (input: TInput) => Promise<TOutput>;
export type Middleware<TInput, TOutput> = (
  next: Pipeline<TInput, TOutput>
) => Pipeline<TInput, TOutput>;

// Higher-order function types
export type AgentTransformer<TConfig extends AgentConfig = AgentConfig> = 
  (config: TConfig) => TConfig;

export type ToolTransformer<TTool extends ToolDefinition = ToolDefinition> = 
  (tool: TTool) => TTool;