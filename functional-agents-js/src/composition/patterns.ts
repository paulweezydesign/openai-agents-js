import { z } from 'zod';
import type {
  AgentConfig,
  Message,
  RunResult,
  RunConfig,
  AgentContext,
  ToolDefinition,
} from '../core/types.js';
import { 
  createAgent, 
  withTools, 
  withModel, 
  withContext, 
  compose,
  pipe,
} from '../core/agent.js';
import { tool } from '../core/tools.js';
import { run, runParallel } from '../core/runner.js';
import {
  createAgentChain,
  createAgentParallel,
  createAgentRouter,
  AgentWorkflow,
} from './index.js';

/**
 * Advanced composition patterns for agent workflows
 */

/**
 * Map-Reduce pattern for agent processing
 */
export const createMapReduceWorkflow = <TInput, TMapOutput, TReduceOutput>(
  mapAgents: AgentConfig[],
  reduceAgent: AgentConfig,
  inputSplitter: (input: TInput) => string[],
  outputCombiner: (outputs: string[]) => string
) => ({
  async run(input: TInput, runConfig?: RunConfig): Promise<RunResult<TReduceOutput>> {
    // Map phase: split input and process with multiple agents
    const inputs = inputSplitter(input);
    const mapResults = await runParallel(
      mapAgents.map((config, index) => ({
        config,
        input: inputs[index] || inputs[0] || '', // Fallback to first input or empty string
      })),
      runConfig
    );
    
    // Combine map results
    const combinedOutput = outputCombiner(mapResults.map(r => r.output as string));
    
    // Reduce phase: process combined output with reduce agent
    return run(reduceAgent, combinedOutput, runConfig) as Promise<RunResult<TReduceOutput>>;
  },
  
  mapAgents,
  reduceAgent,
});

/**
 * Observer pattern for agent monitoring
 */
export const createObservableAgent = (config: AgentConfig) => {
  const observers: Array<(event: string, data: any) => void> = [];
  
  return {
    config,
    
    subscribe(observer: (event: string, data: any) => void) {
      observers.push(observer);
      return () => {
        const index = observers.indexOf(observer);
        if (index > -1) observers.splice(index, 1);
      };
    },
    
    async run(input: string | Message[], runConfig?: RunConfig) {
      observers.forEach(obs => obs('run_start', { input, config }));
      
      try {
        const result = await run(config, input, runConfig);
        observers.forEach(obs => obs('run_complete', { result }));
        return result;
      } catch (error) {
        observers.forEach(obs => obs('run_error', { error }));
        throw error;
      }
    },
  };
};

/**
 * Strategy pattern for dynamic agent selection
 */
export const createAgentStrategy = (strategies: Map<string, AgentConfig>) => ({
  addStrategy(name: string, agent: AgentConfig) {
    strategies.set(name, agent);
    return this;
  },
  
  removeStrategy(name: string) {
    strategies.delete(name);
    return this;
  },
  
  async run(strategyName: string, input: string | Message[], runConfig?: RunConfig) {
    const agent = strategies.get(strategyName);
    if (!agent) {
      throw new Error(`Strategy "${strategyName}" not found`);
    }
    return run(agent, input, runConfig);
  },
  
  getStrategies() {
    return Array.from(strategies.keys());
  },
});

/**
 * Circuit breaker pattern for agent reliability
 */
export const createCircuitBreakerAgent = (
  config: AgentConfig,
  options: {
    failureThreshold: number;
    resetTimeout: number;
    fallbackAgent?: AgentConfig;
  }
) => {
  let failureCount = 0;
  let lastFailureTime = 0;
  let isOpen = false;
  
  return {
    config,
    
    async run(input: string | Message[], runConfig?: RunConfig) {
      const now = Date.now();
      
      // Check if circuit should reset
      if (isOpen && (now - lastFailureTime) > options.resetTimeout) {
        isOpen = false;
        failureCount = 0;
      }
      
      // If circuit is open, use fallback or throw error
      if (isOpen) {
        if (options.fallbackAgent) {
          return run(options.fallbackAgent, input, runConfig);
        }
        throw new Error('Circuit breaker is open - too many failures');
      }
      
      try {
        const result = await run(config, input, runConfig);
        // Reset failure count on success
        failureCount = 0;
        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = now;
        
        if (failureCount >= options.failureThreshold) {
          isOpen = true;
        }
        
        throw error;
      }
    },
    
    getStatus() {
      return { isOpen, failureCount, lastFailureTime };
    },
    
    reset() {
      isOpen = false;
      failureCount = 0;
      lastFailureTime = 0;
    },
  };
};

/**
 * Decorator pattern for agent enhancement
 */
export const createAgentDecorator = <TEnhancement>(
  enhancement: TEnhancement,
  enhancer: (config: AgentConfig, enhancement: TEnhancement) => AgentConfig
) => (config: AgentConfig): AgentConfig & { enhancement: TEnhancement } => ({
  ...enhancer(config, enhancement),
  enhancement,
});

/**
 * Memoization decorator for agent results
 */
export const withMemoization = (
  cache: Map<string, RunResult> = new Map(),
  keyGenerator: (input: string | Message[], config: AgentConfig) => string = 
    (input, config) => `${config.name}:${JSON.stringify(input)}`
) => createAgentDecorator(
  { cache, keyGenerator },
  (config, { cache, keyGenerator }) => ({
    ...config,
    // This would need to be handled in a wrapper function
  })
);

/**
 * Timeout decorator for agent runs
 */
export const withTimeout = (timeoutMs: number) =>
  createAgentDecorator(
    { timeoutMs },
    (config) => config // Implementation would wrap the run function
  );

/**
 * Functional composition helpers
 */

/**
 * Create a curried function for agent configuration
 */
export const curry = <T extends any[], R>(
  fn: (...args: T) => R
) => {
  return function curried(...args: any[]): any {
    if (args.length >= fn.length) {
      return fn(...args as T);
    }
    return (...nextArgs: any[]) => curried(...args, ...nextArgs);
  };
};

/**
 * Partial application for agent configurations
 */
export const partial = (
  fn: (...args: any[]) => any,
  ...partialArgs: any[]
) => (...remainingArgs: any[]): any =>
  fn(...partialArgs, ...remainingArgs);

/**
 * Function composition utility
 */
export const composeFunction = <T>(...fns: Array<(arg: T) => T>) =>
  (arg: T): T => fns.reduceRight((acc, fn) => fn(acc), arg);

/**
 * Async function composition utility
 */
export const composeAsync = <T>(...fns: Array<(arg: T) => Promise<T> | T>) =>
  async (arg: T): Promise<T> => {
    let result = arg;
    for (const fn of fns.reverse()) {
      result = await fn(result);
    }
    return result;
  };

/**
 * Maybe monad for handling optional values
 */
export class Maybe<T> {
  constructor(private value: T | null | undefined) {}
  
  static of<T>(value: T | null | undefined): Maybe<T> {
    return new Maybe(value);
  }
  
  static nothing<T>(): Maybe<T> {
    return new Maybe<T>(null);
  }
  
  map<U>(fn: (value: T) => U): Maybe<U> {
    if (this.value == null) return Maybe.nothing();
    return Maybe.of(fn(this.value));
  }
  
  flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U> {
    if (this.value == null) return Maybe.nothing();
    return fn(this.value);
  }
  
  filter(predicate: (value: T) => boolean): Maybe<T> {
    if (this.value == null || !predicate(this.value)) {
      return Maybe.nothing();
    }
    return this;
  }
  
  getOrElse(defaultValue: T): T {
    return this.value ?? defaultValue;
  }
  
  isSome(): boolean {
    return this.value != null;
  }
  
  isNone(): boolean {
    return this.value == null;
  }
}

/**
 * Either monad for error handling
 */
export abstract class Either<L, R> {
  abstract map<T>(fn: (value: R) => T): Either<L, T>;
  abstract flatMap<T>(fn: (value: R) => Either<L, T>): Either<L, T>;
  abstract fold<T>(leftFn: (left: L) => T, rightFn: (right: R) => T): T;
  
  static left<L, R>(value: L): Either<L, R> {
    return new EitherLeft(value);
  }
  
  static right<L, R>(value: R): Either<L, R> {
    return new EitherRight(value);
  }
}

class EitherLeft<L, R> extends Either<L, R> {
  constructor(private value: L) {
    super();
  }
  
  map<T>(): Either<L, T> {
    return new EitherLeft(this.value);
  }
  
  flatMap<T>(): Either<L, T> {
    return new EitherLeft(this.value);
  }
  
  fold<T>(leftFn: (left: L) => T): T {
    return leftFn(this.value);
  }
}

class EitherRight<L, R> extends Either<L, R> {
  constructor(private value: R) {
    super();
  }
  
  map<T>(fn: (value: R) => T): Either<L, T> {
    return new EitherRight(fn(this.value));
  }
  
  flatMap<T>(fn: (value: R) => Either<L, T>): Either<L, T> {
    return fn(this.value);
  }
  
  fold<T>(_leftFn: (left: L) => T, rightFn: (right: R) => T): T {
    return rightFn(this.value);
  }
}