import { z } from 'zod';

// Schema definitions
export const ScraperOperationSchema = z.object({
  prompt: z.string(),
  format: z.enum(['markdown', 'html', 'screenshot', 'json', 'quick']),
});

export const ScreenshotOperationSchema = z.object({
  url: z.string(),
});

// Type definitions
export type ScraperOperation = z.infer<typeof ScraperOperationSchema>;
export type ScreenshotOperation = z.infer<typeof ScreenshotOperationSchema>;

export interface ScraperResponse {
  markdown?: string;
  screenshot?: {
    url: string;
  };
  data?: Record<string, unknown>;
  status?: string;
  processing?: boolean;
  error?: string;
  url?: string;
}

export interface ToolResponse {
  content: Array<{
    type: string;
    text?: string;
    uri?: string;
    mimeType?: string;
    blob?: ArrayBuffer;
    name?: string;
  }>;
  isError?: boolean;
} 