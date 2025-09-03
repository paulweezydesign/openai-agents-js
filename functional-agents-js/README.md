# Functional OpenAI Agents SDK

A modern, functional JavaScript implementation of the OpenAI Agents SDK with complete feature parity to the Python version. Built with functional programming principles, immutable data structures, and modern JavaScript syntax.

## 🚀 Key Features

- **🔧 Functional Composition**: Build agents using pure functions and immutable data
- **🎯 One-to-One Feature Parity**: Complete compatibility with Python SDK features
- **⚡ Modern JavaScript**: ES2022+ syntax with full TypeScript support
- **🔗 Composability**: Mix and match agent behaviors using functional patterns
- **🛡️ Type Safety**: Full TypeScript support with strict type checking
- **📦 Zero Dependencies**: Only requires OpenAI client and Zod for validation

## 📋 Feature Comparison

| Feature | Python SDK | Functional JS SDK | Status |
|---------|------------|-------------------|--------|
| Basic Agents | ✅ `Agent()` | ✅ `agent()` | ✅ |
| Tool Integration | ✅ `@function_tool` | ✅ `tool()` | ✅ |
| Structured Outputs | ✅ Pydantic models | ✅ Zod schemas | ✅ |
| Handoffs | ✅ `handoffs=[]` | ✅ `withHandoffs()` | ✅ |
| Guardrails | ✅ `@input_guardrail` | ✅ `withInputGuardrails()` | ✅ |
| Streaming | ✅ `run_stream()` | ✅ `runStreaming()` | ✅ |
| Parallel Execution | ✅ `asyncio.gather()` | ✅ `runParallel()` | ✅ |
| Context Management | ✅ `context={}` | ✅ `withContext()` | ✅ |
| Tool Approval | ✅ `needs_approval=True` | ✅ `requireApproval()` | ✅ |
| Agent as Tool | ✅ `agent.as_tool()` | ✅ `createAgentTool()` | ✅ |

## 🛠️ Installation

```bash
npm install functional-openai-agents
# or
yarn add functional-openai-agents
# or  
pnpm add functional-openai-agents
```

## 🎯 Quick Start

### Basic Agent

```javascript
import { agent, run } from 'functional-openai-agents';

// Create agent with fluent API
const assistant = agent('Assistant', 'You are a helpful assistant')
  .withModel('gpt-4o')
  .build();

// Run the agent
const result = await run(assistant, 'Hello! How are you?');
console.log(result.output);
```

### Agent with Tools

```javascript
import { z } from 'zod';
import { agent, tool, pipe, withTools } from 'functional-openai-agents';

// Create a tool
const weatherTool = tool({
  name: 'get_weather',
  description: 'Get weather for a city',
  parameters: z.object({ 
    city: z.string() 
  }),
  execute: async ({ city }) => `Weather in ${city}: sunny, 22°C`,
});

// Create agent with functional composition
const weatherAgent = pipe(
  agent('Weather Agent', 'You provide weather information'),
  withTools([weatherTool]),
  withModel('gpt-4o')
).build();

const result = await run(weatherAgent, 'What\'s the weather in Tokyo?');
```

### Structured Output

```javascript
import { z } from 'zod';
import { agent, withOutputSchema } from 'functional-openai-agents';

const TaskSchema = z.object({
  title: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional(),
});

const taskAgent = agent('Task Manager', 'Create and manage tasks')
  .withOutputSchema(TaskSchema)
  .build();

const result = await run(taskAgent, 'Create a high priority task for code review');
console.log(result.output); // Typed as TaskSchema
```

## 🔄 Functional Composition Patterns

### Compose Multiple Transformations

```javascript
import { createAgent, compose, withTools, withModel, withContext } from 'functional-openai-agents';

const enhancedAgent = compose(
  withTools([weatherTool, calculatorTool]),
  withModel('gpt-4o'),
  withContext({ userId: '123', preferences: { theme: 'dark' } })
)(createAgent({
  name: 'Enhanced Agent',
  instructions: 'You are an enhanced agent with multiple capabilities'
}));
```

### Pipeline Composition

```javascript
import { pipe, withTools, withModel } from 'functional-openai-agents';

const agent = pipe(
  createAgent({ name: 'Agent', instructions: 'You help users' }),
  withTools([tool1, tool2]),
  withModel('gpt-4o'),
  withContext({ environment: 'production' })
);
```

## 🔗 Advanced Workflows

### Sequential Agent Chain

```javascript
import { createAgentChain } from 'functional-openai-agents';

const contentPipeline = createAgentChain([
  { 
    config: researchAgent,
    transform: (output) => `Research: ${output}\n\nNow write a blog post.`
  },
  { config: writerAgent },
  { config: editorAgent }
]);

const result = await contentPipeline.run('AI in healthcare');
```

### Parallel Processing

```javascript
import { createAgentParallel } from 'functional-openai-agents';

const analysisTeam = createAgentParallel([
  { config: technicalAgent, input: 'Technical analysis' },
  { config: businessAgent, input: 'Business analysis' },
  { config: userAgent, input: 'User experience analysis' }
]);

const results = await analysisTeam.run('new mobile app features');
```

### Map-Reduce Pattern

```javascript
import { createMapReduceWorkflow } from 'functional-openai-agents';

const documentProcessor = createMapReduceWorkflow(
  [analyzerAgent, analyzerAgent, analyzerAgent], // Map phase
  summarizerAgent, // Reduce phase
  (text) => text.split('\n\n'), // Split function
  (summaries) => summaries.join('\n---\n') // Combine function
);

const result = await documentProcessor.run(largeDocument);
```

## 🛡️ Guardrails and Safety

```javascript
import { 
  withInputGuardrails, 
  withOutputGuardrails,
  contentLengthGuardrail,
  profanityFilterGuardrail,
  jsonFormatGuardrail 
} from 'functional-openai-agents';

const safeAgent = pipe(
  agent('Safe Agent', 'You are a safe and reliable agent'),
  withInputGuardrails([
    contentLengthGuardrail(1000),
    profanityFilterGuardrail(['badword1', 'badword2'])
  ]),
  withOutputGuardrails([
    jsonFormatGuardrail()
  ])
).build();
```

## 🔄 Handoffs

```javascript
import { 
  createHandoff, 
  keywordHandoffCondition,
  languageHandoffCondition 
} from 'functional-openai-agents';

const spanishAgent = agent('Spanish Agent', 'You only speak Spanish').build();

const triageAgent = pipe(
  agent('Triage Agent', 'Route users to appropriate specialists'),
  withHandoffs([
    createHandoff(spanishAgent, {
      condition: keywordHandoffCondition(['español', 'spanish']),
      description: 'Handle Spanish language requests'
    })
  ])
).build();
```

## 📡 Streaming

```javascript
import { runStreaming } from 'functional-openai-agents';

for await (const event of runStreaming(agent, 'Write a long story')) {
  switch (event.type) {
    case 'message_delta':
      process.stdout.write(event.delta);
      break;
    case 'tool_call_start':
      console.log(`\n🔧 Using tool: ${event.toolCall.function.name}`);
      break;
    case 'run_complete':
      console.log('\n✅ Complete!');
      break;
  }
}
```

## 🧪 Advanced Patterns

### Observable Pattern

```javascript
import { createObservableAgent } from 'functional-openai-agents';

const observable = createObservableAgent(myAgent);

observable.subscribe((event, data) => {
  console.log(`Event: ${event}`, data);
});

const result = await observable.run('Hello world');
```

### Circuit Breaker

```javascript
import { createCircuitBreakerAgent } from 'functional-openai-agents';

const resilientAgent = createCircuitBreakerAgent(myAgent, {
  failureThreshold: 3,
  resetTimeout: 60000,
  fallbackAgent: backupAgent
});
```

### Strategy Pattern

```javascript
import { createAgentStrategy } from 'functional-openai-agents';

const strategy = createAgentStrategy(new Map([
  ['technical', technicalAgent],
  ['creative', creativeAgent],
  ['analytical', analyticalAgent]
]));

const result = await strategy.run('technical', 'Explain quantum computing');
```

## 🔧 Tool Enhancement

```javascript
import { 
  requireApproval, 
  withErrorHandling, 
  withLogging,
  withCaching,
  composeTool 
} from 'functional-openai-agents';

const enhancedTool = composeTool(
  requireApproval(),
  withErrorHandling(async (error, input) => `Error: ${error.message}`),
  withLogging(),
  withCaching()
)(myBasicTool);
```

## 🧩 Middleware

```javascript
import { 
  withMiddleware,
  loggingMiddleware,
  retryMiddleware,
  cachingMiddleware,
  createPipeline 
} from 'functional-openai-agents';

const enhancedPipeline = withMiddleware(
  createPipeline(async (input) => {
    const result = await run(myAgent, input);
    return result.output;
  }),
  loggingMiddleware(),
  retryMiddleware(3, 1000),
  cachingMiddleware()
);
```

## 🎨 Functional Programming Utilities

```javascript
import { Maybe, Either, curry, partial, composeAsync } from 'functional-openai-agents';

// Maybe monad for handling optional values
const maybeResult = Maybe.of(result)
  .map(r => r.output)
  .filter(output => output.length > 0)
  .getOrElse('No output');

// Either monad for error handling  
const eitherResult = Either.right(input)
  .map(processInput)
  .flatMap(runAgent)
  .fold(
    error => `Error: ${error}`,
    success => `Success: ${success}`
  );

// Curried functions
const createSpecializedAgent = curry((model, tools, name, instructions) =>
  pipe(
    agent(name, instructions),
    withModel(model),
    withTools(tools)
  ).build()
);

const gpt4Agent = createSpecializedAgent('gpt-4o');
const weatherGPT4 = gpt4Agent([weatherTool]);
```

## 📚 Examples

Check out the `examples/` directory for comprehensive examples:

- `basic-usage.ts` - Simple agent creation and usage
- `advanced-composition.ts` - Complex workflows and patterns
- `streaming-example.ts` - Real-time streaming interactions
- `feature-parity.ts` - One-to-one Python SDK feature matching

## 🔍 Migration from Python SDK

The functional JavaScript SDK provides direct equivalents for all Python SDK features:

```python
# Python SDK
from openai_agents import Agent, function_tool

@function_tool
def get_weather(city: str) -> str:
    return f"Weather in {city}: sunny"

agent = Agent(
    name="Weather Agent",
    instructions="Provide weather info",
    tools=[get_weather]
)

result = await run(agent, "Weather in NYC?")
```

```javascript
// Functional JavaScript SDK
import { agent, tool, run, pipe, withTools } from 'functional-openai-agents';

const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get weather for a city',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => `Weather in ${city}: sunny`,
});

const weatherAgent = pipe(
  agent('Weather Agent', 'Provide weather info'),
  withTools([getWeatherTool])
).build();

const result = await run(weatherAgent, 'Weather in NYC?');
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

## 📄 License

MIT License - see LICENSE file for details.