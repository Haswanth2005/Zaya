# Zaya — Autonomous AI Investment Research Platform

Zaya is a professional AI-driven investment research platform that acts like an autonomous investment analyst. It utilizes a multi-agent system powered by **LangGraph.js** to fetch financial data, read SEC filings, search latest news, benchmark competitors, evaluate bearish risks, and synthesize a final recommendation with a detailed scoring model.

---

## Project Structure

```text
investmentResearchAgent/
├── backend/                  # Node.js + Express backend
│   ├── src/
│   │   ├── agents/          # LangGraph agents
│   │   │   ├── validation.js
│   │   │   ├── financials.js
│   │   │   ├── news.js
│   │   │   ├── sec.js
│   │   │   ├── competition.js
│   │   │   ├── risk.js
│   │   │   └── decision.js
│   │   ├── utils/           # Helper API clients
│   │   │   ├── llm.js
│   │   │   ├── secEdgar.js
│   │   │   ├── tavily.js
│   │   │   └── yahooFinance.js
│   │   ├── graph.js         # LangGraph workflow definition
│   │   └── server.js        # Express and SSE streaming server
│   ├── .env                 # API Keys config
│   └── package.json
└── frontend/                 # React SPA frontend (Vite)
    ├── src/
    │   ├── App.jsx          # Main Bloomberg-style dashboard UI
    │   ├── index.css        # Tailwind config & design tokens
    │   └── main.jsx
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── postcss.config.js
```

---

## Getting Started

### 1. Configure API Keys
Go to the `backend/` directory and edit the `.env` file:
```env
PORT=5000
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

### 2. Run the Backend Server
Navigate to the `backend` directory and run:
```bash
cd backend
npm run start
```
This launches the backend server on `http://localhost:5000`.

### 3. Run the Frontend Development Server
Navigate to the `frontend` directory and run:
```bash
cd frontend
npm run dev
```
This starts the Vite development server (usually on `http://localhost:5173`).

---

## Multi-Agent Architecture (LangGraph.js)

1. **Validation Agent**: Maps search inputs (e.g. "Apple") to ticker (`AAPL`), exchange, and sector details.
2. **Financial Data Research Agent**: Hooks into Yahoo Finance API to load metrics (P/E, ROE, FCF, Debt/Equity) and computes a financial safety score out of 10.
3. **Latest News Research Agent**: Uses Tavily Search API to scan the web for recent events and runs sentiment analysis.
4. **SEC Filing Research Agent**: Fetches filing metadata from SEC EDGAR and queries filing risk summaries.
5. **Competitive Analysis Agent**: Maps peer comparisons for profitability and growth.
6. **Risk Analysis Agent**: Serves as a pessimistic reviewer looking only for red flags and downsides.
7. **Investment Decision Agent**: Synthesizes all data points to write a professional verdict with buy/sell cases and confidence ratings.
