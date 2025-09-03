import { createAgent } from '../agents/index.js';
import { createOpenAIClientFromEnv } from '../agents/openaiClient.js';
import { z } from 'zod';
import { fromZod } from '../agents/schema.js';

async function main() {
  const client = createOpenAIClientFromEnv();
  const agent = createAgent(client, {
    name: 'StructuredAgent',
    instructions: 'When JSON is requested, return only valid JSON matching the schema.',
  });

  const expect = fromZod(z.object({ result: z.number() }));

  const { content, structured } = await agent.run({
    messages: [
      { role: 'user', content: 'Return only {"result": 42}.' },
    ],
    expect,
  });

  console.log('Text:', content);
  console.log('Structured:', structured);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

