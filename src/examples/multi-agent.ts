import { createAgent } from '../agents/index.js';
import { createOpenAIClientFromEnv } from '../agents/openaiClient.js';

async function main() {
  const client = createOpenAIClientFromEnv();

  const summarizer = createAgent(client, {
    name: 'Summarizer',
    instructions: 'Summarize text in one sentence.',
  });

  const polisher = summarizer.with({
    name: 'Polisher',
    instructions: 'Take the previous result and rewrite it elegantly and concisely.',
  });

  const input = 'The quick brown fox jumps over the lazy dog. The dog yawns.';
  const first = await summarizer.run({ messages: [{ role: 'user', content: input }] });
  const second = await polisher.run({ messages: [{ role: 'user', content: first.content }] });

  console.log('Summary:', first.content);
  console.log('Polished:', second.content);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

