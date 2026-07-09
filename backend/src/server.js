import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { graph } from './graph.js';
import { llm } from './utils/llm.js';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://zaya-eta.vercel.app'
  ]
}));
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// SSE Route for running the full analysis workflow
app.get('/api/analyze', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Company query parameter "q" is required.' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  sendEvent('status', { message: 'Initializing research agent workflow...', step: 'init' });

  try {
    const inputs = { query: query };
    const stream = await graph.stream(inputs, { streamMode: 'updates' });

    let finalState = {};

    for await (const update of stream) {
      // The update object will be keyed by node name, e.g. { financials: { ... } }
      const nodeName = Object.keys(update)[0];
      const nodeOutput = update[nodeName];

      // Merge node output into finalState
      if (nodeOutput.progressLogs && finalState.progressLogs) {
        nodeOutput.progressLogs = [...finalState.progressLogs, ...nodeOutput.progressLogs];
      }
      finalState = { ...finalState, ...nodeOutput };

      // Map node name to a clear user-facing message
      let userMessage = '';
      switch (nodeName) {
        case 'validationNode':
          userMessage = `✓ Company mapped: ${nodeOutput.companyName} (${nodeOutput.ticker})`;
          sendEvent('status', { message: userMessage, step: 'validation', ticker: nodeOutput.ticker, companyName: nodeOutput.companyName });
          break;
        case 'financialsNode':
          userMessage = `✓ Financial data retrieved and scored: ${nodeOutput.financials.score}/10`;
          sendEvent('status', { message: userMessage, step: 'financials' });
          break;
        case 'newsNode':
          userMessage = `✓ 30-day sentiment analyzed: ${nodeOutput.news.sentiment.toUpperCase()}`;
          sendEvent('status', { message: userMessage, step: 'news' });
          break;
        case 'secNode':
          userMessage = `✓ Parsed SEC filings & extracted top risk items`;
          sendEvent('status', { message: userMessage, step: 'sec' });
          break;
        case 'competitionNode':
          userMessage = `✓ Competitor benchmarks and market share structured`;
          sendEvent('status', { message: userMessage, step: 'competition' });
          break;
        case 'riskNode':
          userMessage = `✓ Red flags and bearish investment factors evaluated`;
          sendEvent('status', { message: userMessage, step: 'risk' });
          break;
        case 'decisionNode':
          userMessage = `✓ CIO decision finalized: ${nodeOutput.decision.recommendation} (${nodeOutput.decision.confidence}% confidence)`;
          sendEvent('status', { message: userMessage, step: 'decision' });
          break;
      }
    }

    // Send complete compiled analysis result
    sendEvent('result', { data: finalState });
    res.write('event: close\ndata: done\n\n');
    res.end();
  } catch (error) {
    console.error("Workflow Error:", error);
    sendEvent('error', { message: error.message || 'An error occurred during agent analysis.' });
    res.end();
  }
});

// Post route for contextual chat followups
app.post('/api/chat', async (req, res) => {
  const { ticker, companyName, analysisContext, messages } = req.body;

  if (!ticker || !analysisContext || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing required parameters: ticker, analysisContext, or messages.' });
  }

  try {
    // Construct LLM instructions using the analysis report as system context
    const systemPrompt = `You are the lead investment analyst who performed the research report on ${companyName} (${ticker}).
You have access to the complete generated analysis report:
${JSON.stringify(analysisContext, null, 2)}

Your task is to answer follow-up questions from the user (an investor) using the facts and data in the report.
- Be extremely professional, precise, and data-driven.
- Refer to specific data points (e.g. "ROE is 31%", "Tavily reported EU investigations", "Free cash flow is positive").
- If the user asks for something outside the scope of the report, use your general financial knowledge to answer, but ground it in relation to the company's current metrics.
- Keep responses relatively brief and highly structured (bullet points are preferred for readability).
- Address the user in first person as the analyst.`;

    const chatHistory = [
      new SystemMessage(systemPrompt)
    ];

    // Load recent history (last 10 messages to save context limit)
    const recentMessages = messages.slice(-10);
    recentMessages.forEach(msg => {
      if (msg.role === 'user') {
        chatHistory.push(new HumanMessage(msg.content));
      } else if (msg.role === 'assistant') {
        chatHistory.push(new AIMessage(msg.content));
      }
    });

    const llmResponse = await llm.invoke(chatHistory);

    res.json({
      role: 'assistant',
      content: llmResponse.content.toString()
    });
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: 'Failed to process chat message.' });
  }
});

// Export for Vercel serverless functions
export default app;

// Also listen when run directly (local dev with `npm start` or `nodemon`)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Zaya backend server running on port ${PORT}`);
  });
}
