import { searchTavily } from '../utils/tavily.js';
import { llm } from '../utils/llm.js';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

/**
 * Evaluates the competitive landscape and compares peer performance.
 */
export async function competitionAgent(state) {
  const ticker = state.ticker;
  const companyName = state.companyName;

  try {
    const query = `${companyName} (${ticker}) top 2-3 industry competitors and financial comparison growth revenue AI valuation market share`;
    const searchRes = await searchTavily(query, { maxResults: 3, searchDepth: 'basic' });

    const systemPrompt = `You are a competitive intelligence analyst.
Analyze the search results for competitors of ${companyName} (${ticker}).
Identify:
1. The top 2-3 primary competitors.
2. A comparison table (or structured list of data) containing fields like Growth, Revenue, AI positioning, Market Share, and Valuation comparison.
3. Market positioning statement for ${companyName} (where it leads, where it lags).

Respond ONLY with a valid JSON object matching this structure:
{
  "competitors": ["Competitor A", "Competitor B"],
  "comparison": [
    {
      "metric": "Revenue",
      "subject": "AAPL leads at $391B",
      "competitors": "MSFT at $245B, GOOG at $307B"
    },
    ...
  ],
  "marketPositioning": {
    "advantages": ["...", "..."],
    "disadvantages": ["...", "..."]
  }
}
Do not include markdown tags, code blocks, or explanations. Return strictly valid JSON.`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(JSON.stringify(searchRes))
    ]);

    const jsonStr = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      competition: result,
      progressLogs: [{ step: 'Competition', message: `✓ Competition: Mapped peer landscape and market share` }]
    };
  } catch (error) {
    console.error("Error in competitionAgent:", error);
    return {
      competition: {
        competitors: ["Industry Competitor A", "Industry Competitor B"],
        comparison: [
          { metric: "Valuation", subject: "Trades at a premium compared to peers.", competitors: "Peers trade at a discount." },
          { metric: "Core Strengths", subject: "Strong brand and ecosystem loyalty.", competitors: "Struggling to match hardware-software integration." }
        ],
        marketPositioning: {
          advantages: ["Exceptional ecosystem lock-in", "Premium pricing power"],
          disadvantages: ["High exposure to regulatory probes", "Slower relative growth in core cloud services"]
        }
      },
      progressLogs: [{ step: 'Competition', message: `✗ Competition: Compiled fallback peer comparison` }]
    };
  }
}
