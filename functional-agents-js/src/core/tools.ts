import { z } from 'zod';
import type {
  ToolDefinition,
  AgentContext,
  ToolTransformer,
} from './types.js';

/**
 * Create a tool definition using functional composition
 */
export const createTool = <TInput, TOutput>(
  config: ToolDefinition<TInput, TOutput>
): ToolDefinition<TInput, TOutput> => ({
  strict: true,
  needsApproval: false,
  ...config,
});

/**
 * Tool factory with Zod schema validation
 */
export const tool = <TInput, TOutput>(config: {
  name: string;
  description: string;
  parameters: z.ZodSchema<TInput>;
  execute: (input: TInput, context?: AgentContext) => Promise<TOutput> | TOutput;
  needsApproval?: boolean | ((input: TInput, context?: AgentContext) => Promise<boolean> | boolean);
  strict?: boolean;
}): ToolDefinition<TInput, TOutput> => createTool(config);

/**
 * Create a simple function tool with minimal configuration
 */
export const simpleTool = <TInput extends Record<string, any>, TOutput>(
  name: string,
  description: string,
  parameterSchema: z.ZodSchema<TInput>,
  execute: (input: TInput, context?: AgentContext) => Promise<TOutput> | TOutput
): ToolDefinition<TInput, TOutput> => 
  tool({
    name,
    description,
    parameters: parameterSchema,
    execute,
  });

/**
 * Tool transformers for composition
 */

/**
 * Add approval requirement to a tool
 */
export const requireApproval = <TTool extends ToolDefinition>(
  approvalFn?: (input: any, context?: AgentContext) => Promise<boolean> | boolean
): ToolTransformer<TTool> => (tool) => ({
  ...tool,
  needsApproval: approvalFn || true,
});

/**
 * Add strict mode to a tool
 */
export const withStrict = <TTool extends ToolDefinition>(
  strict: boolean = true
): ToolTransformer<TTool> => (tool) => ({
  ...tool,
  strict,
});

/**
 * Add error handling to a tool
 */
export const withErrorHandling = <TTool extends ToolDefinition>(
  errorHandler: (error: Error, input: any, context?: AgentContext) => string | Promise<string>
): ToolTransformer<TTool> => (tool) => ({
  ...tool,
  execute: async (input, context) => {
    try {
      return await tool.execute(input, context);
    } catch (error) {
      return await errorHandler(error as Error, input, context);
    }
  },
});

/**
 * Add logging to a tool
 */
export const withLogging = <TTool extends ToolDefinition>(
  logger: (message: string, data?: any) => void = console.log
): ToolTransformer<TTool> => (tool) => ({
  ...tool,
  execute: async (input, context) => {
    logger(`Executing tool: ${tool.name}`, { input, context });
    const result = await tool.execute(input, context);
    logger(`Tool completed: ${tool.name}`, { result });
    return result;
  },
});

/**
 * Add caching to a tool
 */
export const withCaching = <TTool extends ToolDefinition>(
  cache: Map<string, any> = new Map()
): ToolTransformer<TTool> => (tool) => ({
  ...tool,
  execute: async (input, context) => {
    const cacheKey = JSON.stringify({ input, context });
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    const result = await tool.execute(input, context);
    cache.set(cacheKey, result);
    return result;
  },
});

/**
 * Compose multiple tool transformers
 */
export const composeTool = <TTool extends ToolDefinition>(
  ...transformers: ToolTransformer<TTool>[]
): ToolTransformer<TTool> => (tool) =>
  transformers.reduce((acc, transformer) => transformer(acc), tool);

/**
 * Common tool definitions
 */

/**
 * Web search tool
 */
export const webSearchTool = (config?: { 
  apiKey?: string; 
  userLocation?: { city: string; country?: string } 
}) => tool({
  name: 'web_search',
  description: 'Search the web for current information',
  parameters: z.object({
    query: z.string().describe('The search query'),
    maxResults: z.number().optional().describe('Maximum number of results to return'),
  }),
  execute: async ({ query, maxResults = 5 }) => {
    // Implementation would use actual web search API
    return `Web search results for "${query}": [${maxResults} results would be returned here]`;
  },
});

/**
 * File operations tool
 */
export const fileOperationsTool = tool({
  name: 'file_operations',
  description: 'Read, write, and manipulate files',
  parameters: z.object({
    operation: z.enum(['read', 'write', 'list', 'delete']),
    path: z.string().describe('File or directory path'),
    content: z.string().optional().describe('Content to write (for write operations)'),
  }),
  execute: async ({ operation, path, content }) => {
    // Implementation would use actual file system operations
    switch (operation) {
      case 'read':
        return `Contents of ${path}: [file contents would be here]`;
      case 'write':
        return `Wrote content to ${path}`;
      case 'list':
        return `Directory listing for ${path}: [files would be listed here]`;
      case 'delete':
        return `Deleted ${path}`;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
});

/**
 * Code execution tool
 */
export const codeExecutionTool = tool({
  name: 'execute_code',
  description: 'Execute code in a safe environment',
  parameters: z.object({
    language: z.enum(['python', 'javascript', 'bash']),
    code: z.string().describe('The code to execute'),
  }),
  execute: async ({ language, code }) => {
    // Implementation would use actual code execution environment
    return `Executed ${language} code:\n${code}\n\nOutput: [execution results would be here]`;
  },
  needsApproval: true,
});