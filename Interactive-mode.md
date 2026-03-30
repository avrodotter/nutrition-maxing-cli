# Nutrition-maxing CLI - Focused Implementation

## What You Have Now

You have a **focused nutrition tracking CLI** for Notion:

### Two Ways to Use

**1. Interactive REPL**
```bash
notion
```
- Welcome screen with mascot
- Continuously accepts meal logs
- Shows real-time status during AI processing
- Type `exit` to quit

**2. Quick One-off Commands**
```bash
notion "I ate 3 eggs and toast"
```
- No REPL needed
- Direct output
- Perfect for quick logging

## Scope (Nutrition-Only)

This CLI now does **only** nutrition tracking:
- ✅ Log meals with macros
- ✅ Parse multi-item meals correctly
- ✅ Estimate macros using IFCT 2017 & USDA standards
- ✅ Display calories and macros in responses
- ✅ Store all data in Notion

## Core Files

**Nutrition Engine**
- **`src/groq-agent.ts`** - Groq llama-3.1-8b agentic loop
  - IFCT 2017 (Indian dishes) + USDA standards
  - Multi-item meal parsing
  - Real-time status callbacks
  - Macro estimation logic

**CLI & UI**
- **`src/repl.ts`** - Interactive REPL with animated spinner
- **`src/mcp-client.ts`** - Nutrition MCP communication
- **`src/cli.ts`** - Entry point (interactive or one-off)
- **`src/ui.ts`** - Terminal styling

**Backend**
- **`nutrition-mcp/index.js`** - 3 nutrition tools
  - `log_food` - Save meal entries
  - `get_daily_nutrition` - Retrieve daily foods
  - `get_daily_calories` - Get calorie summary

## Interactive Flow

```
User runs: notion
  ↓
Display welcome mascot
  ↓
Start Nutrition MCP server
  ↓
Load food logging tools
  ↓
Show input prompt
  ↓
User types meal: "3 eggs and toast"
  ↓
Animate spinner (status: "Analyzing your input...")
  ↓
Groq parses into:
  - Eggs (18g protein, 1g carbs...)
  - Toast (30g carbs, 2g protein...)
  ↓
Status: "Logging to Notion..."
  ↓
Each food logged separately via MCP
  ↓
Status: "Finalizing response..."
  ↓
Display: "✅ Logged 3 eggs (P: 18g) + toast (C: 30g)"
  ↓
Show prompt again (or exit)
```

## Usage Examples

### Start Interactive Mode
```bash
# Navigate to the CLI directory
cd apps/notion-cli
notion
```

### Example Session
```
  ╔══════════════════════════════════╗
  ║   🍎 Nutrition Tracker           ║
  ║   Powered by Notion              ║
  ╚══════════════════════════════════╝

  Welcome! Log your meals naturally.
  Examples:
    > I had 3 eggs and toast
    > Lunch: 250g rice, dal, curry
    > 2 bowls oatmeal with banana
    > exit (to quit)

  > I ate 3 eggs and toast
  
  ⠙ Analyzing your input...
  ⠹ Logging to Notion...
  ⠸ Finalizing response...
  
  ✅ Logged eggs (P: 18g, C: 1g, F: 12g, Cal: 155) + toast (P: 4g, C: 30g, F: 2g, Cal: 158)

  > Lunch: 250g rice, 2 bowls dal, curry
  
  ⠋ Analyzing your input...
  ⠙ Logging to Notion...
  
  ✅ Logged rice (P: 15g, C: 85g, F: 2g, Cal: 390)
  ✅ Logged dal (P: 12g, C: 35g, F: 1g, Cal: 180)
  ✅ Logged curry (P: 8g, C: 12g, F: 15g, Cal: 210)

  > exit
  
  👋 Goodbye!
```

## Key Features

✅ **Animated Spinner** - Braille characters showing AI work in progress
✅ **Status Sync** - Real-time messages: "Analyzing..." → "Logging..." → "Done"
✅ **Multi-item Parsing** - "Eggs and toast" → 2 separate Notion entries
✅ **Macro Display** - Shows P/C/F/Cal for each logged food
✅ **IFCT 2017 + USDA** - Evidence-based macro estimation
✅ **Interactive Prompt** - Natural language input
✅ **Clean Exit** - Type 'exit' or 'quit' to leave
✅ **One-off Mode** - Use `notion "command"` for quick logging
✅ **Notion Integration** - All data persisted to your Notion workspace

## Setup & Installation

### Quick Start
```bash
cd nutrition-maxing-cli
pnpm install
cd apps/notion-cli
pnpm build
notion
```

### Environment Setup
Create `.env` :
```
NOTION_API_KEY=your_notion_api_key
FOOD_LOG_DB_ID=your_notion_food_database_id
CALORIES_LOG_DB_ID=your_notion_calories_database_id
GROQ_API_KEY=your_groq_api_key
```

## How It Works

### Meal Parsing
When you type "3 eggs and toast":
1. Groq AI recognizes it's a multi-item meal
2. Parses into: eggs (quantity 3) + toast (implied 1 slice)
3. Estimates macros using IFCT 2017 (eggs) + USDA (toast)
4. Calls `log_food` twice (once per item)
5. Each entry stored separately in Notion

### Status Display
Spinner shows actual work stages:
- "Analyzing your input..." - Groq parsing meal
- "Calling AI model..." - Groq generating macros
- "Logging to Notion..." - MCP saving entries
- "Finalizing response..." - Preparing output

### REPL Cycle
1. Show prompt
2. Read input
3. Process (with spinner)
4. Display response
5. Return to prompt

User can cancel with Ctrl+C or exit with `exit` command

## Future Enhancements (Optional)

1. **Meal Templates** - Save "typical breakfast" for quick replay
2. **Hydration Tracking** - Log water intake
3. **Supplement Logging** - Track vitamins and minerals
4. **Photo Recognition** - Upload meal photos for auto-parsing
5. **Weekly Reports** - Summary of macro trends
6. **Barcode Scanning** - Quickly log packaged foods

---

**Status**: ✅ Focused Implementation
- Nutrition-only scope
- All non-food features removed
- Real-time status display working
- Multi-item parsing functional
- Interactive REPL with spinner
- Ready for daily use
