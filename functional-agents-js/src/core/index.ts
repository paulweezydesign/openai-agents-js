/**
 * Core functional agents library
 * 
 * This module provides a functional approach to building AI agents with:
 * - Immutable configurations
 * - Functional composition
 * - Modern JavaScript syntax
 * - Type safety with TypeScript
 */

// Core types
export type {
  AgentConfig,
  AgentContext,
  Message,
  ToolCall,
  ToolResult,
  ToolDefinition,
  ModelSettings,
  RunConfig,
  RunResult,
  StreamEvent,
  HandoffConfig,
  InputGuardrail,
  OutputGuardrail,
  Pipeline,
  Middleware,
  AgentTransformer,
  ToolTransformer,
} from './types.js';

// Agent creation and composition
export {
  createAgent,
  withTools,
  withModelSettings,
  withModel,
  withContext,
  withOutputSchema,
  withMaxTurns,
  withHandoffs,
  withInputGuardrails,
  withOutputGuardrails,
  compose,
  pipe,
  agent,
  getSystemPrompt,
  validateAgentConfig,
  cloneAgent,
} from './agent.js';

// Tool creation and composition
export {
  createTool,
  tool,
  simpleTool,
  requireApproval,
  withStrict,
  withErrorHandling,
  withLogging,
  withCaching,
  composeTool,
  webSearchTool,
  fileOperationsTool,
  codeExecutionTool,
} from './tools.js';

// Runner and execution
export {
  run,
  runStreaming,
  runParallel,
  runSequence,
  createRunner,
  setOpenAIClient,
  collectStreamingRun,
} from './runner.js';

// Guardrails
export {
  createInputGuardrail,
  createOutputGuardrail,
  executeInputGuardrails,
  executeOutputGuardrails,
  contentLengthGuardrail,
  profanityFilterGuardrail,
  jsonFormatGuardrail,
  outputLengthGuardrail,
  regexPatternGuardrail,
  rateLimitGuardrail,
  composeGuardrails,
  conditionalGuardrail,
} from './guardrails.js';

// Handoffs
export {
  createHandoff,
  shouldHandoff,
  executeHandoff,
  keywordHandoffCondition,
  languageHandoffCondition,
  messageCountHandoffCondition,
  contextHandoffCondition,
  removeToolMessagesFilter,
  keepLastMessagesFilter,
  removeSystemMessagesFilter,
  keepConversationOnlyFilter,
  transformMessageContentFilter,
  composeFilters,
  createRoundRobinHandoff,
  createLoadBalancingHandoff,
  createPriorityHandoff,
} from './handoffs.js';