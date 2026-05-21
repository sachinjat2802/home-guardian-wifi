import { OpenAI } from 'openai';
import { getDB } from '../../../src/lib/db.js';

export const runtime = 'nodejs';

const openai = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY || "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"
});

export async function POST(request) {
  try {
    const { prompt = "Write a limerick about the wonders of GPU computing." } = await request.json();

    // RAG Implementation: Retrieve historical context from the database
    let ragContext = "";
    try {
      const db = await getDB();
      // Simple keyword extraction for RAG matching (very basic simulation of embeddings)
      const keywords = prompt.toLowerCase().split(' ').filter(w => w.length > 4).map(w => `%${w}%`);
      let historicalEvents = [];
      
      if (keywords.length > 0) {
        // Build a dynamic LIKE query for the keywords
        const likeClauses = keywords.map(() => `msg LIKE ?`).join(' OR ');
        historicalEvents = await db.all(`SELECT time, msg, type FROM events WHERE ${likeClauses} ORDER BY timestamp DESC LIMIT 5`, keywords);
      }
      
      // Also grab the latest 3 health alerts just in case
      const recentAlerts = await db.all(`SELECT timestamp, message, severity FROM health_alerts ORDER BY timestamp DESC LIMIT 3`);
      
      if (historicalEvents.length > 0 || recentAlerts.length > 0) {
        ragContext = "\n\n--- RAG RETRIEVED HISTORICAL KNOWLEDGE ---\n";
        if (historicalEvents.length > 0) {
          ragContext += "Relevant Past Events:\n" + historicalEvents.map(e => `- [${e.time}] (${e.type}): ${e.msg}`).join('\n') + "\n";
        }
        if (recentAlerts.length > 0) {
          ragContext += "Recent Health Alerts:\n" + recentAlerts.map(a => `- ${a.severity.toUpperCase()}: ${a.message}`).join('\n') + "\n";
        }
        ragContext += "-------------------------------------------\n";
      }
    } catch (dbErr) {
      console.error("RAG Database Retrieval failed:", dbErr);
    }

    const enhancedPrompt = prompt + ragContext;

    const openAiStream = await openai.chat.completions.create({
      model: "nvidia/nemotron-3-super-120b-a12b",
      messages: [{ role: "user", content: enhancedPrompt }],
      temperature: 1,
      top_p: 0.95,
      max_tokens: 8192,
      extra_body: {
        chat_template_kwargs: { enable_thinking: false },
        reasoning_budget: 16384
      },
      stream: true
    });

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of openAiStream) {
            const content = chunk?.choices?.[0]?.delta?.content;
            if (content !== undefined) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();
        } catch (error) {
          console.error("Error in stream processing:", error);
          controller.error(error);
        }
      }
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate completion" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}
