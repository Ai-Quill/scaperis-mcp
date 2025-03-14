# Scraper.is MCP

[![smithery badge](https://smithery.ai/badge/@Ai-Quill/scaperis-mcp)](https://smithery.ai/server/@Ai-Quill/scaperis-mcp)
[![npm version](https://img.shields.io/npm/v/scraperis-mcp.svg)](https://www.npmjs.com/package/scraperis-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A [Model Context Protocol (MCP)](https://github.com/model-context-protocol/spec) integration for [Scraper.is](https://scraper.is) - A powerful web scraping tool for AI assistants.

This package allows AI assistants to scrape web content through the MCP protocol, enabling them to access up-to-date information from the web.

## Features

- 🌐 **Web Scraping**: Extract content from any website
- 📸 **Screenshots**: Capture visual representations of web pages
- 📄 **Multiple Formats**: Get content in markdown, HTML, or JSON
- 🔄 **Progress Updates**: Real-time progress reporting during scraping operations
- 🔌 **MCP Integration**: Seamless integration with MCP-compatible AI assistants

## Installation

### Installing via Smithery

To install scaperis-mcp for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@Ai-Quill/scaperis-mcp):

```bash
npx -y @smithery/cli install @Ai-Quill/scaperis-mcp --client claude
```

### Manual Installation
```bash
npm install -g scraperis-mcp
```

Or with yarn:

```bash
yarn global add scraperis-mcp
```

## Prerequisites

You need a Scraper.is API key to use this package. 

### Getting Your API Key

1. Sign up or log in at [scraper.is](https://scraper.is)
2. Navigate to the API Keys section in your dashboard: [https://www.scraper.is/dashboard/apikeys](https://www.scraper.is/dashboard/apikeys)
3. Create a new API key or copy your existing key
4. Store this key securely as you'll need it to use this package

## Usage

### Environment Setup

Create a `.env` file with your Scraper.is API key:

```
SCRAPERIS_API_KEY=your_api_key_here
```

### Claude Desktop Integration

To use this package with Claude Desktop:

1. Install the package globally:
   ```bash
   npm install -g scraperis-mcp
   ```

2. Add the following configuration to your `claude_desktop_config.json` file:
   ```json
   {
     "mcpServers": {
       "scraperis_scraper": {
         "command": "scraperis-mcp",
         "args": [],
         "env": {
           "SCRAPERIS_API_KEY": "your-api-key-here",
           "DEBUG": "*"
         }
       }
     }
   }
   ```

3. Replace `your-api-key-here` with your actual Scraper.is API key.

4. Restart Claude Desktop to apply the changes.

### Running with MCP Inspector

For development and testing, you can use the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector scraperis-mcp
```

### Integration with AI Assistants

This package is designed to be used with AI assistants that support the Model Context Protocol (MCP). When properly configured, the AI assistant can use the following tools:

#### Scrape Tool

The `scrape` tool allows the AI to extract content from websites. It supports various formats:

- `markdown`: Returns the content in markdown format
- `html`: Returns the content in HTML format
- `screenshot`: Returns a screenshot of the webpage
- `json`: Returns structured data in JSON format

Example prompt for the AI:

```
Can you scrape the latest news from techcrunch.com and summarize it for me?
```

## API Reference

### Tools

#### scrape

Scrapes content from a webpage based on a prompt.

**Parameters:**

- `prompt` (string): The prompt describing what to scrape, including the URL
- `format` (string): The format to return the content in (`markdown`, `html`, `screenshot`, `json`, `quick`)

**Example:**

```json
{
  "prompt": "Get me the top 10 products from producthunt.com",
  "format": "markdown"
}
```

## Development

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Ai-Quill/scraperis-mcp.git
   cd scraperis-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

### Scripts

- `npm run build`: Build the project
- `npm run watch`: Watch for changes and rebuild
- `npm run dev`: Run with MCP Inspector for development
- `npm run test`: Run tests
- `npm run lint`: Run ESLint

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Model Context Protocol](https://github.com/model-context-protocol/spec)
- [Scraper.is](https://scraper.is) 