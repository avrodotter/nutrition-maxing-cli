import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@notionhq/client";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// ------------------------------
// Notion client
// ------------------------------
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// ------------------------------
// DATABASE IDS (loaded from .env)
// ------------------------------
const DB = {
  // Nutrition-maxing
  foodLog: process.env.FOOD_LOG_DB_ID,
  caloriesLog: process.env.CALORIES_LOG_DB_ID,
};

// Validate that all required DB IDs are set
const missingKeys = Object.entries(DB)
  .filter(([key, value]) => !value)
  .map(([key]) => key);
if (missingKeys.length > 0) {
  console.error(`Missing .env database IDs: ${missingKeys.join(", ")}`);
  process.exit(1);
}

// ------------------------------
// MCP server metadata
// ------------------------------
const server = new Server(
  { name: "nutrition-mcp", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

// ============================================================
// Helpers
// ============================================================

/**
 * Query a Notion database with automatic pagination.
 * Returns ALL matching pages (not just the first 100).
 */
async function queryDBAll(databaseId, filter = undefined, sorts = undefined) {
  let allResults = [];
  let startCursor = undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter,
      sorts,
      start_cursor: startCursor,
      page_size: 100,
    });
    allResults = allResults.concat(response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return allResults;
}

/**
 * Query a Notion database (single page, limited results).
 */
async function queryDB(databaseId, filter = undefined, sorts = undefined, pageSize = 10) {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter,
    sorts,
    page_size: pageSize,
  });
  return response.results;
}

/**
 * Extract a human-readable value from a Notion property.
 */
function getText(prop) {
  if (!prop) return "";

  if (prop.type === "title")
    return prop.title?.map((t) => t.plain_text).join("") || "";
  if (prop.type === "rich_text")
    return prop.rich_text?.map((t) => t.plain_text).join("") || "";

  if (prop.type === "number") return prop.number ?? "";
  if (prop.type === "select") return prop.select?.name || "";
  if (prop.type === "status") return prop.status?.name || "";
  if (prop.type === "checkbox") return prop.checkbox;
  if (prop.type === "date") return prop.date?.start || "";
  if (prop.type === "url") return prop.url || "";
  if (prop.type === "email") return prop.email || "";
  if (prop.type === "phone_number") return prop.phone_number || "";

  if (prop.type === "multi_select")
    return (prop.multi_select || []).map((o) => o.name).join(", ");

  if (prop.type === "people")
    return (prop.people || []).map((p) => p.name || p.id).join(", ");

  if (prop.type === "relation")
    return (prop.relation || []).map((r) => r.id);

  if (prop.type === "formula") {
    if (prop.formula.type === "string") return prop.formula.string || "";
    if (prop.formula.type === "number") return prop.formula.number ?? "";
    if (prop.formula.type === "boolean") return prop.formula.boolean;
    if (prop.formula.type === "date") return prop.formula.date?.start || "";
  }

  if (prop.type === "rollup") {
    if (prop.rollup.type === "number") return prop.rollup.number ?? "";
    if (prop.rollup.type === "array")
      return prop.rollup.array?.map((item) => {
        if (item.type === "number") return item.number;
        if (item.type === "rich_text") return item.rich_text?.map((t) => t.plain_text).join("");
        return item;
      }) || [];
  }

  return "";
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ============================================================
// Tool Definitions
// ============================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ─── NUTRITION ───
      {
        name: "log_food",
        description: "Log a food entry with macros and optional metadata",
        inputSchema: {
          type: "object",
          properties: {
            food_name: { type: "string", description: "Name of the food" },
            protein: { type: "string", description: "Protein in grams (as text)" },
            carbs: { type: "string", description: "Carbs in grams (as text)" },
            fat: { type: "string", description: "Fat in grams (as text)" },
            fiber: { type: "string", description: "Fiber in grams (as text)" },
            calories: { type: "string", description: "Total calories (as text)" },
            status: { type: "string", description: "Meal status (e.g., 'Breakfast', 'Lunch', 'Dinner', 'Snack')" },
            health_benefits: { type: "string", description: "Health benefits (stored in email field)" },
            category: { type: "string", description: "Food category" },
            date: { type: "string", description: "Date in YYYY-MM-DD (default: today)" },
          },
          required: ["food_name"],
        },
      },
      {
        name: "get_daily_nutrition",
        description: "Get food consumption log for a specific date",
        inputSchema: {
          type: "object",
          properties: {
            date: { type: "string", description: "Date in YYYY-MM-DD format (default: today)" },
          },
        },
      },
      {
        name: "get_daily_calories",
        description: "Get day-wise calorie summary with goals and rollup totals",
        inputSchema: {
          type: "object",
          properties: {
            date: { type: "string", description: "Date in YYYY-MM-DD format (default: today)" },
          },
        },
      },
    ],
  };
});

// ============================================================
// Tool Handlers
// ============================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ============================================================
      // NUTRITION
      // ============================================================
      case "log_food": {
        const {
          food_name,
          protein = "", carbs = "", fat = "", fiber = "", calories = "",
          status, health_benefits = "", category = "", date,
        } = args;
        const logDate = date || todayISO();

        const properties = {
          "=": { title: [{ text: { content: food_name } }] },
          Date: { date: { start: logDate } },
          "Protein (g)": { rich_text: [{ text: { content: protein } }] },
          "Carbs (g)": { rich_text: [{ text: { content: carbs } }] },
          "Fat (g)": { rich_text: [{ text: { content: fat } }] },
          "Fiber (g)": { rich_text: [{ text: { content: fiber } }] },
          "Calories (kcal)": { rich_text: [{ text: { content: calories } }] },
          "Health Benefits": { email: health_benefits || null },
          "Category": { rich_text: [{ text: { content: category } }] },
        };

        // Only set Status if provided (it's a status property)
        if (status) {
          properties["Status"] = { status: { name: status } };
        }

        await notion.pages.create({
          parent: { database_id: DB.foodLog },
          properties,
        });

        return {
          content: [{
            type: "text",
            text: `✅ Logged food: ${food_name} (P: ${protein}g, C: ${carbs}g, F: ${fat}g, Fiber: ${fiber}g, Cal: ${calories})`,
          }],
        };
      }

      case "get_daily_nutrition": {
        const date = args.date || todayISO();

        const foods = await queryDBAll(DB.foodLog, {
          property: "Date",
          date: { equals: date },
        });

        const foodList = foods.map((page) => ({
          name: getText(page.properties["="]),
          protein: getText(page.properties["Protein (g)"]),
          carbs: getText(page.properties["Carbs (g)"]),
          fat: getText(page.properties["Fat (g)"]),
          fiber: getText(page.properties["Fiber (g)"]),
          calories: getText(page.properties["Calories (kcal)"]),
          status: getText(page.properties["Status"]),
          health_benefits: getText(page.properties["Health Benefits"]),
          category: getText(page.properties["Category"]),
          calories_log: getText(page.properties["Calories Log"]),
        }));

        return {
          content: [{ type: "text", text: JSON.stringify({ date, foods: foodList, total_items: foodList.length }, null, 2) }],
        };
      }

      case "get_daily_calories": {
        const date = args.date || todayISO();

        const rows = await queryDB(DB.caloriesLog, {
          property: "Date",
          date: { equals: date },
        }, undefined, 5);

        const summaries = rows.map((page) => ({
          id: page.id,
          name: getText(page.properties["Name"]),
          date: getText(page.properties["Date"]),
          // Rollup totals (from Food Consumption Log)
          calories: getText(page.properties["Calories"]),
          protein: getText(page.properties["Protein"]),
          carb: getText(page.properties["Carb"]),
          fat: getText(page.properties["Fat"]),
          fiber: getText(page.properties["Fiber"]),
          // Goal targets
          calories_goal: getText(page.properties["Calories Goal"]),
          protein_goal: getText(page.properties["Protein Goal"]),
          carb_goal: getText(page.properties["Carb Goal"]),
          fat_goal: getText(page.properties["Fat Goal"]),
          fiber_goal: getText(page.properties["Fiber Goal"]),
          // Linked food entries count
          food_entries: (page.properties["Food Consumption Database"]?.relation || []).length,
        }));

        return {
          content: [{ type: "text", text: JSON.stringify({ date, summaries }, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// ============================================================
// Server Start
// ============================================================

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Beon MCP Server v2.0.0 running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});