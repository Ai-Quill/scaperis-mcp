#!/bin/bash

# Install the scraperis-mcp package globally
echo "Installing scraperis-mcp globally..."
npm install -g scraperis-mcp@0.1.19

# Check if installation was successful
if [ $? -eq 0 ]; then
  echo "Installation successful!"
  echo "You can now use the scraperis-mcp command in your Claude Desktop configuration."
  echo "Example configuration:"
  echo '{
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
  }'
else
  echo "Installation failed. Please check the error messages above."
fi 