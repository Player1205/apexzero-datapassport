import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "4000", 10),
  MONGODB_URI: process.env.MONGODB_URI || "",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-key",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  
  LLM_API_KEY: process.env.LLM_API_KEY || "",
  // FIXED: Now actually pulls from your .env file
  LLM_BASE_URL: process.env.LLM_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
  LLM_MODEL: process.env.LLM_MODEL || "gemini-flash-latest",

  CHAIN_RPC_URL: process.env.CHAIN_RPC_URL || "https://sphinx.shardeum.org/",
  CHAIN_ID: parseInt(process.env.CHAIN_ID || "8082", 10),
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
  BLOCKCHAIN_PRIVATE_KEY: process.env.BLOCKCHAIN_PRIVATE_KEY || "",
  
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
};

console.log("--- ENV LOAD CHECK ---");
console.log("Gemini Key Loaded:", !!env.LLM_API_KEY);
console.log("Model Using:", env.LLM_MODEL);
console.log("API Version:", env.LLM_BASE_URL.split('/').pop());
console.log("Private Key Loaded:", !!env.BLOCKCHAIN_PRIVATE_KEY);
console.log("----------------------");