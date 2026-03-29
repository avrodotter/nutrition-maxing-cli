#!/usr/bin/env node

/**
 * Beon CLI - Natural language interface to Beon MCP tools
 * Interactive mode: just run `beon` with no args
 * One-off mode: `beon "I did 40 pushups"`
 */

// Suppress all deprecation warnings (punycode, etc.)
process.env.NODE_NO_WARNINGS = "1";
process.removeAllListeners("warning");
process.on("warning", () => {
  // Silently ignore all warnings including deprecation warnings
});

import { Command } from "commander";
import dotenv from "dotenv";
import path from "path";
import os from "os";
import fs from "fs";
import { MCPClient } from "./mcp-client.js";
import { GroqAgent } from "./groq-agent.js";
import { fileURLToPath } from "url";
import { displayWelcome } from "./mascot.js";
import { startREPL } from "./repl.js";

// Load .env from multiple locations (in priority order)
const envPaths = [
  path.join(os.homedir(), ".beon", ".env"),  // ~/.beon/.env
  path.join(os.homedir(), ".env"),           // ~/.env
  path.join(process.cwd(), ".env"),          // current directory
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processMessage(
  message: string,
  apiKey: string
) {
  try {
    // Find MCP server
    const mcpServerPath = path.resolve(
      __dirname,
      "../../beon-mcp/index.js"
    );

    // Connect to MCP server
    const mcpClient = new MCPClient();
    await mcpClient.connect(mcpServerPath);

    // Initialize Groq agent
    const agent = new GroqAgent(apiKey, mcpClient);
    await agent.initialize();

    // Process user message
    const response = await agent.process(message);
    console.log(`\n🤖 ${response}\n`);

    // Cleanup
    mcpClient.disconnect();
  } catch (error) {
    console.error("❌ Error:", (error as Error).message);
    process.exit(1);
  }
}

async function main() {
  const program = new Command();

  let actionCalled = false;

  program
    .name("beon")
    .description("Beon CLI - AI Life Coach")
    .version("1.0.0")
    .argument("[message...]", "Natural language command (optional)")
    .action(async (messageArgs: string[]) => {
      actionCalled = true;
      try {
        // Validate API key
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          console.error("❌ Error: GROQ_API_KEY not set.");
          console.error("\nPlease create a .env file in one of these locations:");
          console.error("  1. ~/.beon/.env (recommended)");
          console.error("  2. ~/.env");
          console.error("  3. ./apps/notion-cli/.env");
          console.error("\nExample content:");
          console.error("  GROQ_API_KEY=your_api_key_here");
          console.error("\nGet your API key at: https://console.groq.com/");
          process.exit(1);
        }

        const mcpServerPath = path.resolve(
          __dirname,
          "../../beon-mcp/index.js"
        );

        if (messageArgs.length === 0) {
          // Interactive REPL mode
          displayWelcome();

          const mcpClient = new MCPClient();
          await mcpClient.connect(mcpServerPath);

          const agent = new GroqAgent(apiKey, mcpClient);
          await agent.initialize();

          await startREPL(apiKey, mcpClient, agent);
          process.exit(0);
        } else {
          // One-off mode
          const message = messageArgs.join(" ");
          await processMessage(message, apiKey);
          process.exit(0);
        }
      } catch (error) {
        console.error("❌ Error:", (error as Error).message);
        process.exit(1);
      }
    });

  program.parse(process.argv);

  // If commander didn't handle it, show help
  if (!actionCalled) {
    program.outputHelp();
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
