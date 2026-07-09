import { StateGraph, Annotation } from "@langchain/langgraph";
import { validationAgent } from "./agents/validation.js";
import { financialsAgent } from "./agents/financials.js";
import { newsAgent } from "./agents/news.js";
import { secAgent } from "./agents/sec.js";
import { competitionAgent } from "./agents/competition.js";
import { riskAgent } from "./agents/risk.js";
import { decisionAgent } from "./agents/decision.js";

// We define our state channels with appropriate accumulators
const GraphState = Annotation.Root({
  query: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => "" }),
  ticker: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => "" }),
  companyName: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => "" }),
  validation: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => null }),
  financials: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => null }),
  news: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => null }),
  secFilings: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => null }),
  competition: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => null }),
  risks: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => null }),
  decision: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => null }),
  progressLogs: Annotation({ reducer: (x, y) => [...x, ...y], default: () => [] })
});

// Construct the graph
const workflow = new StateGraph(GraphState)
  .addNode("validationNode", validationAgent)
  .addNode("financialsNode", financialsAgent)
  .addNode("newsNode", newsAgent)
  .addNode("secNode", secAgent)
  .addNode("competitionNode", competitionAgent)
  .addNode("riskNode", riskAgent)
  .addNode("decisionNode", decisionAgent)
  
  // Set execution flow
  .addEdge("__start__", "validationNode")
  .addEdge("validationNode", "financialsNode")
  .addEdge("financialsNode", "newsNode")
  .addEdge("newsNode", "secNode")
  .addEdge("secNode", "competitionNode")
  .addEdge("competitionNode", "riskNode")
  .addEdge("riskNode", "decisionNode")
  .addEdge("decisionNode", "__end__");

export const graph = workflow.compile();
export default graph;
