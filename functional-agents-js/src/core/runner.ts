import OpenAI from 'openai';
import { z } from 'zod';
import type {
  AgentConfig,
  AgentContext,
  Message,
  ToolCall,
  ToolResult,
  RunConfig,
  RunResult,
  StreamEvent,
  ModelSettings,
} from './types.js';
import { getSystemPrompt, validateAgentConfig } from './agent.js';

/**
 * Default OpenAI client instance
 */
let defaultOpenAI: OpenAI | null = null;

/**
 * Set the default OpenAI client
 */
export const setOpenAIClient = (client: OpenAI): void => {
  defaultOpenAI = client;
};

/**
 * Get or create OpenAI client
 */
const getOpenAIClient = (apiKey?: string): OpenAI => {
  if (defaultOpenAI) return defaultOpenAI;
  
  return new OpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
  });
};

/**
 * Execute a single tool call
 */
const executeTool = async (
  toolCall: ToolCall,
  tools: AgentConfig['tools'] = [],
  context?: AgentContext
): Promise<ToolResult> => {
  const tool = tools.find(t => t.name === toolCall.function.name);
  
  if (!tool) {
    return {
      toolCallId: toolCall.id,
      result: `Tool "${toolCall.function.name}" not found`,
      success: false,
      error: 'Tool not found',
    };
  }

  try {
    // Parse arguments
    const args = JSON.parse(toolCall.function.arguments);
    
    // Validate with schema
    const validatedArgs = tool.parameters.parse(args);
    
    // Check approval if needed
    if (tool.needsApproval) {
      const needsApproval = typeof tool.needsApproval === 'function' 
        ? await tool.needsApproval(validatedArgs, context)
        : tool.needsApproval;
        
      if (needsApproval) {
        return {
          toolCallId: toolCall.id,
          result: 'Tool execution requires approval',
          success: false,
          error: 'Approval required',
        };
      }
    }
    
    // Execute tool
    const result = await tool.execute(validatedArgs, context);
    
    return {
      toolCallId: toolCall.id,
      result: typeof result === 'string' ? result : JSON.stringify(result),
      success: true,
    };
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      result: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Execute multiple tools in parallel
 */
const executeTools = async (
  toolCalls: ToolCall[],
  tools: AgentConfig['tools'] = [],
  context?: AgentContext
): Promise<ToolResult[]> => {
  return Promise.all(
    toolCalls.map(toolCall => executeTool(toolCall, tools, context))
  );
};

/**
 * Create messages for OpenAI API
 */
const createMessages = async (
  config: AgentConfig,
  input: string | Message[],
  context?: AgentContext
): Promise<OpenAI.ChatCompletionMessageParam[]> => {
  const systemPrompt = await getSystemPrompt(config, context);
  const messages: OpenAI.ChatCompletionMessageParam[] = [];

  // Add system message
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  // Add input messages
  if (typeof input === 'string') {
    messages.push({ role: 'user', content: input });
  } else {
    for (const msg of input) {
      if (msg.role === 'tool') {
        messages.push({
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.toolCallId!,
        });
      } else if (msg.toolCalls) {
        messages.push({
          role: 'assistant',
          content: msg.content || null,
          tool_calls: msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        });
      } else {
        messages.push({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        });
      }
    }
  }

  return messages;
};

/**
 * Create tool definitions for OpenAI API
 */
const createToolDefinitions = (
  tools: AgentConfig['tools'] = []
): OpenAI.ChatCompletionTool[] => {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters._def as any,
      strict: tool.strict,
    },
  }));
};

/**
 * Run a single turn of the agent
 */
const runTurn = async (
  config: AgentConfig,
  messages: Message[],
  openai: OpenAI,
  runConfig?: RunConfig
): Promise<{
  message: Message;
  toolResults?: ToolResult[];
  shouldContinue: boolean;
}> => {
  const modelSettings: ModelSettings = {
    ...config.modelSettings,
    ...runConfig?.modelSettings,
  };

  const apiMessages = await createMessages(config, messages, runConfig?.context || config.context);
  const tools = createToolDefinitions(config.tools);

  const completion = await openai.chat.completions.create({
    model: runConfig?.model || config.model || 'gpt-4o',
    messages: apiMessages,
    tools: tools.length > 0 ? tools : undefined,
    temperature: modelSettings.temperature,
    max_tokens: modelSettings.maxTokens,
    top_p: modelSettings.topP,
    frequency_penalty: modelSettings.frequencyPenalty,
    presence_penalty: modelSettings.presencePenalty,
    seed: modelSettings.seed,
    response_format: modelSettings.responseFormat,
  });

  const choice = completion.choices[0];
  if (!choice) {
    throw new Error('No response from model');
  }

  const message: Message = {
    role: 'assistant',
    content: choice.message.content || '',
  };

  // Handle tool calls
  if (choice.message.tool_calls) {
          const toolCalls: ToolCall[] = choice.message.tool_calls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.type === 'function' ? tc.function.name : '',
          arguments: tc.type === 'function' ? tc.function.arguments : '{}',
        },
      }));

    message.toolCalls = toolCalls;

    // Execute tools
    const toolResults = await executeTools(
      toolCalls, 
      config.tools, 
      runConfig?.context || config.context
    );

    return {
      message,
      toolResults,
      shouldContinue: true,
    };
  }

  // Check if we have structured output
  if (config.outputSchema && message.content) {
    try {
      const parsed = JSON.parse(message.content);
      config.outputSchema.parse(parsed);
      return { message, shouldContinue: false };
    } catch {
      // Continue if parsing fails
    }
  }

  return {
    message,
    shouldContinue: false,
  };
};

/**
 * Main run function - executes an agent with given input
 */
export const run = async <TOutput = string>(
  config: AgentConfig<TOutput>,
  input: string | Message[],
  runConfig?: RunConfig
): Promise<RunResult<TOutput>> => {
  validateAgentConfig(config);
  
  const openai = getOpenAIClient();
  const startTime = Date.now();
  const maxTurns = runConfig?.maxTurns || config.maxTurns || 10;
  
  let messages: Message[] = Array.isArray(input) ? [...input] : [];
  let turns = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Add initial user message if input is string
  if (typeof input === 'string') {
    messages.push({ role: 'user', content: input });
  }

  while (turns < maxTurns) {
    turns++;
    
    const { message, toolResults, shouldContinue } = await runTurn(
      config,
      messages,
      openai,
      runConfig
    );

    messages.push(message);

    // Add tool results to messages
    if (toolResults) {
      for (const result of toolResults) {
        messages.push({
          role: 'tool',
          content: result.result,
          toolCallId: result.toolCallId,
        });
      }
    }

    if (!shouldContinue) {
      break;
    }
  }

  if (turns >= maxTurns) {
    throw new Error(`Maximum turns (${maxTurns}) exceeded`);
  }

  // Process final output
  const lastMessage = messages[messages.length - 1];
  let finalOutput: TOutput;

  if (config.outputSchema && lastMessage?.content) {
    try {
      const parsed = JSON.parse(lastMessage.content);
      finalOutput = config.outputSchema.parse(parsed) as TOutput;
    } catch {
      finalOutput = lastMessage.content as TOutput;
    }
  } else {
    finalOutput = (lastMessage?.content || '') as TOutput;
  }

  return {
    output: finalOutput,
    messages,
    usage: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
    },
    turns,
    metadata: {
      agentName: config.name,
      model: runConfig?.model || config.model || 'gpt-4o',
      timestamp: new Date(),
      duration: Date.now() - startTime,
    },
  };
};

/**
 * Streaming run function
 */
export const runStreaming = async function* <TOutput = string>(
  config: AgentConfig<TOutput>,
  input: string | Message[],
  runConfig?: RunConfig
): AsyncGenerator<StreamEvent, RunResult<TOutput>, unknown> {
  validateAgentConfig(config);
  
  const openai = getOpenAIClient();
  const startTime = Date.now();
  const maxTurns = runConfig?.maxTurns || config.maxTurns || 10;
  
  let messages: Message[] = Array.isArray(input) ? [...input] : [];
  let turns = 0;

  // Add initial user message if input is string
  if (typeof input === 'string') {
    messages.push({ role: 'user', content: input });
  }

  while (turns < maxTurns) {
    turns++;
    
    const apiMessages = await createMessages(config, messages, runConfig?.context || config.context);
    const tools = createToolDefinitions(config.tools);

    const stream = await openai.chat.completions.create({
      model: runConfig?.model || config.model || 'gpt-4o',
      messages: apiMessages,
      tools: tools.length > 0 ? tools : undefined,
      stream: true,
      temperature: config.modelSettings?.temperature,
      max_tokens: config.modelSettings?.maxTokens,
    });

    let currentMessage: Message = { role: 'assistant', content: '' };
    let toolCalls: ToolCall[] = [];

    yield { type: 'message_start', message: currentMessage };

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const delta = choice.delta;

      if (delta.content) {
        currentMessage.content += delta.content;
        yield { type: 'message_delta', delta: delta.content };
      }

      if (delta.tool_calls) {
        // Handle tool calls (simplified for this example)
        for (const toolCall of delta.tool_calls) {
          if (toolCall.function?.name) {
            const tc: ToolCall = {
              id: toolCall.id || '',
              type: 'function',
              function: {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments || '',
              },
            };
            toolCalls.push(tc);
            yield { type: 'tool_call_start', toolCall: tc };
          }
        }
      }
    }

    currentMessage.toolCalls = toolCalls.length > 0 ? toolCalls : undefined;
    messages.push(currentMessage);
    yield { type: 'message_complete', message: currentMessage };

    // Execute tools if any
    if (toolCalls.length > 0) {
      const toolResults = await executeTools(toolCalls, config.tools, runConfig?.context || config.context);
      
      for (const result of toolResults) {
        const toolCall = toolCalls.find(tc => tc.id === result.toolCallId)!;
        yield { type: 'tool_call_complete', toolCall, result };
        
        messages.push({
          role: 'tool',
          content: result.result,
          toolCallId: result.toolCallId,
        });
      }
    } else {
      break; // No tool calls, we're done
    }
  }

  if (turns >= maxTurns) {
    throw new Error(`Maximum turns (${maxTurns}) exceeded`);
  }

  // Process final output
  const lastMessage = messages[messages.length - 1];
  let finalOutput: TOutput;

  if (config.outputSchema && lastMessage?.content) {
    try {
      const parsed = JSON.parse(lastMessage.content);
      finalOutput = config.outputSchema.parse(parsed) as TOutput;
    } catch {
      finalOutput = lastMessage.content as TOutput;
    }
  } else {
    finalOutput = (lastMessage?.content || '') as TOutput;
  }

  const result: RunResult<TOutput> = {
    output: finalOutput,
    messages,
    usage: {
      inputTokens: 0, // Would be calculated from actual API response
      outputTokens: 0,
      totalTokens: 0,
    },
    turns,
    metadata: {
      agentName: config.name,
      model: runConfig?.model || config.model || 'gpt-4o',
      timestamp: new Date(),
      duration: Date.now() - startTime,
    },
  };

  yield { type: 'run_complete', result: result as any };
  return result;
};

/**
 * Utility to collect all events from streaming run
 */
export const collectStreamingRun = async <TOutput = string>(
  config: AgentConfig<TOutput>,
  input: string | Message[],
  runConfig?: RunConfig
): Promise<{ result: RunResult<TOutput>; events: StreamEvent[] }> => {
  const events: StreamEvent[] = [];
  let result: RunResult<TOutput> | undefined;

  for await (const event of runStreaming(config, input, runConfig)) {
    events.push(event);
    if (event.type === 'run_complete') {
      result = event.result as RunResult<TOutput>;
    }
  }

  if (!result) {
    throw new Error('No result received from streaming run');
  }

  return { result, events };
};

/**
 * Run multiple agents in parallel
 */
export const runParallel = async <TOutput = string>(
  agents: Array<{ config: AgentConfig<TOutput>; input: string | Message[] }>,
  runConfig?: RunConfig
): Promise<RunResult<TOutput>[]> => {
  return Promise.all(
    agents.map(({ config, input }) => run(config, input, runConfig))
  );
};

/**
 * Run agents in sequence, passing output from one to the next
 */
export const runSequence = async <TOutput = string>(
  agents: Array<{ config: AgentConfig; transform?: (output: string) => string }>,
  initialInput: string,
  runConfig?: RunConfig
): Promise<RunResult<TOutput>> => {
  let currentInput = initialInput;
  let lastResult: RunResult<TOutput> | undefined;

  for (const { config, transform } of agents) {
    lastResult = await run(config, currentInput, runConfig) as RunResult<TOutput>;
    currentInput = transform 
      ? transform(lastResult.output as string)
      : lastResult.output as string;
  }

  return lastResult!;
};

/**
 * Create a reusable runner function
 */
export const createRunner = <TOutput = string>(
  config: AgentConfig<TOutput>,
  defaultRunConfig?: RunConfig
) => ({
  run: (input: string | Message[], runConfig?: RunConfig) =>
    run(config, input, { ...defaultRunConfig, ...runConfig }),
    
  runStreaming: (input: string | Message[], runConfig?: RunConfig) =>
    runStreaming(config, input, { ...defaultRunConfig, ...runConfig }),
    
  config,
});