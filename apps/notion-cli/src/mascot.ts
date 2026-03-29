/**
 * Beon Mascot - ASCII art display
 */

export const BEON_MASCOT = `
╔══||════════════════════════════════╗
║  Notion CLI                        ║
║____________________________________║
║     ____  ____  ____  ____         ║
║    /\\   \\/\\   \\/\\   \\/\\   \\        ║
║   /  \\___\\ \\___\\ \\___\\ \\___\\       ║
║   \\  /   / /   / /   / /   /       ║
║    \\/___/\\/___/\\/___/\\/___/        ║
║                                    ║
║   W e l c o m e   t o   B e o n    ║
║                                    ║
║   You are not your grand plans.    ║
║   You are your daily patterns.     ║
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
