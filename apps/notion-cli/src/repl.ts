/**
 * REPL - Interactive mode for Beon CLI
 */

import { MCPClient } from "./mcp-client.js";
import { GroqAgent } from "./groq-agent.js";
import { displayResponseBox, displayHelpBox, displayHabitsBox } from "./ui.js";
import { StyledInput } from "./styled-input.js";
import chalk from "chalk";

export async function startREPL(
  apiKey: string,
  mcpClient: MCPClient,
  agent: GroqAgent
) {
  const styledInput = new StyledInput({
    placeholder: "Type your prompt... (e.g., I ate 200ml milk as breakfast)",
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

    if (input.toLowerCase() === "/habits") {
      try {
        await displayHabitsBox(mcpClient);
      } catch (error) {
        const friendlyError = parseErrorMessage(error as Error);
        console.error(chalk.gray(`\n  Error: ${friendlyError}\n`));
      }
      continue;
    }

    try {
      // Show animated thinking indicator that syncs with AI status
      const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
      
      let currentFrame = 0;
      let currentStatus = "Processing your request...";
      
      process.stderr.write("\n🤔 Thinking...\n");
      
      // Spinner animation loop
      const spinnerInterval = setInterval(() => {
        const statusText = chalk.magenta(currentStatus);
        // Clear line, write new content, and position cursor at end
        process.stdout.write(`\r  ${spinnerFrames[currentFrame]} ${statusText}\x1b[0m`);
        currentFrame = (currentFrame + 1) % spinnerFrames.length;
      }, 100);
      
      try {
        // Run the agent while passing status callback
        const response = await agent.process(input, (status: string) => {
          currentStatus = status;
        });
        
        // Stop spinner and clear it
        clearInterval(spinnerInterval);
        process.stdout.write("\r\x1b[K"); // Clear entire line using ANSI escape
        
        if (response && response.trim().length > 0) {
          displayResponseBox(response);
        } else {
          console.error(chalk.gray(`\n  ⚠️  No response generated. The input may be too complex.\n`));
        }
      } finally {
        clearInterval(spinnerInterval);
      }
    } catch (error) {
      const friendlyError = parseErrorMessage(error as Error);
      console.error(chalk.gray(`\n  ❌ ${friendlyError}\n`));
    }
  }

  styledInput.close();
  mcpClient.disconnect();
}

function parseErrorMessage(error: Error): string {
  const message = error.message;
  
  try {
    // Try to parse JSON error
    const errorObj = JSON.parse(message);
    if (errorObj.error?.message) {
      const msg = errorObj.error.message;
      
      // Parse common error patterns
      if (msg.includes("tool call validation failed")) {
        const match = msg.match(/parameters for tool (\w+) did not match schema.*?`\/(\w+)`.*?expected (\w+), but got (\w+)/);
        if (match) {
          return `⚠️  Invalid parameter type: "${match[2]}" should be ${match[3]}, not ${match[4]}`;
        }
        return `⚠️  Tool parameter validation failed. Check the request format.`;
      }
      
      if (msg.includes("Failed to call a function")) {
        return `⚠️  Failed to call tool. The request format may be incorrect.`;
      }
      
      return `⚠️  ${msg}`;
    }
  } catch {
    // Not JSON, return as-is
  }
  
  return `⚠️  ${message}`;
}
