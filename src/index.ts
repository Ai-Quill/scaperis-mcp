#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { nanoid } from 'nanoid';
import open from "open";

import dotenv from 'dotenv';

dotenv.config();

const validateENV = (key: string) => {
  if (!process.env[key]) {
    console.error(`${key} is not set`);
    process.exit(1);
  }
}
const SCRAPER_API_BASE = "https://scraper.is/api";
const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;
const SCRAPER_API_KEY = process.env.SCRAPERIS_API_KEY;
validateENV('SCRAPERIS_API_KEY');

const ScraperOperationSchema = z.object({
    prompt: z.string(),
    format: z.enum(["markdown", "html", "screenshot", "json", "quick"]),
});

const ScreenshotOperationSchema = z.object({
  url: z.string(),
});

const screenshots = new Map<string, string>();

const SCRAPER_TOOL: Tool = {
    description:
    'Scrape a single webpage with advanced options for content extraction. \n' +
    'Always returns both markdown content and visual screenshot for rich context. \n' +
    'Supports various formats including markdown, HTML, screenshots, JSON, and quick. \n' +
    "The prompt should include the website URL and what data you want to extract. \n" +
    "For example: 'Get me the top 10 products from producthunt.com' or \n" +
    "'Extract all article titles and authors from techcrunch.com/news'",
    name: "scrape",
    type: "function",
    inputSchema: zodToJsonSchema(ScraperOperationSchema) as ToolInput,
}

const SCREENSHOT_TOOL: Tool = {
  description:
  'Take a screenshot of a webpage',
  name: "screenshot",
  type: "function",
  inputSchema: zodToJsonSchema(ScreenshotOperationSchema) as ToolInput,
}

const TOOLS = [
  SCRAPER_TOOL,
  // SCREENSHOT_TOOL
]



// Define result type for tool operations
// type ToolResult = {
//   content: (TextContent | ImageContent)[];  // Array of text or image content
//   isError?: boolean;                        // Optional error flag
// };

// Create server instance
// Initialize MCP server with basic configuration
const server: Server = new Server(
  {
      name: "scraperis-mcp",  // Server name identifier
      version: "0.1.0",     // Server version number
  },
  {
      capabilities: {
          tools: {},      // Available tool configurations
          resources: {},  // Resource handling capabilities
          prompts: {},    // Prompt processing capabilities
          logging: {}     // Enable logging capabilities
      },
  }
);

// Register handler for tool listing requests
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  serverSendLoggingMessage('info',`ReadResourceRequestSchema: ${JSON.stringify(request.params)}`);
  const screenshotURL = request.params.uri.replace("scraperis_screenshot://", "");
  serverSendLoggingMessage('info',`screenshotURL: ${screenshotURL}`);  
  if (screenshotURL) {
    const imageBuffer = await fetch(screenshotURL);
    const base64Image = await imageBuffer.arrayBuffer();
    return {
      content: [
        { 
          uri: screenshotURL,
          mimeType: "image/png",
          blob: base64Image
        }
      ],
    };
  }

  throw new Error("Resource not found");  
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const startTime = Date.now();
  try {
    const { name, arguments: args } = request.params;
    // Log incoming request with timestamp
    serverSendLoggingMessage('info',`Received request for tool: ${name}`);
    const progressToken = request.params._meta?.progressToken;    
    let handlerData;
    if (name === "scrape") {
      const { prompt, format } = args as { prompt: string, format: string };
      handlerData = await scrapeWithPrompt(prompt, format, progressToken);
      
      // serverSendLoggingMessage('info',`Handler data: ${JSON.stringify(handlerData)}`);
      // Always check for markdown and screenshot from the quick format
      if (handlerData.markdown || handlerData.screenshot) {
        // Prepare content array with available data
        const content = [];
        
        // Add markdown if available
        if (handlerData.markdown && format === "markdown") {
          // content.push({
          //   type: "text",
          //   text: handlerData.markdown,
          // });
          return {
            content: [
              {
                type: "text",
                text: handlerData.markdown,
              }
            ],
            isError: false
          }
        }
        serverSendLoggingMessage('info',` ${format} Data: ${handlerData.screenshot}`);
        // Add screenshot if available
        if (handlerData.screenshot && handlerData.screenshot.url && format === "screenshot") {
          // content.push({
          //   type: "image",
          //   url: handlerData.screenshot.url,
          // });
          
          // Read the binary data and convert to base64 from url
          serverSendLoggingMessage('info',`Screenshot URL: ${handlerData.screenshot.url}`);
          screenshots.set(handlerData.url, handlerData.screenshot.url);
          server.notification({
            method: "notifications/resources/list_changed",
          });
          const resourceUri = `scraperis_screenshot://${handlerData.screenshot.url}`;
          open(handlerData.screenshot.url);
          return {
            content: [{
                type: "text" as const,
                text: `Screenshot taken successfully. You can view it via *MCP Resources* (Paperclip icon) @ URI: ${resourceUri}`
            }]
        };
          // const imageBuffer = await fetch(handlerData.screenshot.url);
          // const base64Image = await imageBuffer.arrayBuffer();
          // content.push({
          //   type: "image",
          //   uri: handlerData.screenshot.url,
          //   mimeType: "image/png",
          //   name: "screenshot.png",
          //   blob: base64Image
          // });
          // serverSendLoggingMessage('info',`Return BLOB: ${base64Image}`);
          return {
            // content: [
            //   {
            //     uri: `scraperis://screenshot`,
            //     mimeType: "image/png",
            //     blob: `data:image/png;base64,${base64Image}`
            //   }
            // ],
            // content: [
            //   {
            //     type: "image",
            //     name: "screenshot.png",
            //     uri: handlerData.screenshot.url,
            //     mimeType: "image/png",
            //     blob: base64Image
            //   }
            // ],
            isError: false            
          }
        }
        
        // Add JSON data as text if specifically requested and available
        if (format === 'json' && handlerData.data) {
          content.push({
            type: "text",
            text: "JSON Data:\n```json\n" + JSON.stringify(handlerData.data, null, 2) + "\n```",
          });
        }
        return {
          content: content,
          isError: false
        }
      }
    } else if (name === "screenshot") {
      const { url } = args as { url: string };
      handlerData = await screenshotWithURL(url);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(handlerData),
          },
        ],
      }
    }

    // Default response format (for backward compatibility)
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(handlerData),
        },
      ],
      isError: false
    };
  } catch (error) {
    serverSendLoggingMessage('error',`Error in tool operation: ${error}`);
    return {
      content: [],
      isError: true
    };  
  }
});

const screenshotWithURL = async (url: string) => {
  const chat_id = nanoid();
  const response = await fetch(`${SCRAPER_API_BASE}/screenshot`, {
    method: 'POST',
    body: JSON.stringify({ url, chat_id }),
  });
}

const scrapeWithPrompt = async (prompt: string, format: string, progressToken: string | number | undefined ) => {
  const chat_id = nanoid();

  // Store the original format requested by the user
  const originalFormat = format;
  
  // Always use "quick" format for the initial API call to get both markdown and screenshot
  const response = await fetch(`${SCRAPER_API_BASE}/extract_prompt`, {
    method: 'POST',
    body: JSON.stringify({ prompt, chat_id, html_only: true }),
    headers: {
      'Content-Type': 'application/json',        
      'x-api-key': SCRAPER_API_KEY || ''
    },
    redirect: 'follow'
  });
  const data = await response.json();
  // serverSendLoggingMessage('info',`Extracted prompt: ${JSON.stringify(data)}`);  
  let scraperData: any = {};
  let fetchCount = 0;
  if(data.job_id){
    while(true){
      fetchCount++;
      if (progressToken !== undefined) {
        // serverSendLoggingMessage('info',`Sending progress notification for job: ${data.job_id}`);
        await server.notification({
          method: "notifications/progress",
          params: {
            "progress": fetchCount,
            "total": 100,
            progressToken: chat_id
          },
        });
      }
      // Always use the "quick" format to get both markdown and screenshot
      const scraper_url = `${SCRAPER_API_BASE}/get_data?chat_id=${chat_id}&format=quick`;
      const scraper_response = await fetch(scraper_url, {
        method: 'GET',
        headers: {
          'x-api-key': SCRAPER_API_KEY || ''
        }
      });
      scraperData = await scraper_response.json();
      // serverSendLoggingMessage('info',`Response Scraper data: ${JSON.stringify(scraperData)}`);
      
      // Check if the response indicates processing is still happening
      if (scraperData.processing === true) {
        // serverSendLoggingMessage('info', `Data is still processing. Status: ${scraperData.status}`);
        // Continue polling
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      
      // Check status from the quick format response
      const scraper_status = scraperData.status || null;
      const isTerminalStatus = ["completed", "failed"].includes(scraper_status);
      serverSendLoggingMessage('info',`isTerminalStatus: ${isTerminalStatus}`);
      
      if (scraper_status && isTerminalStatus) {
        if (scraperData.error) {
          serverSendLoggingMessage('error', `Scraper error: ${scraperData.error} scraper status: ${scraper_status}`);
          process.exit(1);
        }
        
        // Check if we have actual data (not just processing status)
        if (!scraperData.markdown && !scraperData.screenshot) {
          // serverSendLoggingMessage('info', `Status is terminal but no data yet. Continuing to poll.`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }else{
          // serverSendLoggingMessage('info', `Got Data: ${JSON.stringify(scraperData)}`);
          await server.notification({
            method: "notifications/progress",
            params: {
              "progress": 100,
              "total": 100,
              progressToken: chat_id
            },
          });          
          break;
        }
      }else{
        await new Promise((resolve) =>
          setTimeout(resolve, 5000),
        );
      }      
    }
  }
  return scraperData;
}

function serverSendLoggingMessage(level: 'error' | 'info', message: string) {
  console.error(`[${new Date().toISOString()}] level: ${level} \n message: ${message}`);
  server.sendLoggingMessage({
    level: level,
    data: `[${new Date().toISOString()}] ${message}`,
  });
}

// Server startup
async function runServer() {
  try {
    // Use stderr for initialization logs to avoid interfering with stdio JSON communication
    console.error('Initializing Scraperis MCP Server...');

    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    // After connection is established, use the logging message system
    serverSendLoggingMessage('info', 'Scraperis MCP Server connected to stdio');
    serverSendLoggingMessage('info', 'Scraperis MCP Server initialized successfully');
    serverSendLoggingMessage('info', `Configuration: API URL: ${SCRAPER_API_BASE}`);
    
  } catch (error) {
    console.error('Fatal error running server:', error);
    process.exit(1);
  }
}

// const ScraperAPI = {
//   scrape: async (url: string, format: string, actions: string[]) => {
//     const response = await fetch(`${SCRAPER_API_BASE}/extract_prompt`, {
//       method: 'POST',
//       body: JSON.stringify({ url, format, actions }),
//     });
//   }
// }

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});

export {};