/**
 * Beon MCP — AI Life Coach
 *
 * Notes:
 * - This file is designed to be readable first, clever second.
 * - Property names MUST match your Notion databases exactly.
 * - Numbers vs text fields matter (e.g., Nutrition macros are TEXT fields).
 */

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
// 🔑 DATABASE IDS (loaded from .env)
// ------------------------------
// All IDs are read from environment variables.
// See .env.example for the full list.
const DB = {
  // Beon (Habits)
  habits: process.env.HABITS_DB_ID,
  habitEntries: process.env.HABIT_ENTRIES_DB_ID,

  // Nutrition-maxing
  foodLog: process.env.FOOD_LOG_DB_ID,
  caloriesLog: process.env.CALORIES_LOG_DB_ID,

  // Task Flow
  tasks: process.env.TASKS_DB_ID,

  // Strength Training
  dailyQuests: process.env.DAILY_QUESTS_DB_ID,
  strengthPRs: process.env.STRENGTH_PRS_DB_ID,

  // Projects Station
  projects: process.env.PROJECTS_DB_ID,
  // meetings: process.env.MEETINGS_DB_ID,  // optional
};

// Validate that all required DB IDs are set
const missingKeys = Object.entries(DB)
  .filter(([key, value]) => !value && key !== "meetings")
  .map(([key]) => key);
if (missingKeys.length > 0) {
  console.error(`❌ Missing .env database IDs: ${missingKeys.join(", ")}`);
  process.exit(1);
}

// ------------------------------
// MCP server metadata
// ------------------------------
const server = new Server({
  name: "beon-mcp",
  version: "1.1.0",
},
{
  capabilities: {
    tools: {},
  },
});

// ============================================================
// Helpers
// ============================================================

/**
 * Query a Notion database.
 * - filter/sorts are passed straight to Notion
 * - keep pageSize small for faster tool responses
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
 * This prevents `JSON.stringify(prop)` from polluting your outputs.
 */
function getText(prop) {
  if (!prop) return "";

  // Core text-like types
  if (prop.type === "title")
    return prop.title?.map((t) => t.plain_text).join("") || "";
  if (prop.type === "rich_text")
    return prop.rich_text?.map((t) => t.plain_text).join("") || "";
  if (prop.type === "text") return prop.text?.content || ""; // rarely used

  // Primitive types
  if (prop.type === "number") return prop.number ?? "";
  if (prop.type === "select") return prop.select?.name || "";
  if (prop.type === "status") return prop.status?.name || "";
  if (prop.type === "checkbox") return prop.checkbox;
  if (prop.type === "date") return prop.date?.start || "";
  if (prop.type === "url") return prop.url || "";
  if (prop.type === "email") return prop.email || "";
  if (prop.type === "phone_number") return prop.phone_number || "";

  // Multi-select
  if (prop.type === "multi_select")
    return (prop.multi_select || []).map((o) => o.name).join(", ");

  // People
  if (prop.type === "people")
    return (prop.people || []).map((p) => p.name || p.id).join(", ");

  // Relation (often useful to return count)
  if (prop.type === "relation") return (prop.relation || []).length;

  // Formulas / Rollups
  if (prop.type === "formula") {
    if (prop.formula.type === "string") return prop.formula.string || "";
    if (prop.formula.type === "number") return prop.formula.number ?? "";
    if (prop.formula.type === "boolean") return prop.formula.boolean;
  }

  if (prop.type === "rollup") {
    if (prop.rollup.type === "number") return prop.rollup.number ?? "";
    if (prop.rollup.type === "array") return prop.rollup.array?.length || 0;
  }

  // Fallback
  return "";
}

/**
 * Returns YYYY-MM-DD for "today" in your server’s local time.
 * If you prefer strict user timezone handling, pass date from client.
 */
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ============================================================
// Tool Handlers
// ============================================================

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // 🔁 HABITS
      {
        name: "list_habits",
        description: "Get all active habits from Beon",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Max number of habits to return (default: 20)",
            },
          },
        },
      },
      {
        name: "log_habit",
        description: "Log a habit entry for today",
        inputSchema: {
          type: "object",
          properties: {
            habit_name: {
              type: "string",
              description: "Name of the habit to log",
            },
            completed: {
              type: "boolean",
              description: "Whether the habit was completed (default: true)",
            },
            notes: {
              type: "string",
              description: "Optional notes about the habit entry",
            },
          },
          required: ["habit_name"],
        },
      },
      {
        name: "get_habit_streak",
        description: "Get recent habit entries to analyze streaks",
        inputSchema: {
          type: "object",
          properties: {
            habit_name: {
              type: "string",
              description: "Name of the habit to check",
            },
            days: {
              type: "number",
              description: "Number of recent days to fetch (default: 30)",
            },
          },
          required: ["habit_name"],
        },
      },

      // 🍎 NUTRITION
      {
        name: "log_food",
        description: "Log a food entry with macros",
        inputSchema: {
          type: "object",
          properties: {
            food_name: {
              type: "string",
              description: "Name of the food",
            },
            protein: {
              type: "string",
              description: "Protein in grams (as text)",
            },
            carbs: {
              type: "string",
              description: "Carbs in grams (as text)",
            },
            fats: {
              type: "string",
              description: "Fats in grams (as text)",
            },
            calories: {
              type: "string",
              description: "Total calories (as text)",
            },
          },
          required: ["food_name"],
        },
      },
      {
        name: "get_daily_nutrition",
        description: "Get nutrition summary for a specific date",
        inputSchema: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Date in YYYY-MM-DD format (default: today)",
            },
          },
        },
      },

      // ✅ TASKS
      {
        name: "list_tasks",
        description: "List tasks with optional status filter",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description: "Filter by status (e.g., 'Not started', 'In progress', 'Done')",
            },
            limit: {
              type: "number",
              description: "Max number of tasks to return (default: 20)",
            },
          },
        },
      },
      {
        name: "create_task",
        description: "Create a new task",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Task title",
            },
            status: {
              type: "string",
              description: "Initial status (default: 'Not started')",
            },
            priority: {
              type: "string",
              description: "Priority level",
            },
          },
          required: ["title"],
        },
      },

      // 💪 STRENGTH TRAINING
      {
        name: "list_daily_quests",
        description: "Get today's workout quests",
        inputSchema: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Date in YYYY-MM-DD format (default: today)",
            },
          },
        },
      },
      {
        name: "log_strength_pr",
        description: "Log a new personal record",
        inputSchema: {
          type: "object",
          properties: {
            exercise: {
              type: "string",
              description: "Name of the exercise",
            },
            weight: {
              type: "number",
              description: "Weight lifted",
            },
            reps: {
              type: "number",
              description: "Number of reps",
            },
            notes: {
              type: "string",
              description: "Optional notes",
            },
          },
          required: ["exercise", "weight", "reps"],
        },
      },

      // 📊 PROJECTS
      {
        name: "list_projects",
        description: "List all projects",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description: "Filter by status",
            },
            limit: {
              type: "number",
              description: "Max number of projects to return (default: 20)",
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ============================================================
      // HABITS
      // ============================================================
      case "list_habits": {
        const limit = args.limit || 20;
        const results = await queryDB(DB.habits, undefined, undefined, limit);
        
        const habits = results.map((page) => ({
          id: page.id,
          name: getText(page.properties["Habit Name"]),
          what: getText(page.properties.What),
          why: getText(page.properties.Why),
          when: getText(page.properties.When),
          habit_type: getText(page.properties["Habit Type"]),
          archived: getText(page.properties.Archived),
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(habits, null, 2),
            },
          ],
        };
      }

      case "log_habit": {
        const { habit_name, completed = true, notes = "" } = args;
        const today = todayISO();

        // First, find the habit by name
        const habits = await queryDB(DB.habits, {
          property: "Habit Name",
          rich_text: {
            contains: habit_name,
          },
        }, undefined, 5);

        if (habits.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Habit "${habit_name}" not found`,
              },
            ],
          };
        }

        const habitId = habits[0].id;
        const habitNameFull = getText(habits[0].properties["Habit Name"]);

        // Create the habit entry
        const newEntry = await notion.pages.create({
          parent: { database_id: DB.habitEntries },
          properties: {
            Date: { date: { start: today } },
            "Habit Name": { relation: [{ id: habitId }] },
            Done: { checkbox: completed },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: `✅ Logged "${habitNameFull}" for ${today} (${completed ? "completed" : "not completed"})`,
            },
          ],
        };
      }

      case "get_habit_streak": {
        const { habit_name, days = 30 } = args;

        // Find the habit
        const habits = await queryDB(DB.habits, {
          property: "Habit Name",
          rich_text: {
            contains: habit_name,
          },
        }, undefined, 5);

        if (habits.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Habit "${habit_name}" not found`,
              },
            ],
          };
        }

        const habitId = habits[0].id;
        const habitNameFull = getText(habits[0].properties["Habit Name"]);

        // Get recent entries
        const entries = await queryDB(
          DB.habitEntries,
          {
            property: "Habit Name",
            relation: {
              contains: habitId,
            },
          },
          [{ property: "Date", direction: "descending" }],
          days
        );

        const entryList = entries.map((page) => ({
          date: getText(page.properties.Date),
          done: getText(page.properties.Done),
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  habit: habitNameFull,
                  entries: entryList,
                  total_entries: entryList.length,
                  completed_count: entryList.filter((e) => e.done).length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // ============================================================
      // NUTRITION
      // ============================================================
      case "log_food": {
        const { food_name, protein = "", carbs = "", fats = "", calories = "" } = args;
        const today = todayISO();

        const newFood = await notion.pages.create({
          parent: { database_id: DB.foodLog },
          properties: {
            "=": { title: [{ text: { content: food_name } }] },
            Date: { date: { start: today } },
            "Protein (g)": { rich_text: [{ text: { content: protein } }] },
            "Carbs (g)": { rich_text: [{ text: { content: carbs } }] },
            "Fat (g)": { rich_text: [{ text: { content: fats } }] },
            "Calories (kcal)": { rich_text: [{ text: { content: calories } }] },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: `✅ Logged food: ${food_name} (P: ${protein}g, C: ${carbs}g, F: ${fats}g, Cal: ${calories})`,
            },
          ],
        };
      }

      case "get_daily_nutrition": {
        const date = args.date || todayISO();

        const foods = await queryDB(
          DB.foodLog,
          {
            property: "Date",
            date: {
              equals: date,
            },
          },
          undefined,
          100
        );

        const foodList = foods.map((page) => ({
          name: getText(page.properties["="]),
          protein: getText(page.properties["Protein (g)"]),
          carbs: getText(page.properties["Carbs (g)"]),
          fats: getText(page.properties["Fat (g)"]),
          calories: getText(page.properties["Calories (kcal)"]),
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  date,
                  foods: foodList,
                  total_items: foodList.length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // ============================================================
      // TASKS
      // ============================================================
      case "list_tasks": {
        const { status, limit = 20 } = args;

        const filter = status
          ? {
              property: "Status",
              status: {
                equals: status,
              },
            }
          : undefined;

        const results = await queryDB(DB.tasks, filter, undefined, limit);

        const tasks = results.map((page) => ({
          id: page.id,
          name: getText(page.properties.Name),
          action: getText(page.properties.Action),
          status: getText(page.properties.Status),
          urgency: getText(page.properties.Urgency),
          importance: getText(page.properties.Importance),
          date: getText(page.properties.Date),
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tasks, null, 2),
            },
          ],
        };
      }

      case "create_task": {
        const { title, status = "Inbox", priority = "" } = args;

        const newTask = await notion.pages.create({
          parent: { database_id: DB.tasks },
          properties: {
            Name: { title: [{ text: { content: title } }] },
            Status: { status: { name: status } },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: `✅ Created task: "${title}" with status "${status}"`,
            },
          ],
        };
      }

      // ============================================================
      // STRENGTH TRAINING
      // ============================================================
      case "list_daily_quests": {
        const date = args.date || todayISO();

        const quests = await queryDB(
          DB.dailyQuests,
          {
            property: "Date",
            date: {
              equals: date,
            },
          },
          undefined,
          50
        );

        const questList = quests.map((page) => ({
          id: page.id,
          exercise: getText(page.properties.Exercise),
          target: getText(page.properties.Target),
          progress: getText(page.properties.Progress),
          done: getText(page.properties.Done),
          measurement: getText(page.properties.Measurement),
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ date, quests: questList }, null, 2),
            },
          ],
        };
      }

      case "log_strength_pr": {
        const { exercise, weight, reps, notes = "" } = args;
        const today = todayISO();

        const newPR = await notion.pages.create({
          parent: { database_id: DB.strengthPRs },
          properties: {
            What: { title: [{ text: { content: `${exercise} - ${weight}kg x ${reps}` } }] },
            When: { date: { start: today } },
            While: { rich_text: [{ text: { content: notes } }] },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: `💪 New PR logged: ${exercise} - ${weight}kg x ${reps} reps`,
            },
          ],
        };
      }

      // ============================================================
      // PROJECTS
      // ============================================================
      case "list_projects": {
        const { status, limit = 20 } = args;

        const filter = status
          ? {
              property: "Status",
              status: {
                equals: status,
              },
            }
          : undefined;

        const results = await queryDB(DB.projects, filter, undefined, limit);

        const projects = results.map((page) => ({
          id: page.id,
          name: getText(page.properties["Project Name"]),
          status: getText(page.properties.Status),
          priority: getText(page.properties.Priority),
          personal_or_client: getText(page.properties["Personal/Client"]),
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Error: ${error.message}`,
        },
      ],
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
  console.error("Beon MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
