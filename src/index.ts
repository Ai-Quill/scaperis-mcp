#!/usr/bin/env node

import dotenv from 'dotenv';
import { validateENV } from './utils/index.js';
import { ScraperMCPServer } from './server/index.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
validateENV('SCRAPERIS_API_KEY');

// Get API key from environment
const SCRAPER_API_KEY = process.env.SCRAPERIS_API_KEY as string;
const SCRAPER_API_BASE = process.env.SCRAPER_API_BASE || 'https://scraper.is/api';

/**
 * Main function to start the server
 */
async function main() {
  try {
    // Create and start the server
    const server = new ScraperMCPServer(SCRAPER_API_KEY, SCRAPER_API_BASE);
    await server.start();
  } catch (error) {
    console.error('Fatal error running server:', error);
    process.exit(1);
  }
}

// Run the server
main().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});

export {};