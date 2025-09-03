### Functional JavaScript Agents (Parity with Python Agents SDK)

This guide documents a minimal, composable Agent API implemented in `src/agents/` that mirrors the core features of the OpenAI Python Agents SDK, with modern functional JavaScript ergonomics.

- **Composability**: Configure agents using `.with(...)` and merge settings/tools by name.
- **Tools / Function Calling**: The model requests tools by returning JSON `{ "tool": "NAME", "args": { ... } }`.
- **Structured Outputs**: Validate outputs with `zod` via `fromZod(...)`.
- **Guardrails**: Input/output guards to validate and sanitize.
- **Handoffs**: Transfer control with `{ "handoff": "AgentName", "reason": "..." }` and a `handoff` callback.
- **Streaming & Tracing**: Optional token streaming and event tracing hooks.

---

### Install & Setup

```bash
npm install
export OPENAI_API_KEY=sk-...
export OPENAI_MODEL=gpt-4o-mini # optional
```

---

### Quickstart

```ts
import { createAgent } from './src/agents/index.js';
import { createOpenAIClientFromEnv } from './src/agents/openaiClient.js';

const client = createOpenAIClientFromEnv();
const agent = createAgent(client, {
  name: 'Quickstart',
  instructions: 'Be concise. If JSON is requested, return only JSON.'
});

const { content } = await agent.run({
  messages: [{ role: 'user', content: 'Hello! Summarize yourself in one sentence.' }]
});
console.log(content);
```

Or run the minimal example:

```bash
npm run example:minimal
```

---

### API

- `createAgent(client, config): Agent`
  - `client.chat({ model, messages, temperature, signal, onDelta }) => Promise<{ content: string }>`
  - `config`:
    - `name?: string`
    - `instructions?: string`
    - `model?: string`
    - `temperature?: number`
    - `tools?: ToolDefinition[]`
    - `inputGuard?(messages) => PromiseLike<Message[]>`
    - `outputGuard?(text) => PromiseLike<string>`
    - `handoff?(to, messages, context) => Promise<{ content, structured? }>`
    - `onTrace?(event)`

- `Agent.with(extension)` → returns a new agent with merged config
- `Agent.run({ messages, expect?, context?, signal?, onDelta?, maxToolPasses? })`
  - `expect` is a `StructuredSchema<T>`; successful runs include `structured: T`

- `ToolDefinition` = `{ name, description?, schema?, execute(args, context) }`
- `fromZod(zodSchema) => StructuredSchema<T>`

---

### Python → JavaScript Feature Mapping

- **Agents**: Python Agent ↔ JS `createAgent(...).run(...)`
- **Tools**: Python `@tool` ↔ JS `ToolDefinition` with `{ name, schema, execute }`
- **Structured Outputs**: Python Pydantic ↔ JS `fromZod(zodSchema)`
- **Guardrails**: Python validators ↔ JS `inputGuard` / `outputGuard`
- **Handoffs**: Python handoffs ↔ JS `handoff(to, ...)`
- **Streaming**: Python `stream=True` ↔ JS `onDelta`
- **Tracing**: Python tracing ↔ JS `onTrace(event)`

---

### Examples

See `src/examples/` for runnable examples:

- `minimal.ts`: Hello world
- `tools.ts`: Function calling via JSON
- `structured.ts`: Zod-validated structured outputs
- `guardrails.ts`: Input/output guards
- `handoffs.ts`: Router delegating to specialized agents
- `streaming.ts`: Token streaming and tracing
- `multi-agent.ts`: Compose multiple agents

