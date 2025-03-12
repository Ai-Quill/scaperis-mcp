import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import open from 'open';

import { ScraperAPI } from '../lib/scraper-api.js';
import { sendLoggingMessage } from '../utils/index.js';

/**
 * ScraperMCPServer class for handling MCP server operations
 */
export class ScraperMCPServer {
  private server: Server;
  private scraperApi: ScraperAPI;
  private screenshots: Map<string, string>;
  private tools: Tool[];

  /**
   * Creates a new ScraperMCPServer
   * @param apiKey The API key for Scraper.is
   * @param apiBase The base URL for the Scraper.is API
   * @param version The server version
   */
  constructor(
    apiKey: string,
    apiBase: string = 'https://scraper.is/api',
    version: string = '0.1.0'
  ) {
    this.scraperApi = new ScraperAPI(apiKey, apiBase);
    this.screenshots = new Map<string, string>();
    
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'scraperis-mcp',
        version: version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          logging: {}
        },
      }
    );
    
    // Define tools
    this.tools = [
      {
        description:
          'Scrape a single webpage with advanced options for content extraction. \n' +
          'Always returns both markdown content and visual screenshot for rich context. \n' +
          'Supports various formats including markdown, HTML, screenshots, JSON, and quick. \n' +
          'The prompt should include the website URL and what data you want to extract. \n' +
          "For example: 'Get me the top 10 products from producthunt.com' or \n" +
          "'Extract all article titles and authors from techcrunch.com/news'",
        name: 'scrape',
        type: 'function',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt describing what to scrape, including the URL'
            },
            format: {
              type: 'string',
              enum: ['markdown', 'html', 'screenshot', 'json', 'quick'],
              description: 'The format to return the content in'
            }
          },
          required: ['prompt', 'format']
        },
      },
      // Uncomment to enable screenshot tool
      // {
      //   description: 'Take a screenshot of a webpage',
      //   name: 'screenshot',
      //   type: 'function',
      //   inputSchema: {
      //     type: 'object',
      //     properties: {
      //       url: {
      //         type: 'string',
      //         description: 'The URL to take a screenshot of'
      //       }
      //     },
      //     required: ['url']
      //   },
      // }
    ];
    
    // Set up request handlers
    this.setupRequestHandlers();
  }

  /**
   * Sets up the request handlers for the MCP server
   */
  private setupRequestHandlers(): void {
    // Handler for listing available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.tools,
    }));

    // Handler for reading resources (screenshots)
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      this.log('info', `ReadResourceRequestSchema: ${JSON.stringify(request.params)}`);
      const screenshotURL = request.params.uri.replace('scraperis_screenshot://', '');
      this.log('info', `screenshotURL: ${screenshotURL}`);
      
      if (screenshotURL) {
        const imageBuffer = await fetch(screenshotURL);
        const base64Image = await imageBuffer.arrayBuffer();
        return {
          content: [
            {
              uri: screenshotURL,
              mimeType: 'image/png',
              blob: base64Image
            }
          ],
        };
      }

      throw new Error('Resource not found');
    });

    // Handler for tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        this.log('info', `Received request for tool: ${name}`);
        const progressToken = request.params._meta?.progressToken;
        
        if (name === 'scrape') {
          const { prompt, format } = args as { prompt: string, format: string };
          
          // Create progress callback
          const onProgress = progressToken 
            ? async (progress: number) => {
              await this.server.notification({
                method: 'notifications/progress',
                params: {
                  progress: progress,
                  total: 100,
                  progressToken: progressToken
                },
              });
            }
            : undefined;
          
          // Call the scraper API
          const handlerData = await this.scraperApi.scrape(prompt, format, onProgress);
          
          // Handle different format responses
          if (format === 'markdown' && handlerData.markdown) {
            return {
              content: [
                {
                  type: 'text',
                  text: handlerData.markdown,
                }
              ],
              isError: false
            };
          }
          
          if (format === 'screenshot' && handlerData.screenshot && handlerData.screenshot.url) {
            this.log('info', `Screenshot URL: ${handlerData.screenshot.url}`);
            this.screenshots.set(handlerData.url || '', handlerData.screenshot.url);
            
            this.server.notification({
              method: 'notifications/resources/list_changed',
            });
            
            const resourceUri = `scraperis_screenshot://${handlerData.screenshot.url}`;
            open(handlerData.screenshot.url);
            
            return {
              content: [{
                type: 'text' as const,
                text: `Screenshot taken successfully. You can view it via *MCP Resources* (Paperclip icon) @ URI: ${resourceUri}`
              }],
              isError: false
            };
          }
          
          if (format === 'json' && handlerData.data) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'JSON Data:\n```json\n' + JSON.stringify(handlerData.data, null, 2) + '\n```',
                }
              ],
              isError: false
            };
          }
          
          // Default response
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(handlerData),
              },
            ],
            isError: false
          };
        }
        
        // Handle screenshot tool (if enabled)
        if (name === 'screenshot') {
          const { url } = args as { url: string };
          const handlerData = await this.scraperApi.screenshot(url);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(handlerData),
              },
            ],
            isError: false
          };
        }
        
        throw new Error(`Unknown tool: ${name}`);
      } catch (error) {
        this.log('error', `Error in tool operation: ${error}`);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            }
          ],
          isError: true
        };
      }
    });
  }

  /**
   * Logs a message to the console and sends it to the MCP server
   * @param level The log level ('error' or 'info')
   * @param message The message to log
   */
  private log(level: 'error' | 'info', message: string): void {
    sendLoggingMessage(this.server, level, message);
  }

  /**
   * Starts the MCP server
   */
  async start(): Promise<void> {
    try {
      console.error('Initializing Scraperis MCP Server...');
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      this.log('info', 'Scraperis MCP Server connected to stdio');
      this.log('info', 'Scraperis MCP Server initialized successfully');
      this.log('info', `Configuration: API URL: ${this.scraperApi['apiBase']}`);
    } catch (error) {
      console.error('Fatal error running server:', error);
      process.exit(1);
    }
  }
} 