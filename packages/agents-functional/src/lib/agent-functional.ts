import { Agent as CoreAgent } from '@openai/agents-core';
import type { AgentOutputType } from '@openai/agents-core';
import type { FunctionalAgent, CreateAgentOptions } from './types';
export { run as runAgent } from '@openai/agents-core';
export { run as streamAgent } from '@openai/agents-core';

export function createAgent<
  TContext = unknown,
  TOutput extends AgentOutputType = 'text',
>(
  options: CreateAgentOptions<TContext, TOutput>,
): FunctionalAgent<TContext, TOutput> {
  return new CoreAgent<TContext, TOutput>(options as any);
}
