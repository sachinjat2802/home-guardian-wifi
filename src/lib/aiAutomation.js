import { getAllHealthSummaries } from './analytics.js';
import { getDB } from './db.js';

const AI_ROUTE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Generate natural language insights from health summary data using the AI route
 * @returns {Promise<string>} Generated insights text
 */
export async function generateHealthInsights() {
  try {
    // Get latest health summaries for all occupants
    const summaries = await getAllHealthSummaries();
    
    if (!summaries || summaries.length === 0) {
      return "No health data available for insights generation.";
    }

    // Format data for AI prompt
    const dataText = summaries.map(s => 
      `Occupant: ${s.occupant_id || 'Unknown'}, Date: ${s.date}, ` +
      `Heart Rate: ${s.avg_heart_rate || 'N/A'} (min: ${s.min_heart_rate || 'N/A'}, max: ${s.max_heart_rate || 'N/A'}), ` +
      `Breathing Rate: ${s.avg_breathing_rate || 'N/A'}, HRV: ${s.avg_hrv || 'N/A'}, ` +
      `Temperature: ${s.avg_temp || 'N/A'}°C, SpO2: ${s.avg_spo2 || 'N/A'}%, ` +
      `Health Score: ${s.health_score || 'N/A'}/100, ` +
      `Active Min: ${s.total_active_min || 0}, Resting Min: ${s.total_resting_min || 0}, Sleeping Min: ${s.total_sleeping_min || 0}, ` +
      `Anomalies: ${s.anomaly_count || 0}, Pattern: ${s.pattern_summary || 'None'}`
    ).join('\n');

    const prompt = `Based on the following health monitoring data for multiple occupants, generate a concise natural language insights report highlighting key trends, concerns, and recommendations:

${dataText}

Provide insights in a clear, professional format suitable for healthcare monitoring. Focus on:
1. Overall health trends and patterns
2. Any concerning vital signs or anomalies
3. Activity levels and sleep quality
4. Recommendations for improvement or monitoring`;

    // Call the AI route
    const response = await fetch(`${AI_ROUTE_URL}/api/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    // Collect streamed response
    let result = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }
    } finally {
      reader.releaseLock();
    }

    return result.trim();
  } catch (error) {
    console.error('❌ [AI Automation] Failed to generate insights:', error);
    return `Error generating insights: ${error.message}`;
  }
}

/**
 * Start periodic insights generation loop (every 24 hours)
 * @returns {NodeJS.Timeout[]} Array of timer IDs for cleanup
 */
export function startInsightsLoop() {
  const insightsTimer = setInterval(async () => {
    try {
      const insights = await generateHealthInsights();
      console.log('📊 [AI Automation] Generated Health Insights:\n', insights);
      
      // Optionally store insights in database
      await storeInsights(insights);
    } catch (error) {
      console.error('❌ [AI Automation] Insights loop error:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours

  console.log('📊 [AI Automation] Started insights generation loop (every 24 hours)');
  return [insightsTimer];
}

/**
 * Store generated insights in database for historical tracking
 * @param {string} insightsText 
 */
async function storeInsights(insightsText) {
  try {
    const db = await getDB();
    await db.run(`
      CREATE TABLE IF NOT EXISTS ai_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        insights TEXT,
        timestamp INTEGER
      )
    `);
    
    await db.run(
      `INSERT INTO ai_insights (insights, timestamp) VALUES (?, ?)`,
      [insightsText, Date.now()]
    );
  } catch (error) {
    console.warn('⚠️ [AI Automation] Failed to store insights:', error);
  }
}

/**
 * Stop insights generation loop
 * @param {NodeJS.Timeout[]} timers 
 */
export function stopInsightsLoop(timers) {
  timers.forEach(t => clearInterval(t));
  console.log('📊 [AI Automation] Stopped insights generation loop');
}