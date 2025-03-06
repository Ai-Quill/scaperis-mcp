#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { CallToolRequestSchema, ListToolsRequestSchema, ToolSchema } from '@modelcontextprotocol/sdk/types.js';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';
dotenv.config();
const validateENV = (key) => {
    if (!process.env[key]) {
        console.error(`${key} is not set`);
        process.exit(1);
    }
};
const isProduction = process.env.NODE_ENV === 'production';
const SCRAPER_API_BASE = isProduction ? "https://scraper.is/api" : "http://localhost:3001/api";
const ToolInputSchema = ToolSchema.shape.inputSchema;
// const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
// validateENV('SCRAPER_API_KEY');
const SCRAPER_API_KEY = 'ws-1e9293a39a36390d';
const ScraperOperationSchema = z.object({
    prompt: z.string(),
    format: z.enum(["markdown", "html", "screenshot", "json"]),
});
const SCRAPER_TOOL = {
    description: 'Scrape a single webpage with advanced options for content extraction. \n' +
        'Supports various formats including markdown, HTML, screenshots and JSON \n' +
        "The prompt should include the website URL and what data you want to extract. \n" +
        "For example: 'Get me the top 10 products from producthunt.com' or \n" +
        "'Extract all article titles and authors from techcrunch.com/news'",
    name: "scrape",
    type: "function",
    inputSchema: zodToJsonSchema(ScraperOperationSchema),
};
const TOOLS = [
    SCRAPER_TOOL
];
// Define result type for tool operations
// type ToolResult = {
//   content: (TextContent | ImageContent)[];  // Array of text or image content
//   isError?: boolean;                        // Optional error flag
// };
// Create server instance
// Initialize MCP server with basic configuration
const server = new Server({
    name: "scraperis-mcp", // Server name identifier
    version: "0.1.0", // Server version number
}, {
    capabilities: {
        tools: {}, // Available tool configurations
        resources: {}, // Resource handling capabilities
        prompts: {}, // Prompt processing capabilities
        logging: {} // Enable logging capabilities
    },
});
// Register handler for tool listing requests
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const startTime = Date.now();
    try {
        const { name, arguments: args } = request.params;
        const { prompt, format } = args;
        const chat_id = nanoid();
        // Log incoming request with timestamp
        serverSendLoggingMessage('info', `Received request for tool: ${name}`);
        const response = await fetch(`${SCRAPER_API_BASE}/extract_prompt`, {
            method: 'POST',
            body: JSON.stringify({ prompt, format, chat_id }),
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': SCRAPER_API_KEY || ''
            },
            credentials: 'include',
            mode: 'no-cors',
            redirect: 'follow'
        });
        const data = await response.json();
        serverSendLoggingMessage('info', `Extracted prompt: ${JSON.stringify(data)}`);
        const progressToken = request.params._meta?.progressToken;
        let scraperData = {};
        let fetchCount = 0;
        if (data.job_id) {
            while (true) {
                fetchCount++;
                if (progressToken !== undefined) {
                    serverSendLoggingMessage('info', `Sending progress notification for job: ${data.job_id}`);
                    await server.notification({
                        method: "notifications/progress",
                        params: {
                            "progress": fetchCount,
                            "total": 100,
                            progressToken: data.job_id
                        },
                    });
                }
                const scraper_url = `${SCRAPER_API_BASE}/get_data?chat_id=${chat_id}&format=json`;
                const scraper_response = await fetch(scraper_url, {
                    method: 'GET',
                    headers: {
                        'x-api-key': SCRAPER_API_KEY || ''
                    }
                });
                scraperData = await scraper_response.json();
                serverSendLoggingMessage('info', `Response Scraper data: ${JSON.stringify(scraperData)}`);
                const scraper_status = scraperData.status || null;
                const isTerminalStatus = ["completed", "failed"].includes(scraper_status);
                serverSendLoggingMessage('info', `isTerminalStatus: ${isTerminalStatus}`);
                if (scraper_status && isTerminalStatus) {
                    if (scraperData.error) {
                        serverSendLoggingMessage('error', `Scraper error: ${scraperData.error} scraper status: ${scraper_status}`);
                        break;
                    }
                }
                else if (!scraper_status && scraperData && typeof scraperData === 'object') {
                    serverSendLoggingMessage('info', `Got Data: ${JSON.stringify(scraperData)}`);
                    await server.notification({
                        method: "notifications/progress",
                        params: {
                            "progress": 100,
                            "total": 100,
                            progressToken: data.job_id
                        },
                    });
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(scraperData),
                },
            ],
            isError: false
        };
    }
    catch (error) {
        serverSendLoggingMessage('error', `Error in tool operation: ${error}`);
        return {
            content: [],
            isError: true
        };
    }
});
function serverSendLoggingMessage(level, message) {
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
    }
    catch (error) {
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
