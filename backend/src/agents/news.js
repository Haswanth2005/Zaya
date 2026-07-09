import { getCompanyNews } from '../utils/tavily.js';
import { llm } from '../utils/llm.js';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

/**
 * Searches and synthesizes latest news.
 */
export async function newsAgent(state) {
  const ticker = state.ticker;
  const companyName = state.companyName;

  try {
    const rawNews = await getCompanyNews(ticker, companyName);
    
    // Use LLM to analyze the raw news articles and extract structured categories
    const systemPrompt = `You are a professional financial news analyst.
Analyze the following news search results for ${companyName} (${ticker}).
Extract:
1. Positive News: list 2-3 key developments.
2. Negative News: list 2-3 negative developments or controversies.
3. Key Events: CEO updates, product launches, lawsuits, or major announcements.
4. Overall News Sentiment: positive, negative, or neutral.
5. A concise 2-sentence summary.

Respond ONLY with a valid JSON object matching this structure:
{
  "summary": "...",
  "sentiment": "positive | negative | neutral",
  "positive": ["...", "..."],
  "negative": ["...", "..."],
  "events": ["...", "..."]
}
Do not include markdown tags, code blocks, or explanations. Return strictly valid JSON.`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(JSON.stringify(rawNews))
    ]);

    const jsonStr = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      news: result,
      progressLogs: [{ step: 'News', message: `✓ News: Analyzed 30-day sentiment (${result.sentiment})` }]
    };
  } catch (error) {
    console.error("Error in newsAgent:", error);
    return {
      news: {
        summary: "No news analysis available due to API limits or connection errors.",
        sentiment: "neutral",
        positive: [],
        negative: [],
        events: []
      },
      progressLogs: [{ step: 'News', message: `✗ News: Failed to analyze news` }]
    };
  }
}
