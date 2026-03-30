export const BEON_MASCOT = `
╔══||════════════════════════════════╗
║                                    ║
║  CLI for food logging on Notion    ║
║____________________________________║
║     ____  ____  ____  ____         ║
║    /\\   \\/\\   \\/\\   \\/\\   \\        ║
║   /  \\___\\ \\___\\ \\___\\ \\___\\       ║
║   \\  /   / /   / /   / /   /       ║
║    \\/___/\\/___/\\/___/\\/___/        ║
║                                    ║
║   N u t r i t i o n   m a x i n g  ║
║                                    ║
║   I only consume                   ║
║   what benefits my body            ║
║                                    ║
╚════════════════════════════════════╝
`;

export function displayWelcome() {
  console.clear();
  console.log(BEON_MASCOT);
  console.log("\nType your prompt and press Enter:\n");
}

export function displayPrompt() {
  process.stdout.write("  > ");
}
