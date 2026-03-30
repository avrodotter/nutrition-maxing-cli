# Nutrition-maxing CLI - Nutrition Logging Summary

![How it looks](assets/nutrition.png\)

## What Was Built

You now have a fully functional **Nutrition maxing CLI** that combines:
- **Natural Language Input** → CLI takes human commands like `"I ate 4 eggs and toast"`
- **MCP Tools** → Access to 3 nutrition tools (log_food, get_daily_nutrition, get_daily_calories)
- **Groq AI** → Intelligent decision-making about how to parse and log meals
- **Notion Integration** → Stores all food logs with macro tracking to Notion

## Simplified Architecture

This project is now focused exclusively on **nutrition logging**:
- Log meals with detailed macros (protein, carbs, fat, fiber, calories)
- Support for IFCT 2017 (Indian dishes) and USDA FoodData Central standards
- Multi-item meal parsing (splits "eggs and toast" into separate entries)
- Real-time status display during AI processing
- Interactive REPL with animated spinner
- One-off command support


## Key Files

### Nutrition MCP Server (`apps/nutrition-mcp/index.js`)
- **`log_food`** - Log food entries with macros
- **`get_daily_nutrition`** - Retrieve all foods logged for a specific date
- **`get_daily_calories`** - Get calorie summary with goals and rollup totals

### CLI Files (`apps/notion-cli/src/`)
1. **`groq-agent.ts`** - Agentic loop using Groq llama-3.1-8b-instant
   - Comprehensive nutrition tracking system prompt
   - IFCT 2017 and USDA standards for macro estimation
   - Real-time status update callbacks
   - Multi-item meal parsing into separate log_food calls

2. **`mcp-client.ts`** - MCP protocol communication
   - Spawns nutrition-mcp server as subprocess
   - JSON-RPC over stdio
   - Tool listing and invocation

3. **`repl.ts`** - Interactive REPL mode
   - Animated spinner with status sync
   - Multi-turn interaction
   - `/habits` command support (legacy)
   - Error parsing and display

4. **`ui.ts`** - Terminal UI components
   - Habit display (legacy)
   - Macro summaries
   - Styled output with Chalk

5. **`cli.ts`** - Entry point
   - Routes between interactive and one-off modes
   - MCP server startup
   - Environment variable loading

## How To Use

### Installation
```bash
# Navigate to project root
cd nutrition-maxing-cli
pnpm install
cd apps/notion-cli
pnpm build
```

### One-off Commands
```bash
notion "I ate 3 eggs and toast for breakfast"
# Parses into:
# - Eggs (macros estimated)
# - Toast (macros estimated)
# Both logged to Notion separately
```

### Interactive Mode
```bash
notion
# Shows welcome screen
# Type commands naturally
# Type 'exit' to quit
```

## System Prompt Features

**IFCT 2017 Standards** - Indian food macro estimation
**USDA FoodData Central** - Global food database standards
**Multi-item Parsing** - "Rice and dal" → separate entries
**Meal Format Recognition** - "Lunch: ..." pattern support
**Macro Display** - Always shows P/C/F/Cal in responses
**Health Benefits** - Tracks micronutrient notes (max 100 chars)
**Flexible Input** - Understands "2 bowls rice", "250g chicken", etc.

## Architecture Diagram

```
┌─────────────────┐
│   User Input    │
│ "I ate 3 eggs"  │
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │ CLI    │
    │ (Notion)│
    └────┬───┘
         │
         ▼
    ┌─────────────────────────┐
    │ Spawn Nutrition MCP     │
    │ (stdio subprocess)      │
    └────────┬────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Fetch Available Tools    │
    │ - log_food              │
    │ - get_daily_nutrition   │
    │ - get_daily_calories    │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────────────┐
    │ Send to Groq llama-3.1-8b with: │
    │ - User message                   │
    │ - Nutrition tools                │
    │ - IFCT 2017 + USDA standards     │
    └────────┬─────────────────────────┘
             │
    ┌────────▼──────────────────────┐
    │   AGENTIC LOOP                │
    │ - Parse meal components       │
    │ - Call log_food (per item)    │
    │ - Aggregate results           │
    └────────┬──────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Return Summary to User       │
    │ "Logged 3 eggs (18g P) +     │
    │  toast (30g C)"             │
    └──────────────────────────────┘
```

## Key Features

**Nutrition-Only Focus** - 3 essential tools for food logging
**Smart Meal Parsing** - Multi-item meals split correctly
**Macro Tracking** - Protein, carbs, fat, fiber, calories
**Real-time Status** - Animated spinner shows AI work in progress
**Interactive REPL** - Welcome screen + continuous mode
**One-off Commands** - Quick logging without entering REPL
**Notion Integration** - All data synced to Notion workspace
**TypeScript** - Fully typed and compiled to JS
**IFCT 2017 + USDA** - Evidence-based macro estimation

## Environment Setup

Required in `.env`:
```
NOTION_API_KEY=your_notion_key
FOOD_LOG_DB_ID=your_food_database_id
CALORIES_LOG_DB_ID=your_calories_database_id
GROQ_API_KEY=your_groq_key
```

## Next Steps (Optional)

1. **Hydration Tracking** - Add water intake logging
2. **Supplement Logging** - Track vitamins and minerals
3. **Meal Templates** - Save favorite meals for quick entry
4. **Auto-complete** - Tab completion for common foods
5. **Photo Recognition** - Integrate image-to-food parsing


