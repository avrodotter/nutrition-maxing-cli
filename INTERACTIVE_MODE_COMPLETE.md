# 🎯 Beon CLI - Interactive Mode Complete

## What's New

You now have a **Claude Code-like interactive CLI** for Beon!

### Two Ways to Use

**1. Interactive REPL (like Claude Code)**
```bash
beon
```
- Shows ASCII art mascot
- Welcome message
- Type commands naturally
- Type `exit` to quit
- Stays open for multiple commands

**2. One-off commands**
```bash
beon "I did 40 pushups"
```

## Files Created/Modified

### New Files
- **`src/repl.ts`** - Interactive REPL loop with readline
- **`src/mascot.ts`** - ASCII art mascot and welcome screen
- **`setup.sh`** - Quick setup script

### Modified Files
- **`src/cli.ts`** - Updated to support both interactive and one-off modes
- **`package.json`** - Already had bin setup for global command
- **`README.md`** - Complete documentation with examples

## Interactive Mode Flow

```
User runs: beon
  ↓
Display mascot + welcome screen
  ↓
Start MCP server
  ↓
Load available tools
  ↓
Display prompt
  ↓
User types command
  ↓
Send to Groq with tools
  ↓
Groq calls MCP tools
  ↓
Display response
  ↓
Prompt again (or exit on 'exit' command)
```

## Usage

### Start Interactive Mode
```bash
cd /home/avrodotter/dev/beon-avro/apps/notion-cli
node dist/cli.js
# or if globally linked:
beon
```

### Example Session
```
  ╔══||════════════════════════════════╗
  ║  Notion CLI                        ║
  ║____________________________________║
  ║     ____  ____  ____  ____         ║
  ║    /\   \/\   \/\   \/\   \        ║
  ║   /  \___\ \___\ \___\ \___\       ║
  ║   \  /   / /   / /   / /   /       ║
  ║    \/___/\/___/\/___/\/___/        ║
  ║                                    ║
  ║   W e l c o m e   t o   B e o n    ║       
  ║                                    ║
  ║   You are not your grand plans.    ║
  ║   You are your daily patterns.     ║
  ║                                    ║
  ╚════════════════════════════════════╝

  Type your natural language command
  Examples:
    > I did 40 pushups
    > Log my meditation session
    > Show my tasks today
    > exit (to quit)

  > I did 40 pushups
  
  🤖 Great! Logged your 40 pushups. Keep up the momentum!

  > Log my breakfast - 3 eggs and toast
  
  🤖 Logged your breakfast! That's 540 calories and 18g of protein!

  > exit
  
  👋 Goodbye!
```

## Key Features

✅ **Mascot Display** - ASCII art showing Beon greeting
✅ **Interactive Prompt** - Continuously accepts commands
✅ **History Support** - Readline preserves command history
✅ **Help Command** - Type 'help' to see available commands
✅ **Clean Exit** - Type 'exit' or 'quit' to leave gracefully
✅ **One-off Mode** - Still works: `beon "your command"`
✅ **Global Command** - Use `npm link` to install globally as `beon`

## Setup Commands

Quick setup:
```bash
cd /home/avrodotter/dev/beon-avro/apps/notion-cli
bash setup.sh
```

Or manual:
```bash
cd /home/avrodotter/dev/beon-avro
pnpm install
cd apps/notion-cli
pnpm build
node dist/cli.js  # Start interactive mode
```

## Install Globally (Optional)

```bash
cd /home/avrodotter/dev/beon-avro/apps/notion-cli
npm link

# Now you can use from anywhere:
beon
beon "I did 40 pushups"
```

## Technical Details

### REPL Implementation
- Uses Node.js `readline` module
- Async/await for user input
- Graceful cleanup on exit
- Error handling with try/catch

### Mascot System
- ASCII art in `mascot.ts`
- `displayWelcome()` for startup
- `displayPrompt()` for each iteration
- `console.clear()` for clean screen

### CLI Modes
- **No args**: Interactive REPL
- **With args**: One-off command execution
- Both modes use same Groq agent and MCP client

## Next Steps (Optional)

1. **Customize Mascot** - Edit ASCII art in `src/mascot.ts`
2. **Add Shortcuts** - Add common commands (e.g., `@habits`, `@tasks`)
3. **Command History** - Readline already supports ↑/↓ navigation
4. **Auto-complete** - Add tab-completion for commands
5. **Config File** - Save user preferences

---

**Status**: ✅ Complete and tested
- Interactive mode working
- Mascot displays correctly
- One-off mode still works
- Ready to use!
