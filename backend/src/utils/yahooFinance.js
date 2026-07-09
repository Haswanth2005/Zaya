import YahooFinance from 'yahoo-finance2';
import { searchTavily } from './tavily.js';
import { llm } from './llm.js';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

const yahooFinance = new YahooFinance();

/**
 * Fallback parser using Tavily Search + Groq LLM extraction if Yahoo Finance API fails.
 */
async function getFinancialsFromSearch(ticker, companyName) {
  console.log(`Attempting search-based financial data extraction for ${ticker}...`);
  try {
    const query = `${companyName || ticker} (${ticker}) key financial metrics latest: market cap, revenue, net income, EPS, PE ratio, dividend yield, total debt, total cash, free cash flow, operating cash flow, ROE, debt to equity, current ratio, profit margin`;
    const searchRes = await searchTavily(query, { maxResults: 3, searchDepth: 'advanced' });

    const systemPrompt = `You are a financial analyst assistant.
Extract the key financial metrics for ${ticker} from the provided web search context. 
If values are mentioned in billions (e.g. $391B), convert them to actual numbers (e.g. 391000000000). 
If percentages are mentioned (e.g. 15.4% or 0.154), convert them to decimal representations (e.g. 0.154).
If a metric is not found in the text, return null for it.

Respond ONLY with a valid JSON object matching this structure:
{
  "companyName": "Apple Inc.",
  "sector": "Technology",
  "industry": "Consumer Electronics",
  "exchange": "NASDAQ",
  "metrics": {
    "revenue": 391000000000,
    "netIncome": 100000000000,
    "eps": 6.16,
    "peRatio": 31.2,
    "dividendYield": 0.0052,
    "marketCap": 3450000000000,
    "totalDebt": 106000000000,
    "totalCash": 76000000000,
    "freeCashFlow": 104000000000,
    "operatingCashFlow": 115000000000,
    "roe": 1.54,
    "debtToEquity": 1.45,
    "currentRatio": 1.05,
    "profitMargin": 0.258
  }
}
Do not include markdown tags, code blocks, or explanations. Return strictly valid JSON.`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(JSON.stringify(searchRes))
    ]);

    const jsonStr = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    // Calculate score
    const metrics = result.metrics || {};
    const profitMargin = metrics.profitMargin;
    const freeCashFlow = metrics.freeCashFlow;
    const roe = metrics.roe;
    const currentRatio = metrics.currentRatio;
    const debtToEquity = metrics.debtToEquity;

    let score = 5.0;
    const rules = [];

    if (profitMargin && profitMargin > 0.15) {
      score += 1.0;
      rules.push("Healthy profit margins (>15%)");
    } else if (profitMargin && profitMargin < 0.05) {
      score -= 1.0;
      rules.push("Low profit margins (<5%)");
    }

    if (freeCashFlow && freeCashFlow > 0) {
      score += 1.5;
      rules.push("Positive Free Cash Flow");
    } else {
      score -= 1.5;
      rules.push("Negative Free Cash Flow");
    }

    if (roe && roe > 0.15) {
      score += 1.0;
      rules.push("High Return on Equity (>15%)");
    }

    if (currentRatio && currentRatio > 1.2) {
      score += 1.0;
      rules.push("Good short-term liquidity (Current Ratio > 1.2)");
    } else if (currentRatio && currentRatio < 1.0) {
      score -= 1.0;
      rules.push("Low short-term liquidity (Current Ratio < 1.0)");
    }

    if (debtToEquity && debtToEquity < 1.0) { // search extraction might return decimal or percentage
      score += 0.5;
      rules.push("Conservative leverage");
    } else if (debtToEquity && debtToEquity > 2.0) {
      score -= 1.0;
      rules.push("High leverage");
    }

    score = Math.min(10, Math.max(1, parseFloat(score.toFixed(1))));

    return {
      ticker: ticker.toUpperCase(),
      companyName: result.companyName || ticker,
      sector: result.sector || "Unknown",
      industry: result.industry || "Unknown",
      exchange: result.exchange || "NASDAQ",
      metrics: metrics,
      score,
      analysis: rules.length > 0 ? rules : ["Metrics extracted successfully from web filings."]
    };
  } catch (searchErr) {
    console.error("Financials search fallback failed:", searchErr.message);
    throw new Error("Failed to retrieve financials from both API and Search fallback.");
  }
}

/**
 * Fetches comprehensive financial data for a given ticker.
 * @param {string} ticker 
 * @param {string} companyName
 * @returns {Promise<object>}
 */
export async function getFinancialData(ticker, companyName) {
  try {
    // Try to get data from Yahoo Finance
    const quote = await yahooFinance.quote(ticker);
    const summary = await yahooFinance.quoteSummary(ticker, {
      modules: ['financialData', 'defaultKeyStatistics', 'summaryProfile']
    });

    const financialData = summary.financialData || {};
    const stats = summary.defaultKeyStatistics || {};
    const profile = summary.summaryProfile || {};
    
    // Extract key metrics
    const revenue = financialData.totalRevenue || null;
    const netIncome = stats.netIncomeToCommon || null;
    const eps = stats.trailingEps || null;
    const peRatio = quote.trailingPE || stats.trailingPE || null;
    const dividendYield = quote.dividendYield || stats.dividendYield || null;
    const marketCap = quote.marketCap || stats.enterpriseValue || null;
    
    // Debt & Cash Flow
    const totalDebt = financialData.totalDebt || null;
    const totalCash = financialData.totalCash || null;
    const freeCashFlow = financialData.freeCashflow || null;
    const operatingCashFlow = financialData.operatingCashflow || null;
    const roe = financialData.returnOnEquity || null;
    const debtToEquity = financialData.debtToEquity || null;
    const currentRatio = financialData.currentRatio || null;
    const profitMargin = financialData.profitMargins || null;

    let score = 5.0; // base score
    const rules = [];
    
    if (profitMargin && profitMargin > 0.15) {
      score += 1.0;
      rules.push("Healthy profit margins (>15%)");
    } else if (profitMargin && profitMargin < 0.05) {
      score -= 1.0;
      rules.push("Low profit margins (<5%)");
    }

    if (freeCashFlow && freeCashFlow > 0) {
      score += 1.5;
      rules.push("Positive Free Cash Flow");
    } else {
      score -= 1.5;
      rules.push("Negative Free Cash Flow");
    }

    if (roe && roe > 0.15) {
      score += 1.0;
      rules.push("High Return on Equity (>15%)");
    }

    if (currentRatio && currentRatio > 1.2) {
      score += 1.0;
      rules.push("Good short-term liquidity (Current Ratio > 1.2)");
    } else if (currentRatio && currentRatio < 1.0) {
      score -= 1.0;
      rules.push("Low short-term liquidity (Current Ratio < 1.0)");
    }

    if (debtToEquity && debtToEquity < 100) { 
      score += 0.5;
      rules.push("Conservative leverage (Debt-to-Equity < 100%)");
    } else if (debtToEquity && debtToEquity > 200) {
      score -= 1.0;
      rules.push("High leverage (Debt-to-Equity > 200%)");
    }

    score = Math.min(10, Math.max(1, parseFloat(score.toFixed(1))));

    return {
      ticker: ticker.toUpperCase(),
      companyName: quote.longName || quote.shortName || ticker,
      sector: profile.sector || "Unknown",
      industry: profile.industry || "Unknown",
      exchange: quote.fullExchangeName || "NASDAQ",
      metrics: {
        revenue,
        netIncome,
        eps,
        peRatio,
        dividendYield,
        marketCap,
        totalDebt,
        totalCash,
        freeCashFlow,
        operatingCashFlow,
        roe,
        debtToEquity,
        currentRatio,
        profitMargin
      },
      score,
      analysis: rules
    };
  } catch (error) {
    console.warn(`Yahoo Finance API error for ${ticker}: ${error.message}. Routing to search fallback...`);
    // Route to Search extraction fallback
    return await getFinancialsFromSearch(ticker, companyName);
  }
}
