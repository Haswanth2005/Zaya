import { getFinancialData } from '../utils/yahooFinance.js';

/**
 * Gathers financial statements and key metrics.
 */
export async function financialsAgent(state) {
  const ticker = state.ticker;
  
  try {
    const data = await getFinancialData(ticker, state.companyName);
    return {
      financials: data,
      progressLogs: [{ step: 'Financials', message: `✓ Financials: Retrieved core metrics (Score: ${data.score}/10)` }]
    };
  } catch (error) {
    console.error("Error in financialsAgent:", error);
    return {
      financials: {
        ticker: ticker,
        companyName: state.companyName || ticker,
        sector: 'Unknown',
        industry: 'Unknown',
        exchange: 'Unknown',
        metrics: {},
        score: 5.0,
        analysis: ['Could not fetch real financials: API limits or connection error. Using baseline score.']
      },
      progressLogs: [{ step: 'Financials', message: `✗ Financials: Error retrieving data (using fallback)` }]
    };
  }
}
