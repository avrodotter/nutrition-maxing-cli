/**
 * Groq Tool Calling - Agentic loop using Groq to decide which MCP tools to call
 */

import Groq from "groq-sdk";
import { ChatCompletionMessageParam, ChatCompletionToolMessageParam } from "groq-sdk/resources/chat/completions";
import { MCPClient, Tool } from "./mcp-client.js";

export class GroqAgent {
  private client: Groq;
  private mcpClient: MCPClient;
  private tools: Tool[] = [];

  constructor(apiKey: string, mcpClient: MCPClient) {
    this.client = new Groq({ apiKey });
    this.mcpClient = mcpClient;
  }

  async initialize(): Promise<void> {
    // Load available MCP tools
    this.tools = await this.mcpClient.listTools();
  }

  private convertMCPToolsToGroq() {
    return this.tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object" as const,
          properties: (tool.inputSchema.properties as Record<string, any>) || {},
          required: tool.inputSchema.required || [],
        },
      },
    }));
  }

  async process(userMessage: string): Promise<string> {
    const systemPrompt = `You are Beon, an AI life coach assistant integrated with a Notion database system.
    
Your role is to help users log their activities, track habits, manage nutrition, tasks, and strength training.

When a user tells you something they did (e.g., "I did 40 pushups and ate 4 eggs"), you should:
1. Identify what they've done
2. Call the appropriate tools to log it
3. Provide encouraging feedback

Always be supportive and positive. If you need clarification, ask the user politely.

Available actions you can take:
- Log habits (exercising, meditating, studying, etc.)
- Log food and nutrition
- Create and list tasks
- Log strength training PRs
- Check habit streaks
- View daily nutrition totals

EXAMPLES OF HOW TO RESPOND:

User: "I did 40 pushups"
- Call: log_habit with habit_name="pushups", completed=true
- Response: "Amazing! 💪 Logged your 40 pushups. That's consistent progress!"

User: "I ate 3 eggs and toast for breakfast"
- Call: log_food with food_name="3 eggs and toast"
- Response: "Great breakfast choice! 🍳 Logged that for you. Eggs are protein-packed!"

User: "Create a task to finish my project proposal"
- Call: create_task with title="Finish project proposal"
- Response: "Task created! 📝 Let's knock this out!"

User: "What's my nutrition for today?"
- Call: get_daily_nutrition with date=today
- Response: "[Show nutrition data] You're doing great with your nutrition today!"

User: "My new PR - deadlift 315 lbs for 5 reps"
- Call: log_strength_pr with exercise="deadlift", weight=315, reps=5
- Response: "🔥 NEW PR! 315 lbs deadlift x5. That's incredible progress!"`;

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt,
      } as any,
      {
        role: "user",
        content: userMessage,
      },
    ];

    let finalText = "";
    let iterations = 0;
    const maxIterations = 5; // Prevent infinite loops

    // Agentic loop - keep processing until model stops calling tools
    while (iterations < maxIterations) {
      iterations++;

      const response = await this.client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        max_tokens: 1024,
        tools: this.convertMCPToolsToGroq() as any,
        messages,
      });

      // Extract text response and tool calls
      let hasToolCalls = false;
      const toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> = [];
      let assistantContent = "";

      for (const choice of response.choices) {
        const message = choice.message;
        
        if (message.content && typeof message.content === "string") {
          finalText += message.content;
          assistantContent = message.content;
        }

        if (message.tool_calls && message.tool_calls.length > 0) {
          hasToolCalls = true;
          for (const toolCall of message.tool_calls) {
            if (toolCall.type === "function") {
              toolCalls.push({
                id: toolCall.id,
                name: toolCall.function.name,
                args: JSON.parse(toolCall.function.arguments),
              });
            }
          }
        }
      }

      // Add assistant response to messages (only the text content, not tool_use objects)
      const assistantMessage: ChatCompletionMessageParam = {
        role: "assistant",
        content: assistantContent || "",
      };
      
      // Attach tool_calls to the message if they exist
      if (toolCalls.length > 0) {
        (assistantMessage as any).tool_calls = toolCalls.map(tc => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.args),
          },
        }));
      }

      messages.push(assistantMessage);

      if (!hasToolCalls) {
        // No more tool calls, model is done
        break;
      }

      // Execute each tool call and collect results
      const toolResultContents: string[] = [];

      for (const toolCall of toolCalls) {
        const toolName = toolCall.name;
        const toolArgs = toolCall.args;

        console.log(`\n[Tool Call] ${toolName}`);
        console.log(`[Input] ${JSON.stringify(toolArgs, null, 2)}`);

        try {
          const result = await this.mcpClient.callTool(toolName, toolArgs);
          console.log(`[Result] ${JSON.stringify(result, null, 2)}`);

          // Extract the text content from MCP result
          let resultText = "";
          if (typeof result === "string") {
            resultText = result;
          } else if (Array.isArray(result) && result[0]?.type === "text") {
            resultText = result[0].text || "";
          } else if (result && typeof result === "object" && "content" in result) {
            // Handle the nested content structure
            const content = (result as any).content;
            if (Array.isArray(content) && content[0]?.type === "text") {
              resultText = content[0].text || "";
            } else {
              resultText = JSON.stringify(result);
            }
          } else {
            resultText = JSON.stringify(result);
          }

          toolResultContents.push(`Tool: ${toolName}\nResult: ${resultText}`);
        } catch (error) {
          const errorMsg = (error as Error).message;
          console.error(`[Error] Tool ${toolName} failed:`, error);
          toolResultContents.push(`Tool: ${toolName}\nError: ${errorMsg}`);
        }
      }

      // Add tool results as a single user message
      messages.push({
        role: "user",
        content: toolResultContents.join("\n\n"),
      });
    }

    return finalText || "Done! Your activity has been logged.";
  }
}

