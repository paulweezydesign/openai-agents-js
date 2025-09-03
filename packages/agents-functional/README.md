# @openai/agents-functional

Functional, composable facade over the OpenAI Agents JS SDK that mirrors Python Agents SDK ergonomics in idiomatic modern JS.

## Install

```bash
npm i @openai/agents @openai/agents-functional
```

## Quick start

```ts
import {
  createAgent,
  runAgent,
  withTools,
  tool,
} from '@openai/agents-functional';

const weather = tool({
  name: 'get_weather',
  description: 'Get weather by city',
  parameters: {
    type: 'object',
    properties: { city: { type: 'string' } },
    required: ['city'],
    additionalProperties: false,
  },
  strict: true,
  execute: async ({ city }) => `The weather in ${city} is sunny`,
});

const agent = withTools(
  createAgent({
    name: 'Assistant',
    instructions: 'You are a helpful assistant.',
  }),
  weather,
);

const result = await runAgent(agent, 'Weather in Tokyo?');
console.log(result.finalOutput);
```

## API

- `createAgent(options)`: constructs a core Agent.
- `runAgent(agent, input, options?)`: runs or streams depending on options.
- `withTools(agent, ...tools)`: add tools.
- `withHandoffs(agent, ...handoffs)`: add handoffs.
- `withGuardrails(agent, { inputGuardrails, outputGuardrails })`.
- `withModel(agent, model, modelSettings?)`.
- `withOutputType(agent, schema | 'text')`.
- `tool`: re-export of core `tool`.
- `Handoff`: re-export of core `Handoff`.

## Python → JS parity map

- Agent config: `name`, `instructions`, `tools`, `handoffs`, `guardrails`, `outputType`, `model`, `modelSettings`.
- Run loop: identical semantics via core `run`/`Runner`.
- Tools: same `tool({ name, description, parameters, strict, execute })`.
- Handoffs: pass agents/handoffs; or use `Agent.create` for output union typing.
- Structured outputs: pass Zod or JSON schema to `withOutputType`.
