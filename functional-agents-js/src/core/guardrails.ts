import type {
  InputGuardrail,
  OutputGuardrail,
  AgentContext,
} from './types.js';

/**
 * Functional guardrail system
 */

/**
 * Create an input guardrail
 */
export const createInputGuardrail = (
  name: string,
  check: (input: string, context?: AgentContext) => Promise<boolean> | boolean,
  errorMessage?: string
): InputGuardrail => ({
  name,
  check,
  errorMessage: errorMessage || `Input guardrail "${name}" failed`,
});

/**
 * Create an output guardrail
 */
export const createOutputGuardrail = <TOutput = any>(
  name: string,
  check: (output: TOutput, context?: AgentContext) => Promise<boolean> | boolean,
  errorMessage?: string
): OutputGuardrail<TOutput> => ({
  name,
  check,
  errorMessage: errorMessage || `Output guardrail "${name}" failed`,
});

/**
 * Execute input guardrails
 */
export const executeInputGuardrails = async (
  input: string,
  guardrails: InputGuardrail[],
  context?: AgentContext
): Promise<void> => {
  for (const guardrail of guardrails) {
    const passed = await guardrail.check(input, context);
    if (!passed) {
      throw new Error(guardrail.errorMessage);
    }
  }
};

/**
 * Execute output guardrails
 */
export const executeOutputGuardrails = async <TOutput>(
  output: TOutput,
  guardrails: OutputGuardrail<TOutput>[],
  context?: AgentContext
): Promise<void> => {
  for (const guardrail of guardrails) {
    const passed = await guardrail.check(output, context);
    if (!passed) {
      throw new Error(guardrail.errorMessage);
    }
  }
};

/**
 * Common guardrail implementations
 */

/**
 * Content length guardrail
 */
export const contentLengthGuardrail = (
  maxLength: number,
  minLength: number = 0
): InputGuardrail => createInputGuardrail(
  'content_length',
  (input) => input.length >= minLength && input.length <= maxLength,
  `Content must be between ${minLength} and ${maxLength} characters`
);

/**
 * Profanity filter guardrail
 */
export const profanityFilterGuardrail = (
  bannedWords: string[]
): InputGuardrail => createInputGuardrail(
  'profanity_filter',
  (input) => !bannedWords.some(word => 
    input.toLowerCase().includes(word.toLowerCase())
  ),
  'Input contains prohibited content'
);

/**
 * JSON format output guardrail
 */
export const jsonFormatGuardrail = (): OutputGuardrail<string> => createOutputGuardrail(
  'json_format',
  (output) => {
    try {
      JSON.parse(output);
      return true;
    } catch {
      return false;
    }
  },
  'Output must be valid JSON'
);

/**
 * Output length guardrail
 */
export const outputLengthGuardrail = (
  maxLength: number,
  minLength: number = 0
): OutputGuardrail<string> => createOutputGuardrail(
  'output_length',
  (output) => output.length >= minLength && output.length <= maxLength,
  `Output must be between ${minLength} and ${maxLength} characters`
);

/**
 * Custom regex pattern guardrail
 */
export const regexPatternGuardrail = (
  pattern: RegExp,
  shouldMatch: boolean = true
): InputGuardrail => createInputGuardrail(
  'regex_pattern',
  (input) => pattern.test(input) === shouldMatch,
  `Input ${shouldMatch ? 'must match' : 'must not match'} pattern: ${pattern}`
);

/**
 * Rate limiting guardrail
 */
export const rateLimitGuardrail = (
  maxRequestsPerMinute: number,
  requestTracker: Map<string, number[]> = new Map()
): InputGuardrail => createInputGuardrail(
  'rate_limit',
  (input, context) => {
    const userId = context?.userId as string || 'anonymous';
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const userRequests = requestTracker.get(userId) || [];
    const recentRequests = userRequests.filter(timestamp => timestamp > oneMinuteAgo);
    
    if (recentRequests.length >= maxRequestsPerMinute) {
      return false;
    }
    
    recentRequests.push(now);
    requestTracker.set(userId, recentRequests);
    return true;
  },
  `Rate limit exceeded: maximum ${maxRequestsPerMinute} requests per minute`
);

/**
 * Compose multiple guardrails
 */
export const composeGuardrails = {
  input: (...guardrails: InputGuardrail[]): InputGuardrail => createInputGuardrail(
    'composed_input_guardrails',
    async (input, context) => {
      for (const guardrail of guardrails) {
        const passed = await guardrail.check(input, context);
        if (!passed) return false;
      }
      return true;
    }
  ),
  
  output: <TOutput>(...guardrails: OutputGuardrail<TOutput>[]): OutputGuardrail<TOutput> => createOutputGuardrail(
    'composed_output_guardrails',
    async (output, context) => {
      for (const guardrail of guardrails) {
        const passed = await guardrail.check(output, context);
        if (!passed) return false;
      }
      return true;
    }
  ),
};

/**
 * Conditional guardrails
 */
export const conditionalGuardrail = {
  input: (
    condition: (input: string, context?: AgentContext) => boolean,
    guardrail: InputGuardrail
  ): InputGuardrail => createInputGuardrail(
    `conditional_${guardrail.name}`,
    async (input, context) => {
      if (!condition(input, context)) return true;
      return guardrail.check(input, context);
    }
  ),
  
  output: <TOutput>(
    condition: (output: TOutput, context?: AgentContext) => boolean,
    guardrail: OutputGuardrail<TOutput>
  ): OutputGuardrail<TOutput> => createOutputGuardrail(
    `conditional_${guardrail.name}`,
    async (output, context) => {
      if (!condition(output, context)) return true;
      return guardrail.check(output, context);
    }
  ),
};