import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { nanoid } from 'nanoid';

/**
 * Validates that an environment variable is set
 * @param key The environment variable key to validate
 * @throws Error if the environment variable is not set
 */
export const validateENV = (key: string): void => {
  if (!process.env[key]) {
    console.error(`${key} is not set`);
    process.exit(1);
  }
};

/**
 * Sends a logging message to the server and console
 * @param server The MCP server instance
 * @param level The log level ('error' or 'info')
 * @param message The message to log
 */
export function sendLoggingMessage(
  server: Server,
  level: 'error' | 'info', 
  message: string
): void {
  console.error(`[${new Date().toISOString()}] level: ${level} \n message: ${message}`);
  server.sendLoggingMessage({
    level: level,
    data: `[${new Date().toISOString()}] ${message}`,
  });
}

/**
 * Generates a unique ID for chat sessions
 * @returns A unique ID string
 */
export function generateChatId(): string {
  return nanoid();
}

/**
 * Sleep utility function
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
} 