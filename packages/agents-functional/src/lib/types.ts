import type {
  Agent as CoreAgent,
  AgentOutputType,
  NonStreamRunOptions,
  StreamRunOptions,
  RunResult,
  StreamedRunResult,
} from '@openai/agents-core';
import type { JsonObjectSchema } from '@openai/agents-core/types';
import type { ZodObject } from '@openai/zod';

export type FunctionalAgent<
  TContext = unknown,
  TOutput extends AgentOutputType = 'text',
> = CoreAgent<TContext, TOutput>;

export type CreateAgentOptions<
  TContext = unknown,
  TOutput extends AgentOutputType = 'text',
> = ConstructorParameters<
  typeof import('@openai/agents-core').Agent<TContext, TOutput>
>[0];

export type RunOptions<TContext = unknown> =
  | NonStreamRunOptions<TContext>
  | StreamRunOptions<TContext>;

export type RunReturn<
  TContext,
  TAgent extends CoreAgent<TContext, AgentOutputType>,
> = Promise<RunResult<TContext, TAgent> | StreamedRunResult<TContext, TAgent>>;

export type OutputSchema = ZodObject<any> | JsonObjectSchema<any> | 'text';
