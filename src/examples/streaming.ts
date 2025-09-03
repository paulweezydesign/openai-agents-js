import { createAgent } from '../agents/index.js';
import { createOpenAIClientFromEnv } from '../agents/openaiClient.js';

async function main() {
  const client = createOpenAIClientFromEnv();
  const agent = createAgent(client, {
    name: 'StreamingAgent',
    instructions: 'Stream your answer tokens. Keep it short.',
  });

  const { content } = await agent.run({
    messages: [
      { role: 'user', content: 'Write one sentence about the moon. Stream tokens as they are generated.' },
    ],
    onDelta: (d) => process.stdout.write(d),
  });

  console.log('\nStreamed output:', content);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

