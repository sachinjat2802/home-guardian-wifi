import { OpenAI } from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY || "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"
});

export async function POST(request) {
  try {
    const { prompt = "Write a limerick about the wonders of GPU computing." } = await request.json();
    
    const openAiStream = await openai.chat.completions.create({
      model: "nvidia/nemotron-3-super-120b-a12b",
      messages: [{ role: "user", content: prompt }],
      temperature: 1,
      top_p: 0.95,
      max_tokens: 8192,
      extra_body: {"chat_template_kwargs":{"enable_thinking":false},"reasoning_budget":16384},
      stream: true
    });

    // Create a readable stream from the async iterator
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of openAiStream) {
            if (chunk.choices?.[0]?.delta?.content !== undefined) {
              controller.enqueue(new TextEncoder().encode(chunk.choices[0].delta.content));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Error in stream processing:', error);
          controller.error(error);
        }
      }
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked'
      }
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate completion' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}