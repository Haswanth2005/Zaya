import axios from 'axios';
import { searchTavily } from './tavily.js';

// SEC requests require a descriptive User-Agent.
const SEC_HEADERS = {
  'User-Agent': 'Zaya Investment Agent contact@zaya.ai',
  'Accept-Encoding': 'gzip, deflate'
};

/**
 * Maps a ticker to its 10-digit SEC Central Index Key (CIK).
 * @param {string} ticker 
 * @returns {Promise<string|null>}
 */
export async function getCIK(ticker) {
  try {
    const formattedTicker = ticker.toUpperCase().trim();
    // SEC hosts a public ticker-CIK map
    const response = await axios.get('https://data.sec.gov/files/company_tickers.json', {
      headers: SEC_HEADERS
    });

    const data = response.data;
    for (const key in data) {
      if (data[key].ticker === formattedTicker) {
        // CIK must be padded to 10 digits
        return String(data[key].cik_str).padStart(10, '0');
      }
    }
    return null;
  } catch (error) {
    console.warn(`Could not fetch CIK from SEC for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Fetches recent submissions metadata for a given CIK.
 * @param {string} cik 
 * @returns {Promise<object|null>}
 */
export async function getSubmissions(cik) {
  try {
    const response = await axios.get(`https://data.sec.gov/submissions/CIK${cik}.json`, {
      headers: SEC_HEADERS
    });
    return response.data;
  } catch (error) {
    console.warn(`Could not fetch submissions from SEC for CIK ${cik}:`, error.message);
    return null;
  }
}

/**
 * Retreives SEC filings details, falls back to targeted search if SEC EDGAR blocks or is offline.
 * @param {string} ticker 
 * @param {string} companyName 
 */
export async function getSecFilings(ticker, companyName) {
  const result = {
    ticker,
    cik: null,
    recentFilings: [],
    extractedRisks: null,
    source: 'SEC EDGAR'
  };

  try {
    const CIK = await getCIK(ticker);
    if (CIK) {
      result.cik = CIK;
      const submissions = await getSubmissions(CIK);
      if (submissions && submissions.filings && submissions.filings.recent) {
        const recent = submissions.filings.recent;
        
        // Find the last 3 filings (specifically looking for 10-K or 10-Q)
        for (let i = 0; i < recent.form.length && result.recentFilings.length < 4; i++) {
          if (recent.form[i] === '10-K' || recent.form[i] === '10-Q') {
            result.recentFilings.push({
              form: recent.form[i],
              filingDate: recent.filingDate[i],
              reportDate: recent.reportDate[i],
              primaryDocument: recent.primaryDocument[i],
              accessionNumber: recent.accessionNumber[i]
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("SEC EDGAR metadata fetch failed. Falling back to search:", err.message);
  }

  // To extract concrete risk factors, business descriptions, and future outlooks,
  // we query Tavily for the latest SEC filing details. This provides clean summaries
  // which are perfect for prompt limits.
  try {
    const searchQuery = `${companyName} (${ticker}) latest 10-K filing Item 1A Risk Factors growth strategy future outlook`;
    const searchRes = await searchTavily(searchQuery, { maxResults: 3, searchDepth: 'advanced' });
    
    result.extractedRisks = searchRes.results.map(r => ({
      title: r.title,
      content: r.content,
      url: r.url
    }));
    
    if (result.recentFilings.length === 0) {
      result.source = 'SEC Search (Tavily)';
    }
  } catch (err) {
    console.error("SEC fallback search failed:", err.message);
  }

  return result;
}
