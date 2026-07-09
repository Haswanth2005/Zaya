import { llm } from '../utils/llm.js';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

/**
 * Validates the company query and maps it to a ticker.
 */
export async function validationAgent(state) {
  const query = state.query;
  
  const systemPrompt = `You are a financial data validation agent. 
Given a user query (which could be a company name, ticker symbol, or brand name), your job is to identify:
1. The official ticker symbol.
2. The official company name.
3. The primary exchange it trades on (e.g., NASDAQ, NYSE, LSE).
4. The sector (e.g., Technology, Financial Services).
5. The industry (e.g., Consumer Electronics, Internet Retail).

Respond ONLY with a valid JSON object matching this structure:
{
  "ticker": "AAPL",
  "companyName": "Apple Inc.",
  "exchange": "NASDAQ",
  "sector": "Technology",
  "industry": "Consumer Electronics"
}
Do not include markdown tags, code blocks, or explanations. Return strictly valid JSON.`;

  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Query: "${query}"`)
    ]);

    const jsonStr = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    if (!result.ticker || !result.companyName) {
      throw new Error("LLM returned null or empty ticker/companyName");
    }

    return {
      ticker: result.ticker,
      companyName: result.companyName,
      validation: result,
      progressLogs: [{ step: 'Validation', message: `✓ Validated: ${result.companyName} (${result.ticker})` }]
    };
  } catch (error) {
    console.error("Error in validationAgent:", error);
    // Safe fallback using ticker as query
    const fallbackTicker = query.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    return {
      ticker: fallbackTicker,
      companyName: query,
      validation: {
        ticker: fallbackTicker,
        companyName: query,
        exchange: 'NASDAQ',
        sector: 'Unknown',
        industry: 'Unknown'
      },
      progressLogs: [{ step: 'Validation', message: `✓ Validated: ${query} (${fallbackTicker}) [Fallback]` }]
    };
  }
}
