import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScraperAPI } from '../lib/scraper-api.js';

// Mock fetch
vi.mock('node-fetch', () => ({
  default: vi.fn()
}));

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test-chat-id'
}));

// Define a mock type for fetch
interface MockFetch {
  mockResolvedValueOnce: (value: unknown) => MockFetch;
}

describe('ScraperAPI', () => {
  let api: ScraperAPI;
  
  beforeEach(() => {
    api = new ScraperAPI('test-api-key', 'https://test-api.com/api');
    
    // Reset mocks
    vi.resetAllMocks();
    
    // Mock global fetch
    global.fetch = vi.fn() as unknown as typeof fetch;
  });
  
  describe('screenshot', () => {
    it('should call the screenshot endpoint with the correct parameters', async () => {
      // Mock fetch response
      (global.fetch as unknown as MockFetch).mockResolvedValueOnce({
        json: async () => ({ success: true })
      });
      
      // Call the method
      await api.screenshot('https://example.com');
      
      // Check that fetch was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.com/api/screenshot',
        {
          method: 'POST',
          body: JSON.stringify({ url: 'https://example.com', chat_id: 'test-chat-id' }),
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key'
          }
        }
      );
    });
  });
  
  describe('scrape', () => {
    it('should return data directly if no job_id is present', async () => {
      // Mock fetch response for initial request
      (global.fetch as unknown as MockFetch).mockResolvedValueOnce({
        json: async () => ({ markdown: 'Test markdown', screenshot: { url: 'https://test.com/screenshot.png' } })
      });
      
      // Call the method
      const result = await api.scrape('Scrape example.com', 'markdown');
      
      // Check the result
      expect(result).toEqual({
        markdown: 'Test markdown',
        screenshot: { url: 'https://test.com/screenshot.png' }
      });
      
      // Check that fetch was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.com/api/extract_prompt',
        {
          method: 'POST',
          body: JSON.stringify({ prompt: 'Scrape example.com', chat_id: 'test-chat-id', html_only: false }),
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key'
          },
          redirect: 'follow'
        }
      );
    });
    
    it('should poll for results if job_id is present', async () => {
      // Mock fetch responses
      (global.fetch as unknown as MockFetch)
        // Initial request returns job_id
        .mockResolvedValueOnce({
          json: async () => ({ job_id: 'test-job-id' })
        })
        // First poll shows processing
        .mockResolvedValueOnce({
          json: async () => ({ processing: true, status: 'processing' })
        })
        // Second poll shows completed with data
        .mockResolvedValueOnce({
          json: async () => ({ 
            processing: false, 
            status: 'completed',
            markdown: 'Test markdown',
            screenshot: { url: 'https://test.com/screenshot.png' }
          })
        });
      
      // Mock sleep to avoid actual waiting
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: TimerHandler) => {
        if (typeof callback === 'function') {
          callback();
        }
        return 0 as unknown as NodeJS.Timeout;
      });
      
      // Call the method
      const result = await api.scrape('Scrape example.com', 'markdown');
      
      // Check the result
      expect(result).toEqual({
        processing: false,
        status: 'completed',
        markdown: 'Test markdown',
        screenshot: { url: 'https://test.com/screenshot.png' }
      });
      
      // Check that fetch was called correctly for polling
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        'https://test-api.com/api/get_data?chat_id=test-chat-id&format=quick',
        {
          method: 'GET',
          headers: {
            'x-api-key': 'test-api-key'
          }
        }
      );
    });
  });
}); 