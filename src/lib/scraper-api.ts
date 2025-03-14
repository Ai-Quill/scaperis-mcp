import { generateChatId, sleep } from '../utils/index.js';
import { ScraperResponse } from '../types/index.js';
import fetch from 'node-fetch';
/**
 * ScraperAPI client for interacting with the Scraper.is API
 */

// If fetch doesn't exist in global scope, add it
if (!globalThis.fetch) {
  globalThis.fetch = fetch as unknown as typeof global.fetch;
}
export class ScraperAPI {
  private apiKey: string;
  private apiBase: string;
  private pollingInterval: number;

  /**
   * Creates a new ScraperAPI client
   * @param apiKey The API key for Scraper.is
   * @param apiBase The base URL for the Scraper.is API
   * @param pollingInterval The interval in milliseconds to poll for results
   */
  constructor(
    apiKey: string, 
    apiBase: string = 'https://scraper.is/api',
    pollingInterval: number = 5000
  ) {
    this.apiKey = apiKey;
    this.apiBase = apiBase;
    this.pollingInterval = pollingInterval;
  }

  /**
   * Takes a screenshot of a URL
   * @param url The URL to screenshot
   * @returns Promise with the screenshot data
   */
  async screenshot(url: string): Promise<Record<string, unknown>> {
    const chatId = generateChatId();
    const response = await fetch(`${this.apiBase}/screenshot`, {
      method: 'POST',
      body: JSON.stringify({ url, chat_id: chatId }),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      }
    });
    
    return response.json() as Promise<Record<string, unknown>>;
  }

  /**
   * Scrapes content based on a prompt
   * @param prompt The prompt describing what to scrape
   * @param format The format to return ('markdown', 'html', 'screenshot', 'json', 'quick')
   * @param onProgress Optional callback for progress updates
   * @returns Promise with the scraped data
   */
  async scrape(
    prompt: string, 
    format: string,
    onProgress?: (progress: number) => Promise<void>
  ): Promise<ScraperResponse> {
    const chatId = generateChatId();
    
    // Start the extraction job
    const response = await fetch(`${this.apiBase}/extract_prompt`, {
      method: 'POST',
      body: JSON.stringify({ prompt, chat_id: chatId, html_only: false }),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      redirect: 'follow'
    });
    
    const data = await response.json() as ScraperResponse;
    
    // If no job ID was returned, return the data as is
    if (!data.job_id) {
      return data;
    }
    
    // Poll for results
    let fetchCount = 0;
    let polling = true;
    
    while (polling) {
      fetchCount++;
      
      // Report progress if callback provided
      if (onProgress) {
        await onProgress(fetchCount);
      }
      
      // Get the current status
      const scraperUrl = `${this.apiBase}/get_data?chat_id=${chatId}&format=quick`;
      const scraperResponse = await fetch(scraperUrl, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey
        }
      });
      
      const scraperData: ScraperResponse = await scraperResponse.json() as ScraperResponse;
      
      // If still processing, wait and try again
      if (scraperData.processing === true) {
        await sleep(this.pollingInterval);
        continue;
      }
      
      // Check if we've reached a terminal status
      const scraperStatus = scraperData.status || null;
      const isTerminalStatus = ['completed', 'failed'].includes(scraperStatus || '');
      
      if (scraperStatus && isTerminalStatus) {
        // Check for errors
        if (scraperData.error) {
          throw new Error(`Scraper error: ${scraperData.error}`);
        }
        
        // Check if we have actual data
        if (!scraperData.markdown && !scraperData.screenshot) {
          await sleep(this.pollingInterval);
          continue;
        } else {
          // Report 100% progress
          if (onProgress) {
            await onProgress(100);
          }
          polling = false;
          return scraperData;
        }
      } else {
        await sleep(this.pollingInterval);
      }
    }
    
    throw new Error('Polling ended without data');
  }
} 