import { createAgent } from '../agents/index.js';
import { createOpenAIClientFromEnv } from '../agents/openaiClient.js';
import { z } from 'zod';

async function main() {
  const client = createOpenAIClientFromEnv();

  const calculator = {
    name: 'calculator',
    description: 'Evaluate an arithmetic expression and return { result }',
    schema: z.object({ expression: z.string() }),
    async execute({ expression }: { expression: string }) {
      const value = Function(`return (${expression})`)();
      return { result: value };
    },
  };

  const agent = createAgent(client, {
    name: 'ToolAgent',
    instructions: 'Use tools when appropriate. When returning JSON, include only JSON.',
    tools: [calculator],
  });

  const { content } = await agent.run({
    messages: [
      { role: 'user', content: 'Use calculator to compute 7*6 and return JSON {"result": number}.' },
    ],
  });

  console.log('Output:', content);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

