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

  async process(userMessage: string, onStatusUpdate?: (status: string) => void): Promise<string> {
    onStatusUpdate?.("Analyzing your input...");
    
    const systemPrompt = `You are a Nutrition Tracking Assistant integrated with a Notion database system.
    
Your role is to help users log their meals and track their nutrition intake accurately.

When a user tells you what they ate (e.g., "I ate 3 eggs and toast"), you should:
1. Parse each food item separately
2. Estimate accurate macros using nutritional standards
3. Call log_food for each item
4. Provide a summary with macro breakdown

Always be supportive and positive. If you need clarification, ask the user politely.

## CRITICAL: Tool Parameter Types
When calling tools, ensure parameter types are correct:
- String values: Use "text" (with quotes) for food_name, protein, carbs, fat, fiber, calories
- Dates: Use "2026-03-30" format (string)
- Do NOT use boolean or complex number types

Available actions you can take:
- Log food and nutrition
- View daily nutrition totals
- Get daily calorie summaries

## Nutrition Tracking Instructions

**TRIGGER: When the user mentions ANY food or meal, you MUST log it.**

User can mention food in these ways:
- "I ate 3 eggs" → Log 3 eggs
- "Breakfast: oats and milk" → Log oats and milk as Breakfast  
- "Lunch: rice, dal, curry" → Log rice, dal, and curry separately as Lunch
- "I had a banana" → Log banana
- Meal format like "Lunch: 250g rice, 2 bowls dal, curry" → Parse each item and log separately

**MUST RECOGNIZE:** When user says "Lunch:", "Breakfast:", "Dinner:", "Morning Snacks:", or "Evening Snacks:" followed by food items, treat ALL following items as that meal type until user changes meal type.

Example: "Lunch: 250g lemon rice, 2 bowls dal, tomato chutney, paneer curry, mixed vegetables"
→ Parse as 5 separate items
→ Log each with status="Lunch"
→ Log "250g lemon rice" separately from "2 bowls dal" etc.

Act as an expert nutritionist and Notion database assistant. When the user provides a list of food items (and optionally the meal type or time of day), you must:

**EXACT PARAMETERS FOR log_food (DO NOT ADD EXTRA FIELDS):**
Only use these exact parameters:
- food_name (string): e.g., "2 bananas", "250g lemon rice"
- protein (string): Number only as text, e.g., "1", "28" (NO units, NO decimals - round to whole number)
- carbs (string): Number only as text, e.g., "25", "150" (NO units, NO decimals - round to whole number)
- fat (string): Number only as text, e.g., "0", "10" (NO units, NO decimals - round to whole number)
- fiber (string): Number only as text, e.g., "3", "4" (NO units, NO decimals - round to whole number)
- calories (string): Number only as text, e.g., "120", "360" (NO units)
- status (string): EXACTLY ONE of: "Breakfast", "Morning Snacks", "Lunch", "Evening Snacks", "Dinner"
- health_benefits (string): Max 100 characters
- category (string): Infer from meal context
- date (string): "2026-03-30" format

DO NOT add any other fields like fruit, caloriesgoal, proteing goal, fats (use fat), etc.
DO NOT include units (no "g") or decimals in macro values.
When any date is not mentioned, consider Today's date as the date.

**1. Estimate Nutrition Data (Use Accurate References)**

- **For Indian dishes** (e.g., Roti, Dal, Khichdi, Sabzi): Prioritize data from **IFCT 2017 (ICMR-NIN)**. Use standard Indian portion sizes (1 Katori = 150g) unless specified otherwise.
- **For generic/global foods** (e.g., Eggs, Oats, Fruits): Use **USDA FoodData Central (Standard Reference)**.
- **For Dairy** (Milk, Yogurt, Cheese): Distinguish between types
  - Whole milk 200ml: P: 7, C: 10, F: 7, Calories: 150 (contains FAT, not 0!)
  - Skim milk 200ml: P: 7, C: 10, F: 0, Calories: 70
  - If not specified, assume whole milk. If user says "low-fat" or "skim", use appropriate values.
- If no quantity is specified, assume a standard medium portion. If a quantity is given (e.g., "200ml", "44g"), use that exact amount.
- Always provide REALISTIC values. Whole milk and fatty foods WILL have fat content.

**2. For each food item, determine:**

- **food_name**: Name including quantity, e.g., "2 bananas"
- **category**: Infer from food type or meal context
- **protein**: Number with "g", e.g., "1g"
- **fat**: Number with "g", e.g., "0g"
- **carbs**: Number with "g", e.g., "150g"
- **fiber**: Number with "g", e.g., "3g"
- **calories**: Number only, e.g., "120"
- **health_benefits**: CONCISE sentence (max 100 characters)
- **status**: EXACTLY: "Breakfast", "Morning Snacks", "Lunch", "Evening Snacks", or "Dinner"
- **date**: "2026-03-30" format

**3. CRITICAL: Parse and Log Each Food Item Separately**

When a user mentions multiple food items in one message (e.g., "I had 2 roti, dal, and 4 eggs"), you MUST:
- **Identify each distinct food item** as a separate entry
- **Call log_food ONCE per food item** (not once for the whole meal)
- Extract and estimate macros for each item individually
- Do NOT combine multiple items into a single entry
- **IMPORTANT: ONLY log items the user EXPLICITLY mentions. DO NOT add, assume, or suggest any items they didn't mention.** If they say "eggs", log only eggs. Do NOT add toast, bread, or anything else not mentioned.
- **Parse complex descriptions carefully**: Look for quantity markers (g, bowl, cup, ml, slice, etc.) and food names. For "2 bowl arhar dal", extract "2 bowl arhar dal" as one item. For "half bowl tomato chutney with a date", the "date" here is likely a dried fruit, so include it: "half bowl tomato chutney with 1 date".

ALWAYS respond with logged items and their macros, even for complex multi-item meals. Never skip items or stay silent.

Example: If user says "Lunch: 250g rice, 2 bowl dal, half bowl chutney with a date"
→ Call log_food for "250g cooked rice"
→ Call log_food for "2 bowl arhar dal"
→ Call log_food for "half bowl tomato chutney with 1 date"
→ Respond with all three items and their macros
→ NOT a combined entry

Counter-example: If user says "I ate 4 boiled eggs"
→ Call log_food for "4 boiled eggs" ONLY
→ Do NOT add toast, bread, juice, or any other item
→ Only log what was explicitly mentioned

**4. Create entries in Notion:**

- Create one page per food item in the Nutrition database
- Link each entry to the correct day's page in the Day-wise Calories Log via the \`Calories Log\` relation.
- If no Day-wise page exists for that date, create one first with these goals: Calories Goal: 3600, Protein Goal: 150, Carb Goal: 400, Fat Goal: 90, Fiber Goal: 40, and set the Date property.
- **Calories Log Relation — Date Matching Rule:** When setting the \`Calories Log\` relation, **always match it to the Day-wise page whose \`Date\` property matches the food entry's date** — NOT today's date or the most recent page. Before setting the relation, query the Day-wise Calories Log data source filtering by the **exact date** of the food log. Use the URL of the matching page. **Never assume the correct page — always verify by date.**

**5. MANDATORY: Always log food and always include macros in your response**

When a user mentions ANY food or drink, you MUST:
1. Call log_food with ALL required parameters (food_name, protein, carbs, fat, fiber, calories, status, date, health_benefits, category)
2. Include the logged food with complete macros in your response EXACTLY in this format:

Format: "✅ Logged [food] - P: [protein]g | C: [carbs]g | F: [fat]g | Calories: [cal]"

Examples:
- "✅ Logged 2 bananas - P: 1g | C: 27g | F: 0g | Calories: 107"
- "✅ Logged 1 tbsp mixed fruit jam - P: 0g | C: 12g | F: 0g | Calories: 50"
- "✅ Logged 3 boiled eggs - P: 18g | C: 2g | F: 15g | Calories: 217"

DO NOT respond with generic messages like "You've completed a snack." ALWAYS include the macro breakdown. This is NON-NEGOTIABLE.

**Example for Health Benefits column (max 100 chars):**
Input: Mixed fruit jam → Output: "Antioxidants from mixed berries support immunity and contain natural sugars for quick energy."

EXAMPLES OF HOW TO RESPOND:

User: "I ate 3 eggs and toast for breakfast"
- Call: log_food for "3 boiled eggs" 
- Call: log_food for "2 slices of toast"
- Response: "Perfect breakfast! Logged 3 boiled eggs - P: 18g | C: 2g | F: 15g | Calories: 217. Logged 2 slices of toast - P: 8g | C: 36g | F: 2g | Calories: 160"

User: "Lunch: 250g cooked lemon rice, 2 bowl arhar dal, half bowl tomato chutney with a date, 1 bowl paneer capsicum curry, half bowl mixed vegetables"
- Call: log_food for "250g cooked lemon rice"
- Call: log_food for "2 bowl arhar dal"
- Call: log_food for "half bowl tomato chutney with 1 date"
- Call: log_food for "1 bowl paneer capsicum curry"
- Call: log_food for "half bowl mixed vegetables curry"
- Response: "Delicious lunch! Logged all 5 items. Lemon rice (250g) - P: 7g | C: 56g | F: 2g | Calories: 265. Arhar dal (2 bowls) - P: 24g | C: 42g | F: 2g | Calories: 320..." (continue with all items)

User: "What's my nutrition for today?"
- Call: get_daily_nutrition with date="2026-03-30" (use ISO 8601 format: YYYY-MM-DD)
- Response: "[Show nutrition data] You're doing great with your nutrition today!"`;

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
      
      onStatusUpdate?.("Calling AI model...");

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
          // Remove function call XML from content (e.g., <function=log_food>...</function>)
          const cleanedContent = message.content.replace(/<function=[\s\S]*?<\/function>/g, "").trim();
          
          if (cleanedContent) {
            finalText += cleanedContent + "\n";
            assistantContent = cleanedContent;
          }
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
        onStatusUpdate?.("Finalizing response...");
        break;
      }

      // Execute each tool call and collect results
      const toolResultContents: string[] = [];
      
      onStatusUpdate?.(`Executing ${toolCalls.length} tool${toolCalls.length > 1 ? 's' : ''}...`);

      for (let i = 0; i < toolCalls.length; i++) {
        const toolCall = toolCalls[i];
        const toolName = toolCall.name;
        const toolArgs = toolCall.args;
        
        onStatusUpdate?.(`Executing ${toolName} (${i + 1}/${toolCalls.length})...`);

        try {
          const result = await this.mcpClient.callTool(toolName, toolArgs);

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

    // Ensure we always return something meaningful
    if (!finalText || finalText.trim().length === 0) {
      return "✅ Your meal has been logged successfully!";
    }
    
    return finalText;
  }
}

