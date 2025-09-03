export type AsyncOrSync<T> = Promise<T> | T;

export type ToolContext = {
  // Add per-run context (e.g., request id, user id, metadata)
  metadata?: Record<string, unknown>;
};

export type ToolDefinition<Args = unknown, Result = unknown> = {
  name: string;
  description?: string;
  schema?: unknown; // zod schema in practice, but keep generic to avoid hard coupling
  execute: (args: Args, context: ToolContext) => AsyncOrSync<Result>;
};

export type AgentState = {
  // Internal transient state for an agent during a run
  [key: string]: unknown;
};

export type Message = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
};

export type StructuredSchema<T> = {
  // runtime validate function returns parsed value or throws
  parse: (input: unknown) => T;
};

export type AgentConfig = {
  name?: string;
  instructions?: string;
  model?: string;
  temperature?: number;
  tools?: ToolDefinition[];
  inputGuard?: (input: Message[]) => AsyncOrSync<Message[]>;
  outputGuard?: (output: string) => AsyncOrSync<string>;
  onTrace?: (event: TraceEvent) => void;
  handoff?: (to: string, messages: Message[], context: ToolContext) => Promise<{ content: string; structured?: unknown }>;
};

export type TraceEvent =
  | { type: 'agent:start'; agentName?: string; config: AgentConfig }
  | { type: 'agent:stop'; agentName?: string; tokens?: number }
  | { type: 'llm:request'; model?: string; messages: Message[] }
  | { type: 'llm:response'; content: string }
  | { type: 'tool:start'; name: string; args: unknown }
  | { type: 'tool:stop'; name: string; result: unknown }
  | { type: 'handoff'; from?: string; to: string; reason?: string };

export type Agent = {
  name?: string;
  config: AgentConfig;
  with: (extension: Partial<AgentConfig>) => Agent;
  run: (input: {
    messages: Message[];
    expect?: StructuredSchema<unknown> | undefined;
    context?: ToolContext;
    signal?: AbortSignal;
    onDelta?: (delta: string) => void;
    maxToolPasses?: number;
  }) => Promise<{ content: string; structured?: unknown }>;
};

export type OpenAIClient = {
  chat: (args: {
    model: string;
    messages: Message[];
    temperature?: number;
    signal?: AbortSignal;
  }) => Promise<{ content: string }>;
};

export function createAgent(client: OpenAIClient, baseConfig: AgentConfig = {}): Agent {
  const agent: Agent = {
    name: baseConfig.name,
    config: baseConfig,
    with(extension: Partial<AgentConfig>) {
      return createAgent(client, { ...baseConfig, ...extension, tools: mergeTools(baseConfig.tools, extension.tools) });
    },
    async run({ messages, expect, context = {}, signal, onDelta, maxToolPasses = 3 }) {
      const { inputGuard, outputGuard, onTrace, model = 'gpt-4o-mini', temperature = 0.2, handoff } = baseConfig;

      const guardedInput = inputGuard ? await inputGuard(messages) : messages;
      const systemMsg: Message[] = baseConfig.instructions ? [{ role: 'system', content: baseConfig.instructions }] : [];
      let history: Message[] = [...systemMsg, ...guardedInput];

      onTrace?.({ type: 'agent:start', agentName: baseConfig.name, config: baseConfig });

      let lastContent = '';
      for (let i = 0; i < Math.max(1, maxToolPasses + 1); i++) {
        const hinted = await withToolCallHints(history, baseConfig.tools);
        onTrace?.({ type: 'llm:request', model, messages: hinted });

        const response = await client.chat({ model, messages: hinted, temperature, signal, onDelta });
        lastContent = response.content;
        onTrace?.({ type: 'llm:response', content: lastContent });

        // Check for handoff request
        const handoffObj = tryParseObject(lastContent);
        if (handoffObj && typeof handoffObj === 'object' && 'handoff' in handoffObj) {
          const to = (handoffObj as any).handoff as string;
          onTrace?.({ type: 'handoff', from: baseConfig.name, to, reason: (handoffObj as any).reason });
          if (handoff) {
            const result = await handoff(to, history, context);
            onTrace?.({ type: 'agent:stop', agentName: baseConfig.name });
            return { content: result.content, structured: result.structured };
          }
          // If no handoff handler, just return
          break;
        }

        // Maybe execute tool
        const toolResult = await maybeExecuteTool(lastContent, baseConfig.tools, context, onTrace);
        if (toolResult !== lastContent) {
          // Tool was executed; append tool call and result to history and continue loop
          history = [
            ...history,
            { role: 'assistant', content: lastContent },
            { role: 'tool', content: toolResult },
          ];
          continue;
        }

        // No tool call; finalize
        break;
      }

      let content = lastContent;
      content = outputGuard ? await outputGuard(content) : content;

      let structured: unknown | undefined = undefined;
      if (expect) {
        structured = expect.parse(tryParseObject(content));
      }

      onTrace?.({ type: 'agent:stop', agentName: baseConfig.name });
      return { content, structured };
    },
  };
  return agent;
}

function mergeTools(a?: ToolDefinition[], b?: ToolDefinition[]): ToolDefinition[] | undefined {
  if (!a && !b) return undefined;
  const byName = new Map<string, ToolDefinition>();
  for (const t of a ?? []) byName.set(t.name, t);
  for (const t of b ?? []) byName.set(t.name, t);
  return Array.from(byName.values());
}

async function withToolCallHints(messages: Message[], tools?: ToolDefinition[]): Promise<Message[]> {
  if (!tools || tools.length === 0) return messages;
  // Simple hinting: include a synthetic system message listing available tools
  const toolList = tools.map(t => `- ${t.name}: ${t.description ?? ''}`).join('\n');
  return [
    { role: 'system', content: `You may call tools by responding with JSON {"tool":"NAME","args":OBJECT}. Tools:\n${toolList}` },
    ...messages,
  ];
}

export async function maybeExecuteTool(
  content: string,
  tools: ToolDefinition[] | undefined,
  context: ToolContext,
  onTrace?: (event: TraceEvent) => void,
): Promise<string> {
  if (!tools || tools.length === 0) return content;
  const toolCall = parseToolCall(content);
  if (!toolCall) return content;
  const found = tools.find(t => t.name === toolCall.tool);
  if (!found) return content;
  onTrace?.({ type: 'tool:start', name: found.name, args: toolCall.args });
  const result = await found.execute(toolCall.args, context);
  onTrace?.({ type: 'tool:stop', name: found.name, result });
  return typeof result === 'string' ? result : JSON.stringify(result);
}

function parseToolCall(content: string): { tool: string; args: any } | null {
  try {
    const obj = tryParseObject(content);
    if (obj && typeof obj === 'object' && 'tool' in obj && 'args' in obj) {
      return obj as { tool: string; args: any };
    }
    return null;
  } catch {
    return null;
  }
}

function tryParseObject(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    // Best-effort: try to locate JSON in the text
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // ignore
      }
    }
    return undefined;
  }
}

