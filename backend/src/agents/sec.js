import { getSecFilings } from '../utils/secEdgar.js';
import { llm } from '../utils/llm.js';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

/**
 * Searches and synthesizes latest SEC Filings.
 */
export async function secAgent(state) {
  const ticker = state.ticker;
  const companyName = state.companyName;

  try {
    const rawSec = await getSecFilings(ticker, companyName);
    
    // We use the LLM to parse and extract the core items (risk factors, growth strategy)
    const systemPrompt = `You are an expert SEC filings analyst.
Analyze the following SEC filing search results and metadata for ${companyName} (${ticker}).
Extract:
1. Top 3-4 Business Risks reported in the filings (e.g. supply chain, competition, regulatory, currency).
2. Growth Strategy mentioned by management.
3. Future Outlook notes.
4. Key Debt Obligations or Liquidity remarks.

Respond ONLY with a valid JSON object matching this structure:
{
  "filingSource": "...",
  "businessRisks": ["...", "..."],
  "growthStrategy": "...",
  "futureOutlook": "...",
  "liquidityRemarks": "..."
}
Do not include markdown tags, code blocks, or explanations. Return strictly valid JSON.`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(JSON.stringify(rawSec))
    ]);

    const jsonStr = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);
    result.filingSource = rawSec.source;

    return {
      secFilings: result,
      progressLogs: [{ step: 'SEC', message: `✓ SEC: Parsed latest 10-K/10-Q filing metadata` }]
    };
  } catch (error) {
    console.error("Error in secAgent:", error);
    return {
      secFilings: {
        filingSource: "Failed to read SEC data",
        businessRisks: ["Regulatory compliance concerns", "Intense market competition", "Global macroeconomic uncertainty"],
        growthStrategy: "Leveraging technology and user engagement to grow ecosystem.",
        futureOutlook: "Stable with cautious optimism.",
        liquidityRemarks: "Adequate working capital."
      },
      progressLogs: [{ step: 'SEC', message: `✗ SEC: Used fallback risk factors` }]
    };
  }
}
