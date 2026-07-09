import { llm } from '../utils/llm.js';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

/**
 * Acts as the lead decision maker, synthesising all inputs.
 */
export async function decisionAgent(state) {
  const companyName = state.companyName;
  const ticker = state.ticker;

  const dataset = {
    validation: state.validation,
    financials: state.financials,
    news: state.news,
    secFilings: state.secFilings,
    competition: state.competition,
    risks: state.risks
  };

  const systemPrompt = `You are the Chief Investment Officer (CIO) of a major investment fund.
Your task is to review all the gathered data for ${companyName} (${ticker}) and make a definitive investment decision.
Evaluate:
1. Financial Health (from financials score & metrics).
2. News Sentiment & Recent events.
3. SEC risks.
4. Competitive advantages/disadvantages.
5. Bearish risks and red flags.

You must output:
1. Recommendation: BUY, SELL, or HOLD (capitalized).
2. Confidence Score: a percentage between 0 and 100 representing how strongly you support this decision.
3. Investment Horizon: e.g., "3-5 Years", "1-2 Years", "Long Term", "Short Term".
4. Risk Level: Low, Medium, High.
5. Bull Case: 3 key reasons supporting the upside.
6. Bear Case: 3 key reasons supporting the downside/drawdowns.
7. Expected Return Category: e.g., "High", "Moderate", "Conservative", "Speculative".
8. Final Verdict: A highly analytical, professional 3-sentence summary explanation of the investment rationale.

Respond ONLY with a valid JSON object matching this structure:
{
  "recommendation": "BUY | SELL | HOLD",
  "confidence": 92,
  "investmentHorizon": "Long Term",
  "riskLevel": "Medium",
  "bullCase": ["...", "...", "..."],
  "bearCase": ["...", "...", "..."],
  "expectedReturn": "High",
  "finalVerdict": "..."
}
Do not include markdown tags, code blocks, or explanations. Return strictly valid JSON.`;

  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(JSON.stringify(dataset))
    ]);

    const jsonStr = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      decision: result,
      progressLogs: [{ step: 'Decision', message: `✓ Decision: Concluded ${result.recommendation} with ${result.confidence}% confidence` }]
    };
  } catch (error) {
    console.error("Error in decisionAgent:", error);
    return {
      decision: {
        recommendation: "HOLD",
        confidence: 50,
        investmentHorizon: "Medium Term",
        riskLevel: "High",
        bullCase: ["Strong market position", "Diversified revenue segments"],
        bearCase: ["Valuation expansion risks", "Geopolitical dependencies"],
        expectedReturn: "Moderate",
        finalVerdict: "The company holds a strong core position, but the combination of high valuations and macroeconomic headwinds dictates a hold recommendation until market conditions stabilize."
      },
      progressLogs: [{ step: 'Decision', message: `✗ Decision: Failed to synthesize decision (defaulted to HOLD)` }]
    };
  }
}
