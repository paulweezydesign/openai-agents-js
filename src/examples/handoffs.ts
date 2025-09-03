import { createAgent } from '../agents/index.js';
import { createOpenAIClientFromEnv } from '../agents/openaiClient.js';

async function main() {
  const client = createOpenAIClientFromEnv();

  const spanishAgent = createAgent(client, {
    name: 'SpanishAgent',
    instructions: 'Answer only in Spanish.',
  });

  const englishAgent = createAgent(client, {
    name: 'EnglishAgent',
    instructions: 'Answer only in English.',
  });

  const router = createAgent(client, {
    name: 'Router',
    instructions:
      'Detect language of the user. If Spanish, return {"handoff":"SpanishAgent","reason":"spanish"}. If English, answer directly.',
    handoff: async (to, messages) => {
      const target = to === 'SpanishAgent' ? spanishAgent : englishAgent;
      return target.run({ messages });
    },
  });

  const { content } = await router.run({
    messages: [
      { role: 'user', content: '¿Puedes describir el cielo al atardecer?' },
    ],
  });

  console.log('Routed output:', content);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

