/**
 * REPL - Interactive mode for Beon CLI
 */

import { MCPClient } from "./mcp-client.js";
import { GroqAgent } from "./groq-agent.js";
import { displayResponseBox, displayHelpBox } from "./ui.js";
import { StyledInput } from "./styled-input.js";

export async function startREPL(
  apiKey: string,
  mcpClient: MCPClient,
  agent: GroqAgent
) {
  const styledInput = new StyledInput({
    placeholder: "Type your prompt... (e.g., I did 40 pushups)",
  });

  let running = true;

  while (running) {
    const input = await styledInput.prompt();

    if (!input) {
      continue;
    }

    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
      console.log("\n  👋 Goodbye!\n");
      running = false;
      break;
    }

    if (input.toLowerCase() === "help") {
      displayHelpBox();
      continue;
    }

    try {
      const response = await agent.process(input);
      displayResponseBox(response);
    } catch (error) {
      console.error(`\n  ❌ Error: ${(error as Error).message}\n`);
    }
  }

  styledInput.close();
  mcpClient.disconnect();
}
