import { ChatGroq } from "@langchain/groq";
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey || apiKey.includes('your_groq_api_key')) {
  throw new Error("GROQ_API_KEY is missing or invalid in your backend/.env file.");
}

// We use llama-3.3-70b-versatile which is the standard high performance model
export const llm = new ChatGroq({
  apiKey: apiKey,
  model: "llama-3.1-8b-instant",
  temperature: 0.1
});

// A smaller model for faster sub-tasks if needed
export const fastLlm = new ChatGroq({
  apiKey: apiKey,
  model: "llama-3.1-8b-instant",
  temperature: 0.1
});
