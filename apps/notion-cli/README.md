# Nutrition-maxing CLI - AI Nutrition logger

An agentic CLI that uses Groq to orchestrate MCP tools. Works just like Claude Code - start with `beon` and get an interactive AI assistant with mascot!

## Quick Start

```bash
# Interactive mode (like Claude Code)
beon

# One-off command
beon "I did 40 pushups and ate 4 eggs"
```

## Interactive Mode

Just type `beon` with no arguments to start the interactive REPL:

```
  ╔══||════════════════════════════════╗
  ║                                    ║
  ║  CLI for food logging on Notion    ║  
  ║     ____  ____  ____  ____         ║
  ║    /\   \/\   \/\   \/\   \        ║
  ║   /  \___\ \___\ \___\ \___\       ║
  ║   \  /   / /   / /   / /   /       ║
  ║    \/___/\/___/\/___/\/___/        ║
  ║                                    ║
  ║   N u t r i t i o n   m a x i n g  ║
  ║                                    ║
  ║   I only consume                   ║
  ║   what benefits my body            ║
  ║                                    ║
  ╚════════════════════════════════════╝

  Type your natural language command
  Examples:
    > I ate 200ml milk on breakfast
    > Add 2 apples as morning snacks
    > exit (to quit)

  >
```

Then type commands naturally. Type `exit` to quit.

## Architecture

```
User: "I did 40 pushups and ate 4 eggs"
  ↓
CLI with Mascot (interactive or one-off)
  ↓
Spawn MCP server (stdio)
  ↓
Groq receives message + available tools
  ↓
Groq decides which MCP tools to call
  ↓
CLI executes tool calls via MCP
  ↓
Groq generates final response
  ↓
Print to user + stay in REPL
```

## Setup

### 1. Quick Setup

```bash
cd /home/avrodotter/dev/beon-avro/apps/notion-cli
bash setup.sh
```

Or manual setup:

```bash
cd /home/avrodotter/dev/beon-avro
pnpm install
cd apps/notion-cli
pnpm build
```

### 2. Set Environment Variables

Create a `.env` file in one of these locations (checked in order):
1. `~/.beon/.env` (recommended - works from anywhere)
2. `~/.env` (alternative - global home directory)
3. `./apps/notion-cli/.env` (project directory - only works when running from project)

```bash
# Example: ~/.beon/.env
GROQ_API_KEY=your_groq_api_key
NOTION_API_KEY=your_notion_api_key
HABITS_DB_ID=your_id
HABIT_ENTRIES_DB_ID=your_id
FOOD_LOG_DB_ID=your_id
CALORIES_LOG_DB_ID=your_id
TASKS_DB_ID=your_id
DAILY_QUESTS_DB_ID=your_id
STRENGTH_PRS_DB_ID=your_id
PROJECTS_DB_ID=your_id
```

**Quick setup for global config:**
```bash
mkdir -p ~/.beon
cp apps/notion-cli/.env.example ~/.beon/.env
# Then edit ~/.beon/.env with your actual keys
```

Get your API keys:
- **Groq API Key**: https://console.groq.com/ (free tier available)
- **Notion API Key**: https://www.notion.so/my-integrations


### 3. Run the CLI

**Interactive Mode** (recommended - just like Claude Code):
```bash
beon
```

**One-off Mode**:
```bash
beon "I did 40 pushups and ate 4 eggs"
```

**Install Globally** (optional):
```bash
npm link
# Then use from anywhere: beon
```

## Usage Examples

### Interactive REPL
```bash
$ beon

╔══||════════════════════════════════╗
║                                    ║
║  CLI for food logging on Notion    ║
║____________________________________║
║     ____  ____  ____  ____         ║
║    /\   \/\   \/\   \/\   \        ║
║   /  \___\ \___\ \___\ \___\       ║
║   \  /   / /   / /   / /   /       ║
║    \/___/\/___/\/___/\/___/        ║
║                                    ║
║   N u t r i t i o n   m a x i n g  ║
║                                    ║
║   I only consume                   ║
║   what benefits my body            ║
║                                    ║
╚════════════════════════════════════╝


  Type your natural language command
  Examples:
    > I did 40 pushups
    > Log my meditation session
    > Show my tasks today
    > exit (to quit)

  > I did 40 pushups and ate 4 eggs

  🤖 Great work! Logged your 40 pushups and 4 eggs (360 cal). Keep it up!

  > Create a task to review my projects

  🤖 Created task: "Review my projects"

  > exit

  👋 Goodbye!
```

### One-off Commands
```bash
beon "I worked out for 30 mins"
beon "Log my breakfast - 3 eggs and toast"
beon "What's my nutrition for today?"
beon "Create a task to finish the proposal"
```

## Features

✅ **Interactive REPL** - Like Claude Code, start with `beon` for interactive mode
✅ **Mascot Display** - ASCII art greeting on startup
✅ **Agentic AI** - Groq decides which tools to call automatically
✅ **One-off Commands** - Use as `beon "your command"`
✅ **Full MCP Integration** - Access to 10+ tools (habits, nutrition, tasks, workouts)
✅ **Natural Language** - No need to remember tool names
✅ **Global Command** - Install with `npm link` to use from anywhere

## Development

```bash
# Watch mode
cd apps/notion-cli
pnpm dev

# Build
pnpm build

# Test
node dist/cli.js "I did 40 pushups"
```

## Troubleshooting

### "GROQ_API_KEY not set"
- Add `GROQ_API_KEY=...` to your `.env` file
- Get one at https://console.groq.com/

### "MCP server not connected"
- Check that beon-mcp has all required Notion database IDs
- Verify `NOTION_API_KEY` is valid

### "Tool call timeout"
- MCP tools take time; default timeout is 30s
- Check Notion API status

## File Structure

```
notion-cli/
├── src/
│   ├── cli.ts              # Main CLI entry point
│   ├── mcp-client.ts       # MCP communication
│   ├── groq-agent.ts       # Groq agentic loop
│   ├── repl.ts             # Interactive REPL mode
│   ├── mascot.ts           # Mascot display
│   └── ...
├── dist/                   # Compiled JavaScript
├── package.json
├── tsconfig.json
├── setup.sh                # Quick setup script
└── README.md
```

## Tools Available

- 🔁 `list_habits` - Get all active habits
- 🔁 `log_habit` - Log a habit completion
- 🔁 `get_habit_streak` - Analyze habit streaks
- 🍎 `log_food` - Log food intake
- 🍎 `get_daily_nutrition` - Get nutrition totals
- ✅ `list_tasks` - View all tasks
- ✅ `create_task` - Create a new task
- 💪 `list_daily_quests` - View workout quests
- 💪 `log_strength_pr` - Log a personal record
- 📊 `list_projects` - View all projects


## File Structure

```
notion-cli/
├── src/
│   ├── cli.ts              # Commander CLI entry point
│   ├── mcp-client.ts       # MCP server communication (stdio)
│   ├── groq-agent.ts       # Groq tool calling & agentic loop
│   ├── agent.ts            # (existing)
│   ├── mascot.ts           # (existing)
│   └── mcp.ts              # (existing)
├── dist/                   # Compiled JavaScript
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Development

```bash
# Watch mode with ts-node
pnpm dev "I did 40 pushups"

# Or recompile after changes
pnpm build
node dist/cli.js "your command here"
```

## Troubleshooting

### "MCP server not connected"
- Check that beon-mcp has all required Notion database IDs in `.env`
- Verify NOTION_API_KEY is valid

### "Groq API error"
- Check GROQ_API_KEY is set correctly
- Ensure you have API quota remaining (Groq has rate limits on free tier)
- Verify you're using a supported model like `llama-3.1-8b-instant`

### "Tool call timeout"
- MCP tools take time; default timeout is 30s
- Check Notion API status

## Key Design Decisions

1. **Stdio Communication**: MCP server runs as subprocess, communicates via JSON-RPC over stdio (same as MCP Inspector)
2. **Agentic Loop**: Groq gets full context of all tools; can decide on its own which to call and iterate
3. **Tool Schema Conversion**: MCP tools automatically converted to Groq tool format
4. **Error Handling**: Tool errors are caught and fed back to Groq for graceful recovery
5. **Model**: Using `llama-3.1-8b-instant` model for fast inference and cost efficiency
