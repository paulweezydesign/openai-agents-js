import { Agent as CoreAgent } from '@openai/agents-core';
import type { AgentOutputType } from '@openai/agents-core';
import { tool as coreTool, Handoff as CoreHandoff } from '@openai/agents-core';
import type { JsonObjectSchema } from '@openai/agents-core/types';
import type { ZodObject } from '@openai/zod';
import type { FunctionalAgent } from './types';

export function withTools<TContext, TOutput extends AgentOutputType = 'text'>(
  agent: FunctionalAgent<TContext, TOutput>,
  ...tools: ReturnType<typeof coreTool<any, TContext, any>>[]
): FunctionalAgent<TContext, TOutput> {
  (agent as any).tools = [...((agent as any).tools ?? []), ...tools];
  return agent;
}

export function withHandoffs<
  TContext,
  TOutput extends AgentOutputType = 'text',
>(
  agent: FunctionalAgent<TContext, TOutput>,
  ...handoffs: (FunctionalAgent<any, any> | CoreHandoff<any, any>)[]
): FunctionalAgent<TContext, TOutput> {
  (agent as any).handoffs = [...((agent as any).handoffs ?? []), ...handoffs];
  return agent;
}

export function withGuardrails<
  TContext,
  TOutput extends AgentOutputType = 'text',
>(
  agent: FunctionalAgent<TContext, TOutput>,
  options: Partial<
    Pick<CoreAgent<TContext, TOutput>, 'inputGuardrails' | 'outputGuardrails'>
  >,
): FunctionalAgent<TContext, TOutput> {
  Object.assign(agent as any, options);
  return agent;
}

export function withModel<TContext, TOutput extends AgentOutputType = 'text'>(
  agent: FunctionalAgent<TContext, TOutput>,
  model: string,
  modelSettings?: Partial<CoreAgent<TContext, TOutput>['modelSettings']>,
): FunctionalAgent<TContext, TOutput> {
  (agent as any).model = model;
  if (modelSettings)
    (agent as any).modelSettings = {
      ...(agent as any).modelSettings,
      ...modelSettings,
    };
  return agent;
}

export function withOutputType<TContext>(
  agent: FunctionalAgent<TContext, any>,
  outputType: ZodObject<any> | JsonObjectSchema<any> | 'text',
) {
  (agent as any).outputType = outputType as any;
  return agent as any;
}

export const tool = coreTool;
export const Handoff = CoreHandoff;
