import OpenAI from 'openai';
import type { Message } from './index';

export type ChatArgs = {
  model: string;
  messages: Message[];
  temperature?: number;
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
};

export type ChatResult = { content: string };

export function createOpenAIClientFromEnv(): {
  chat: (args: ChatArgs) => Promise<ChatResult>;
} {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in the environment');
  }
  const client = new OpenAI({ apiKey });

  return {
    async chat({ model, messages, temperature = 0.2, signal, onDelta }: ChatArgs): Promise<ChatResult> {
      // Map our Message[] to OpenAI chat message format as-is (compatible roles)
      const chatMessages = messages.map(m => ({ role: m.role as any, content: m.content, name: m.name }));

      if (onDelta) {
        // Streaming
        const stream = await client.chat.completions.create({
          model,
          messages: chatMessages as any,
          temperature,
          stream: true,
          signal,
        });
        let full = '';
        for await (const chunk of stream) {
          const delta = (chunk as any).choices?.[0]?.delta?.content ?? '';
          if (delta) {
            full += delta;
            onDelta(delta);
          }
        }
        return { content: full };
      }

      const completion = await client.chat.completions.create({
        model,
        messages: chatMessages as any,
        temperature,
        signal,
      });

      const content = completion.choices?.[0]?.message?.content ?? '';
      return { content };
    },
  };
}

