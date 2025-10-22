import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

export function assertOpenAIConfigured(): void {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
}

const client = new OpenAI({ apiKey });

export async function generateAIResponse(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string = 'gpt-4o-mini',
  temperature: number = 0.7,
  maxTokens: number = 800
): Promise<string> {
  assertOpenAIConfigured();
  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });
  return completion.choices[0]?.message?.content ?? '';
}

export async function generateAgenticResponse(
  userMessage: string,
  systemPrompt: string,
  conversationHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<string> {
  const msgs = [
    { role: 'system' as const, content: systemPrompt },
    ...conversationHistory,
    { role: 'user' as const, content: userMessage },
  ];
  return generateAIResponse(
    msgs,
    options?.model ?? 'gpt-4o-mini',
    options?.temperature ?? 0.7,
    options?.maxTokens ?? 1000
  );
}


