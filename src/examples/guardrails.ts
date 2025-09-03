import { createAgent } from '../agents/index.js';
import { createOpenAIClientFromEnv } from '../agents/openaiClient.js';

async function main() {
  const client = createOpenAIClientFromEnv();

  const agent = createAgent(client, {
    name: 'GuardedAgent',
    instructions: 'Be concise.',
    inputGuard: async (messages) => messages.slice(-10),
    outputGuard: async (text) => text.trim(),
    onTrace: (e) => {
      if (e.type === 'agent:start') console.log('Agent start');
      if (e.type === 'agent:stop') console.log('Agent stop');
    },
  });

  const { content } = await agent.run({
    messages: [
      { role: 'user', content: '   Say hello and include no extra whitespace.   ' },
    ],
  });

  console.log('Guarded output:', JSON.stringify(content));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

