/**
 * Styled UI Components
 */

import { MCPClient } from "./mcp-client.js";
import chalk from "chalk";

const LINE = "─".repeat(58);

export function displayInputBoxStart() {
  // Write the complete input box structure
  process.stdout.write(`\n  ${LINE}\n  > \n  ${LINE}\n`);
  // Move cursor up 2 lines to get to the input line ("> ")
  // Then position it after "> " (4 characters: 2 spaces + > + space)
  process.stdout.write('\x1b[2A');     // Move up 2 lines
  process.stdout.write('\x1b[4C');     // Move right 4 chars to position after "> "
}

export function displayInputBoxEnd() {
  // Cursor should already be positioned correctly by readline
  // Just ensure we're on a new line after the input
  process.stdout.write(`\n`);
}

export function displayResponseBox(response: string) {
  const lines = response.split("\n");
  
  console.log("\n👾 Response:\n");
  
  lines.forEach((line) => {
    if (line.trim()) {
      console.log(`  ${line}`);
    } else {
      console.log("");
    }
  });
  
  console.log("");
}

export function displayHelpBox() {
  console.log(`
  ${LINE}
  Available Commands:
  ${LINE}
  
  /habits     - View your habits with today's completion status
  exit/quit   - Leave the CLI
  help        - Show this menu
  
  Examples:
    > I did 40 pushups
    > Log my breakfast
    > What's my nutrition today?
    > Create a task
  
  ${LINE}
`);
}

export async function displayHabitsBox(mcpClient: MCPClient) {
  try {
    // Fetch all habits from the database
    const habitList = await mcpClient.callTool("list_habits", { include_archived: false });
    
    let habits: any[] = [];
    
    // Parse the nested structure returned by list_habits
    if (habitList && typeof habitList === "object" && "content" in habitList) {
      const content = (habitList as any).content;
      if (Array.isArray(content)) {
        const textContent = content.find((c: any) => c.type === "text");
        if (textContent && textContent.text) {
          try {
            // The text field contains JSON string with habits
            const parsed = JSON.parse(textContent.text);
            habits = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            // Fallback: try to extract as-is
            habits = [textContent.text];
          }
        }
      }
    } else if (Array.isArray(habitList)) {
      habits = habitList;
    } else if (typeof habitList === "string") {
      try {
        habits = JSON.parse(habitList);
        if (!Array.isArray(habits)) habits = [habits];
      } catch {
        habits = [habitList];
      }
    }
    
    const today = new Date().toISOString().split("T")[0];
    
    console.log(`\n  📋 Your Habits`);
    console.log(`  ${LINE}`);
    
    if (!Array.isArray(habits) || habits.length === 0) {
      console.log(`  No habits found. Create some to get started!`);
    } else {
      habits.forEach((habit: any, index: number) => {
        // Extract habit name from various possible fields
        let habitName = "";
        
        if (typeof habit === "string") {
          habitName = habit;
        } else if (habit.name) {
          habitName = habit.name;
        } else if (habit.title) {
          habitName = habit.title;
        } else if (habit.what) {
          habitName = habit.what;
        } else {
          habitName = JSON.stringify(habit).substring(0, 50);
        }
        
        // Clean up the name
        habitName = habitName.replace(/\\n/g, " ").trim();
        if (habitName.length > 50) {
          habitName = habitName.substring(0, 47) + "...";
        }
        
        // Show checkbox (unchecked for now - TODO: fetch today's completion)
        const checkbox = "☐";
        console.log(`  ${checkbox} ${habitName}`);
      });
    }
    
    console.log(`  ${LINE}\n`);
  } catch (error) {
    console.error(chalk.gray(`  Error fetching habits: ${(error as Error).message}`));
  }
}

