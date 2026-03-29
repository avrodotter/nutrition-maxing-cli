/**
 * MCP Client - Communicates with the Beon MCP server via stdio
 */

import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import path from "path";

interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private pendingRequests: Map<string | number, Function> = new Map();
  private nextId = 1;
  private buffer = "";

  async connect(serverPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.process = spawn("node", [serverPath], {
          stdio: ["pipe", "pipe", "pipe"],
          cwd: path.dirname(serverPath),
        });

        if (!this.process.stdout || !this.process.stderr) {
          throw new Error("Failed to spawn MCP server");
        }

        // Handle stderr silently (ignore deprecation warnings, etc)
        this.process.stderr.on("data", () => {
          // Silently ignore MCP stderr output
        });

        // Handle stdout for JSON-RPC responses
        this.process.stdout.on("data", (data: Buffer) => {
          this.buffer += data.toString();
          this.processBuffer();
        });

        this.process.on("error", reject);
        this.process.on("exit", () => {
          console.log("[MCP] Server exited");
          this.process = null;
        });

        // Wait a bit for server to start
        setTimeout(() => resolve(), 500);
      } catch (err) {
        reject(err);
      }
    });
  }

  private processBuffer(): void {
    const lines = this.buffer.split("\n");
    this.buffer = lines[lines.length - 1];

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const message = JSON.parse(line) as JSONRPCResponse;
        const handler = this.pendingRequests.get(message.id);

        if (handler) {
          this.pendingRequests.delete(message.id);
          handler(message);
        }
      } catch (err) {
        console.error("Failed to parse MCP response:", err);
      }
    }
  }

  async call(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error("MCP server not connected"));
        return;
      }

      const id = this.nextId++;
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      const handler = (response: JSONRPCResponse) => {
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      };

      this.pendingRequests.set(id, handler);
      this.process.stdin!.write(JSON.stringify(request) + "\n");

      // Timeout after 30s
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`MCP call timeout for method: ${method}`));
        }
      }, 30000);
    });
  }

  async listTools(): Promise<Tool[]> {
    const response = (await this.call("tools/list")) as { tools: Tool[] };
    return response.tools;
  }

  async callTool(name: string, params: Record<string, unknown>): Promise<unknown> {
    const response = await this.call("tools/call", {
      name,
      arguments: params,
    });
    return response;
  }

  disconnect(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}
