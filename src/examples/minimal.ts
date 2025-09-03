import { createAgent } from '../agents/index.js';
import { createOpenAIClientFromEnv } from '../agents/openaiClient.js';
import { z } from 'zod';
import { fromZod } from '../agents/schema.js';

async function main() {
  const client = createOpenAIClientFromEnv();

  const mathTool = {
    name: 'calculator',
    description: 'Evaluate a basic arithmetic expression and return the numeric result.',
    schema: z.object({ expression: z.string() }),
    async execute(args: { expression: string }) {
      // Extremely naive evaluator for demo only
      // eslint-disable-next-line no-new-func
      const result = Function(`return (${args.expression})`)();
      return { result };
    },
  };

  const agent = createAgent(client, {
    name: 'JS-Agent',
    instructions: 'Be concise. Use tools when helpful. If structured output is expected, respond with pure JSON.',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    tools: [mathTool],
    onTrace: (e) => {
      if (e.type === 'llm:request') {
        console.log('LLM request ->', e.model);
      } else if (e.type === 'llm:response') {
        console.log('LLM response <-', e.content.slice(0, 120));
      } else if (e.type === 'tool:start') {
        console.log('Tool start ->', e.name, e.args);
      } else if (e.type === 'tool:stop') {
        console.log('Tool stop <-', e.name, e.result);
      }
    },
  });

  const expect = fromZod(z.object({
    result: z.number(),
  }));

  const { content, structured } = await agent.run({
    messages: [
      { role: 'user', content: 'Compute 2 + 2 using the calculator tool and return JSON {"result": number}.' },
    ],
    expect,
    onDelta: (d) => process.stdout.write(d),
  });

  console.log('\n---');
  console.log('Final content:', content);
  console.log('Structured:', structured);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

