/**
 * Styled UI Components
 */

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
  
  console.log("\n🤖 Response:");
  console.log(`  ${LINE}`);
  
  lines.forEach((line) => {
    if (line.trim()) {
      console.log(`  ${line}`);
    } else {
      console.log("");
    }
  });
  
  console.log(`  ${LINE}\n`);
}

export function displayHelpBox() {
  console.log(`
  ${LINE}
  Available Commands:
  ${LINE}
  
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

