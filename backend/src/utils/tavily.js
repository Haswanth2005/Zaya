import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Searches the web using Tavily API for news and sentiment.
 * @param {string} query 
 * @param {object} options 
 * @returns {Promise<object>}
 */
export async function searchTavily(query, options = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey.includes('your_tavily_api_key')) {
    throw new Error('TAVILY_API_KEY is missing or invalid in your backend/.env file.');
  }

  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: apiKey,
      query: query,
      search_depth: options.searchDepth || 'basic',
      include_answer: true,
      max_results: options.maxResults || 5,
      ...options
    });

    return response.data;
  } catch (error) {
    console.error('Tavily Search Error:', error.response?.data || error.message);
    throw new Error(`Tavily search failed: ${error.response?.data?.detail || error.message}`);
  }
}

/**
 * Fetch latest news for a company ticker/name.
 * @param {string} ticker 
 * @param {string} companyName 
 */
export async function getCompanyNews(ticker, companyName) {
  const query = `${companyName} (${ticker}) stock market news last 30 days positive negative sentiment product launches lawsuits`;
  const result = await searchTavily(query, { maxResults: 6, searchDepth: 'advanced' });
  
  // Format results to return to the agent
  return {
    query,
    answer: result.answer,
    results: (result.results || []).map(r => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score
    }))
  };
}
