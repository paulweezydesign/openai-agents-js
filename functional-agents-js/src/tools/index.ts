/**
 * Extended tool library with common utilities
 */

import { z } from 'zod';
import { tool, simpleTool } from '../core/tools.js';
import type { AgentContext } from '../core/types.js';

/**
 * HTTP request tool
 */
export const httpTool = tool({
  name: 'http_request',
  description: 'Make HTTP requests to APIs and web services',
  parameters: z.object({
    url: z.string().url().describe('The URL to make the request to'),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
    headers: z.record(z.string()).optional().describe('HTTP headers'),
    body: z.string().optional().describe('Request body (for POST/PUT/PATCH)'),
    timeout: z.number().optional().default(10000).describe('Request timeout in ms'),
  }),
  execute: async ({ url, method, headers, body, timeout }) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(JSON.parse(body)) : undefined,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      
      return JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
      });
    } catch (error) {
      return `HTTP request failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

/**
 * Database query tool (mock implementation)
 */
export const databaseTool = tool({
  name: 'database_query',
  description: 'Execute database queries safely',
  parameters: z.object({
    query: z.string().describe('SQL query to execute'),
    database: z.string().describe('Database name'),
    readOnly: z.boolean().default(true).describe('Whether this is a read-only query'),
  }),
  execute: async ({ query, database, readOnly }) => {
    // Mock implementation - in practice, use proper database connection
    if (!readOnly && !query.toLowerCase().startsWith('select')) {
      return 'Error: Only SELECT queries allowed in read-only mode';
    }
    
    return `Query executed on ${database}: ${query}\nResults: [mock database results]`;
  },
  needsApproval: (input) => !input.readOnly,
});

/**
 * Email sending tool
 */
export const emailTool = tool({
  name: 'send_email',
  description: 'Send emails to recipients',
  parameters: z.object({
    to: z.array(z.string().email()).describe('Recipient email addresses'),
    subject: z.string().describe('Email subject'),
    body: z.string().describe('Email body content'),
    cc: z.array(z.string().email()).optional().describe('CC recipients'),
    bcc: z.array(z.string().email()).optional().describe('BCC recipients'),
  }),
  execute: async ({ to, subject, body, cc, bcc }) => {
    // Mock implementation
    return `Email sent successfully to ${to.join(', ')}. Subject: "${subject}"`;
  },
  needsApproval: true, // Always require approval for sending emails
});

/**
 * Calendar tool
 */
export const calendarTool = tool({
  name: 'calendar_operations',
  description: 'Manage calendar events and scheduling',
  parameters: z.object({
    operation: z.enum(['create', 'read', 'update', 'delete', 'list']),
    eventId: z.string().optional().describe('Event ID for read/update/delete operations'),
    title: z.string().optional().describe('Event title'),
    startTime: z.string().optional().describe('Start time (ISO format)'),
    endTime: z.string().optional().describe('End time (ISO format)'),
    attendees: z.array(z.string().email()).optional().describe('Attendee emails'),
  }),
  execute: async ({ operation, eventId, title, startTime, endTime, attendees }) => {
    // Mock implementation
    switch (operation) {
      case 'create':
        return `Created calendar event: "${title}" from ${startTime} to ${endTime}`;
      case 'read':
        return `Event ${eventId}: [mock event details]`;
      case 'update':
        return `Updated event ${eventId}`;
      case 'delete':
        return `Deleted event ${eventId}`;
      case 'list':
        return 'Upcoming events: [mock event list]';
      default:
        return 'Unknown calendar operation';
    }
  },
});

/**
 * Image generation tool
 */
export const imageGenerationTool = tool({
  name: 'generate_image',
  description: 'Generate images using AI',
  parameters: z.object({
    prompt: z.string().describe('Description of the image to generate'),
    size: z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
    style: z.enum(['natural', 'vivid']).default('natural'),
    quality: z.enum(['standard', 'hd']).default('standard'),
  }),
  execute: async ({ prompt, size, style, quality }) => {
    // Mock implementation - in practice, use OpenAI DALL-E API
    return `Generated image with prompt: "${prompt}" (${size}, ${style}, ${quality})\nImage URL: [mock-image-url]`;
  },
});

/**
 * Text processing tools
 */
export const textProcessingTools = {
  summarize: simpleTool(
    'summarize_text',
    'Summarize long text content',
    z.object({
      text: z.string(),
      maxLength: z.number().optional().default(200),
    }),
    async ({ text, maxLength = 200 }) => {
      // Mock summarization
      const words = text.split(' ');
      const summary = words.slice(0, Math.min(words.length, maxLength / 5)).join(' ');
      return `Summary (${summary.length} chars): ${summary}...`;
    }
  ),
  
  translate: simpleTool(
    'translate_text',
    'Translate text between languages',
    z.object({
      text: z.string(),
      fromLanguage: z.string().describe('Source language code (e.g., en, es, fr)'),
      toLanguage: z.string().describe('Target language code'),
    }),
    async ({ text, fromLanguage, toLanguage }) => {
      // Mock translation
      return `Translated from ${fromLanguage} to ${toLanguage}: [translated text would be here]`;
    }
  ),
  
  sentiment: simpleTool(
    'analyze_sentiment',
    'Analyze sentiment of text',
    z.object({
      text: z.string(),
    }),
    async ({ text }) => {
      // Mock sentiment analysis
      const sentiments = ['positive', 'negative', 'neutral'];
      const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      return `Sentiment analysis: ${randomSentiment} (confidence: ${(Math.random() * 0.5 + 0.5).toFixed(2)})`;
    }
  ),
};

/**
 * System tools
 */
export const systemTools = {
  getCurrentTime: simpleTool(
    'get_current_time',
    'Get the current date and time',
    z.object({
      timezone: z.string().optional().describe('Timezone (e.g., UTC, America/New_York)'),
      format: z.enum(['iso', 'human', 'timestamp']).default('human'),
    }),
    async ({ timezone, format }) => {
      const now = new Date();
      switch (format) {
        case 'iso':
          return now.toISOString();
        case 'timestamp':
          return now.getTime().toString();
        case 'human':
        default:
          return now.toLocaleString(undefined, timezone ? { timeZone: timezone as string } : undefined);
      }
    }
  ),
  
  generateUUID: simpleTool(
    'generate_uuid',
    'Generate a unique identifier',
    z.object({
      version: z.enum(['v4']).default('v4'),
    }),
    async ({ version }) => {
      if (version === 'v4') {
        return crypto.randomUUID();
      }
      return crypto.randomUUID();
    }
  ),
  
  sleep: simpleTool(
    'sleep',
    'Wait for a specified amount of time',
    z.object({
      seconds: z.number().min(0).max(60).describe('Number of seconds to wait'),
    }),
    async ({ seconds = 1 }) => {
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
      return `Waited for ${seconds} seconds`;
    }
  ),
};

/**
 * Tool collections for common use cases
 */
export const toolCollections = {
  // Basic utility tools
  basic: [
    systemTools.getCurrentTime,
    systemTools.generateUUID,
  ],
  
  // Communication tools
  communication: [
    emailTool,
    calendarTool,
  ],
  
  // Data processing tools
  dataProcessing: [
    databaseTool,
    httpTool,
    textProcessingTools.summarize,
    textProcessingTools.sentiment,
  ],
  
  // Creative tools
  creative: [
    imageGenerationTool,
    textProcessingTools.translate,
  ],
  
  // Development tools
  development: [
    httpTool,
    databaseTool,
  ],
  
  // All tools
  all: [
    ...Object.values(systemTools),
    ...Object.values(textProcessingTools),
    emailTool,
    calendarTool,
    databaseTool,
    httpTool,
    imageGenerationTool,
  ],
};