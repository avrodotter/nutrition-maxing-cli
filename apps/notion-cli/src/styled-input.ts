/**
 * Styled Input - Enhanced input field with blinking cursor and styled box
 */

import * as readline from "readline";
import chalk from "chalk";

interface StyledInputOptions {
  placeholder?: string;
  backgroundColor?: string;
  textColor?: string;
  cursorColor?: string;
}

export class StyledInput {
  private rl: readline.Interface;
  private input: string = "";
  private cursorPosition: number = 0;
  private isActive: boolean = false;
  
  constructor(private options: StyledInputOptions = {}) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    
    // Make stdin raw mode for character-by-character input
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
  }

  private isFirstRender: boolean = true;

  private render() {
    if (!this.isActive) return;
    
    if (this.isFirstRender) {
      // First render: show prompt with placeholder
      process.stdout.write('> ');
      
      // Show placeholder as gray text (hint only, not actual input)
      if (this.options.placeholder) {
        process.stdout.write(chalk.gray(this.options.placeholder));
      }
      
      // Position cursor right after "> " (at the beginning of input area)
      process.stdout.write('\r\x1b[2C'); // Move cursor to position 2 (after "> ")
      
      this.isFirstRender = false;
    } else {
      // Subsequent renders: update the line content
      // Move cursor to beginning of the line and clear it
      process.stdout.write('\r\x1b[K');
      
      process.stdout.write('> ');
      
      let displayText: string;
      if (this.input.length === 0 && this.options.placeholder) {
        // Show placeholder
        displayText = chalk.gray(this.options.placeholder);
      } else {
        // Show input
        displayText = chalk.white(this.input);
      }
      
      process.stdout.write(displayText);
      
      // Position cursor correctly
      const cursorOffset = 2 + this.cursorPosition; // 2 for "> "
      process.stdout.write(`\r\x1b[${cursorOffset}C`);
    }
  }

  async prompt(): Promise<string> {
    return new Promise((resolve) => {
      this.isActive = true;
      this.input = '';
      this.cursorPosition = 0;
      this.isFirstRender = true;
      
      // Initial render
      this.render();
      
      const onData = (key: Buffer) => {
        const char = key.toString();
        
        // Handle special keys
        if (char === '\r' || char === '\n') {
          // Enter key - submit
          this.isActive = false;
          process.stdout.write('\n');
          process.stdin.removeListener('data', onData);
          resolve(this.input);
        } else if (char === '\x03') {
          // Ctrl+C - exit
          this.isActive = false;
          process.stdout.write('\n');
          process.exit(0);
        } else if (char === '\x7f' || char === '\b') {
          // Backspace
          if (this.cursorPosition > 0) {
            this.input = 
              this.input.substring(0, this.cursorPosition - 1) + 
              this.input.substring(this.cursorPosition);
            this.cursorPosition--;
            this.render();
          }
        } else if (char === '\x1b[C') {
          // Right arrow
          if (this.cursorPosition < this.input.length) {
            this.cursorPosition++;
          }
        } else if (char === '\x1b[D') {
          // Left arrow
          if (this.cursorPosition > 0) {
            this.cursorPosition--;
          }
        } else if (char.length === 1 && char >= ' ' && char <= '~') {
          // Regular printable character
          this.input = 
            this.input.substring(0, this.cursorPosition) + 
            char + 
            this.input.substring(this.cursorPosition);
          this.cursorPosition++;
          this.render();
        }
      };
      
      process.stdin.on('data', onData);
    });
  }

  close() {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    this.rl.close();
  }
}
