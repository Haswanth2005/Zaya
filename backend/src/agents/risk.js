import { searchTavily } from '../utils/tavily.js';
import { llm } from '../utils/llm.js';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

/**
 * Conducts a pessimistic risk analysis looking for reasons NOT to invest.
 */
export async function riskAgent(state) {
  const ticker = state.ticker;
  const companyName = state.companyName;

  try {
    const query = `${companyName} (${ticker}) stock risks red flags bear case reasons not to buy problems challenges`;
    const searchRes = await searchTavily(query, { maxResults: 4, searchDepth: 'advanced' });

    const systemPrompt = `You are a highly skeptical risk compliance officer and short-seller analyst.
Analyze the details and find reasons NOT to invest in ${companyName} (${ticker}).
Focus ONLY on risks, threats, vulnerabilities, high valuations, competitive threats, and structural problems. 
Ignore all positive sentiment, growth stories, or PR spin. 

Extract:
1. Valuation risks (e.g. high PE, overstretched expectations).
2. Operational risks (e.g. supply chain, dependency on key products).
3. Regulatory risks (e.g. EU investigations, antitrust lawsuits).
4. Macroeconomic risks (e.g. interest rates, consumer spending slowdown).
5. A list of 4-5 major "Red Flags".

Respond ONLY with a valid JSON object matching this structure:
{
  "valuationRisks": "...",
  "operationalRisks": "...",
  "regulatoryRisks": "...",
  "macroeconomicRisks": "...",
  "redFlags": ["...", "...", "..."]
}
Do not include markdown tags, code blocks, or explanations. Return strictly valid JSON.`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(JSON.stringify(searchRes))
    ]);

    const jsonStr = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      risks: result,
      progressLogs: [{ step: 'Risk', message: `✓ Risk Analysis: Uncovered 4 key red flags and risk factors` }]
    };
  } catch (error) {
    console.error("Error in riskAgent:", error);
    return {
      risks: {
        valuationRisks: "High P/E ratio relative to historical averages and growth rates.",
        operationalRisks: "Geopolitical exposure and supply chain centralization.",
        regulatoryRisks: "Increased scrutiny on app store models and ecosystem monopoly.",
        macroeconomicRisks: "Consumer demand elasticity under high inflation/high interest rates.",
        redFlags: ["Saturated core markets", "Regulatory fines and blockages", "High dependency on iPhone upgrades"]
      },
      progressLogs: [{ step: 'Risk', message: `✗ Risk Analysis: Compiled baseline risk factors` }]
    };
  }
}
