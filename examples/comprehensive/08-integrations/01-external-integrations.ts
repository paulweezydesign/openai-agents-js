/**
 * External Integrations Example
 * 
 * This example demonstrates how to integrate OpenAI Agents with various
 * external services and systems including:
 * 
 * - Database integrations (SQL, NoSQL)
 * - REST API integrations
 * - File system operations
 * - Email and messaging services
 * - Cloud services (AWS, Azure, GCP)
 * - Third-party APIs (weather, maps, etc.)
 * - Web scraping and data extraction
 * - Authentication and OAuth flows
 * 
 * Key Concepts:
 * - Tool Integration: Creating tools that interface with external systems
 * - Data Transformation: Converting between different data formats
 * - Error Handling: Managing external service failures gracefully
 * - Rate Limiting: Respecting API limits and quotas
 * - Caching: Storing external data for performance
 * - Security: Handling credentials and sensitive data safely
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

// Mock external service implementations (in real apps, use actual SDKs)
interface DatabaseConnection {
  query(sql: string, params?: any[]): Promise<any[]>;
  close(): Promise<void>;
}

interface APIClient {
  get(url: string, headers?: Record<string, string>): Promise<any>;
  post(url: string, data: any, headers?: Record<string, string>): Promise<any>;
}

interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listFiles(directory: string): Promise<string[]>;
}

// Mock implementations for demonstration
class MockDatabase implements DatabaseConnection {
  private data = new Map([
    ['users', [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user' }
    ]],
    ['products', [
      { id: 1, name: 'Laptop', price: 999.99, category: 'electronics' },
      { id: 2, name: 'Mouse', price: 29.99, category: 'electronics' },
      { id: 3, name: 'Desk', price: 199.99, category: 'furniture' }
    ]],
    ['orders', [
      { id: 1, userId: 1, productId: 1, quantity: 1, total: 999.99, status: 'completed' },
      { id: 2, userId: 2, productId: 2, quantity: 2, total: 59.98, status: 'pending' }
    ]]
  ]);

  async query(sql: string, params: any[] = []): Promise<any[]> {
    // Simple SQL-like query parsing for demo
    const lowerSql = sql.toLowerCase();
    
    if (lowerSql.includes('select') && lowerSql.includes('from users')) {
      return this.data.get('users') || [];
    } else if (lowerSql.includes('select') && lowerSql.includes('from products')) {
      return this.data.get('products') || [];
    } else if (lowerSql.includes('select') && lowerSql.includes('from orders')) {
      return this.data.get('orders') || [];
    } else if (lowerSql.includes('insert into users')) {
      const newUser = { id: Date.now(), name: params[0], email: params[1], role: params[2] || 'user' };
      this.data.get('users')?.push(newUser);
      return [newUser];
    }
    
    return [];
  }

  async close(): Promise<void> {
    // Mock cleanup
  }
}

class MockAPIClient implements APIClient {
  private rateLimit = new Map<string, number[]>();
  private maxRequests = 10;
  private windowMs = 60000; // 1 minute

  private checkRateLimit(endpoint: string): boolean {
    const now = Date.now();
    const requests = this.rateLimit.get(endpoint) || [];
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.rateLimit.set(endpoint, recentRequests);
    return true;
  }

  async get(url: string, headers: Record<string, string> = {}): Promise<any> {
    if (!this.checkRateLimit(url)) {
      throw new Error('Rate limit exceeded');
    }

    // Simulate different API responses
    if (url.includes('weather')) {
      return {
        temperature: Math.floor(Math.random() * 30) + 10,
        condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
        humidity: Math.floor(Math.random() * 40) + 30
      };
    } else if (url.includes('stock')) {
      return {
        symbol: 'AAPL',
        price: (Math.random() * 100 + 100).toFixed(2),
        change: (Math.random() * 10 - 5).toFixed(2),
        volume: Math.floor(Math.random() * 1000000)
      };
    } else if (url.includes('news')) {
      return {
        articles: [
          { title: 'Tech Innovation', summary: 'Latest developments in AI', category: 'technology' },
          { title: 'Market Update', summary: 'Stock market trends', category: 'finance' }
        ]
      };
    }
    
    return { message: 'Mock API response', url, timestamp: new Date().toISOString() };
  }

  async post(url: string, data: any, headers: Record<string, string> = {}): Promise<any> {
    if (!this.checkRateLimit(url)) {
      throw new Error('Rate limit exceeded');
    }

    return {
      success: true,
      data: data,
      url,
      timestamp: new Date().toISOString()
    };
  }
}

class MockFileSystem implements FileSystem {
  private files = new Map<string, string>([
    ['/config/app.json', JSON.stringify({ name: 'MyApp', version: '1.0.0' })],
    ['/logs/error.log', '2024-01-01 ERROR: Test error message\n2024-01-01 INFO: Test info message'],
    ['/data/users.csv', 'id,name,email\n1,John,john@example.com\n2,Jane,jane@example.com']
  ]);

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (!content) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async listFiles(directory: string): Promise<string[]> {
    return Array.from(this.files.keys()).filter(path => path.startsWith(directory));
  }
}

/**
 * Example 1: Database Integration
 * 
 * This demonstrates how to integrate agents with databases
 * for data querying, analysis, and manipulation.
 */
async function databaseIntegrationExample() {
  console.log('\n=== Database Integration Example ===\n');
  
  const db = new MockDatabase();
  
  // Create database tools
  const databaseTools = [
    tool({
      name: 'query_database',
      description: 'Execute SQL queries against the database',
      parameters: z.object({
        sql: z.string().describe('SQL query to execute'),
        params: z.array(z.any()).optional().describe('Query parameters')
      }),
      execute: async ({ sql, params }) => {
        try {
          const results = await db.query(sql, params);
          return {
            success: true,
            results,
            rowCount: results.length,
            sql,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            sql,
            timestamp: new Date().toISOString()
          };
        }
      }
    }),
    
    tool({
      name: 'add_user',
      description: 'Add a new user to the database',
      parameters: z.object({
        name: z.string().describe('User name'),
        email: z.string().email().describe('User email'),
        role: z.enum(['admin', 'user', 'guest']).default('user').describe('User role')
      }),
      execute: async ({ name, email, role }) => {
        try {
          const result = await db.query('INSERT INTO users (name, email, role) VALUES (?, ?, ?)', [name, email, role]);
          return {
            success: true,
            user: result[0],
            message: 'User added successfully'
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    })
  ];

  // Create a database agent
  const databaseAgent = new Agent({
    name: 'DatabaseAnalyst',
    instructions: `
      You are a database analyst that can query and analyze data.
      Use the database tools to:
      1. Retrieve user information
      2. Analyze product data
      3. Generate reports on orders
      4. Add new users when requested
      
      Always provide clear explanations of the data and insights.
    `,
    tools: databaseTools
  });

  try {
    // Query user data
    console.log('--- Querying User Data ---');
    const userQuery = await run(databaseAgent, 'Show me all users and their roles');
    console.log('User Query Result:', userQuery.finalOutput);

    // Analyze product data
    console.log('\n--- Analyzing Product Data ---');
    const productAnalysis = await run(databaseAgent, 'Analyze the product catalog and provide insights');
    console.log('Product Analysis:', productAnalysis.finalOutput);

    // Add new user
    console.log('\n--- Adding New User ---');
    const addUser = await run(databaseAgent, 'Add a new user named Alice with email alice@example.com and admin role');
    console.log('Add User Result:', addUser.finalOutput);

    // Generate order report
    console.log('\n--- Generating Order Report ---');
    const orderReport = await run(databaseAgent, 'Generate a comprehensive report on all orders');
    console.log('Order Report:', orderReport.finalOutput);
    
  } catch (error) {
    console.error('Error in database integration:', error);
  } finally {
    await db.close();
  }
}

/**
 * Example 2: REST API Integration
 * 
 * This example shows how to integrate agents with external APIs
 * for data fetching and service interactions.
 */
async function restApiIntegrationExample() {
  console.log('\n=== REST API Integration Example ===\n');
  
  const apiClient = new MockAPIClient();
  
  // Create API integration tools
  const apiTools = [
    tool({
      name: 'fetch_weather',
      description: 'Fetch current weather information for a location',
      parameters: z.object({
        location: z.string().describe('City or location name'),
        units: z.enum(['celsius', 'fahrenheit']).default('celsius').describe('Temperature units')
      }),
      execute: async ({ location, units }) => {
        try {
          const response = await apiClient.get(`https://api.weather.com/current?location=${location}&units=${units}`);
          
          // Convert temperature if needed
          if (units === 'fahrenheit') {
            response.temperature = (response.temperature * 9/5) + 32;
          }
          
          return {
            location,
            weather: response,
            units,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            location,
            timestamp: new Date().toISOString()
          };
        }
      }
    }),
    
    tool({
      name: 'get_stock_info',
      description: 'Fetch stock market information for a symbol',
      parameters: z.object({
        symbol: z.string().describe('Stock symbol (e.g., AAPL, GOOGL)'),
        includeNews: z.boolean().default(false).describe('Whether to include related news')
      }),
      execute: async ({ symbol, includeNews }) => {
        try {
          const stockData = await apiClient.get(`https://api.stocks.com/quote?symbol=${symbol}`);
          
          let newsData = null;
          if (includeNews) {
            newsData = await apiClient.get(`https://api.news.com/search?q=${symbol}&category=finance`);
          }
          
          return {
            symbol,
            stock: stockData,
            news: newsData,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            symbol,
            timestamp: new Date().toISOString()
          };
        }
      }
    }),
    
    tool({
      name: 'send_api_request',
      description: 'Send a custom API request to any endpoint',
      parameters: z.object({
        method: z.enum(['GET', 'POST']).describe('HTTP method'),
        url: z.string().describe('API endpoint URL'),
        data: z.any().optional().describe('Data to send (for POST requests)'),
        headers: z.record(z.string()).optional().describe('Custom headers')
      }),
      execute: async ({ method, url, data, headers }) => {
        try {
          let response;
          if (method === 'GET') {
            response = await apiClient.get(url, headers);
          } else {
            response = await apiClient.post(url, data, headers);
          }
          
          return {
            success: true,
            method,
            url,
            response,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            method,
            url,
            timestamp: new Date().toISOString()
          };
        }
      }
    })
  ];

  // Create an API integration agent
  const apiAgent = new Agent({
    name: 'APIIntegrationSpecialist',
    instructions: `
      You are an API integration specialist that can fetch data from various services.
      Use the API tools to:
      1. Get weather information for locations
      2. Fetch stock market data
      3. Make custom API requests
      
      Always handle errors gracefully and provide useful information to users.
    `,
    tools: apiTools
  });

  try {
    // Get weather information
    console.log('--- Fetching Weather Data ---');
    const weatherData = await run(apiAgent, 'Get the current weather for New York City in Celsius');
    console.log('Weather Data:', weatherData.finalOutput);

    // Get stock information
    console.log('\n--- Fetching Stock Data ---');
    const stockData = await run(apiAgent, 'Get stock information for Apple (AAPL) including related news');
    console.log('Stock Data:', stockData.finalOutput);

    // Custom API request
    console.log('\n--- Custom API Request ---');
    const customRequest = await run(apiAgent, 'Send a GET request to https://api.news.com/top-headlines?category=technology');
    console.log('Custom Request Result:', customRequest.finalOutput);
    
  } catch (error) {
    console.error('Error in API integration:', error);
  }
}

/**
 * Example 3: File System Integration
 * 
 * This example demonstrates how to integrate agents with file systems
 * for reading, writing, and managing files.
 */
async function fileSystemIntegrationExample() {
  console.log('\n=== File System Integration Example ===\n');
  
  const fs = new MockFileSystem();
  
  // Create file system tools
  const fileSystemTools = [
    tool({
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: z.object({
        path: z.string().describe('File path to read'),
        encoding: z.enum(['utf8', 'base64']).default('utf8').describe('File encoding')
      }),
      execute: async ({ path, encoding }) => {
        try {
          const content = await fs.readFile(path);
          
          if (encoding === 'base64') {
            return {
              success: true,
              path,
              content: Buffer.from(content).toString('base64'),
              encoding,
              size: content.length,
              timestamp: new Date().toISOString()
            };
          }
          
          return {
            success: true,
            path,
            content,
            encoding,
            size: content.length,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            path,
            timestamp: new Date().toISOString()
          };
        }
      }
    }),
    
    tool({
      name: 'write_file',
      description: 'Write content to a file',
      parameters: z.object({
        path: z.string().describe('File path to write to'),
        content: z.string().describe('Content to write to the file'),
        append: z.boolean().default(false).describe('Whether to append to existing file')
      }),
      execute: async ({ path, content, append }) => {
        try {
          let finalContent = content;
          
          if (append) {
            try {
              const existingContent = await fs.readFile(path);
              finalContent = existingContent + '\n' + content;
            } catch (error) {
              // File doesn't exist, create new
            }
          }
          
          await fs.writeFile(path, finalContent);
          
          return {
            success: true,
            path,
            contentLength: finalContent.length,
            appended: append,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            path,
            timestamp: new Date().toISOString()
          };
        }
      }
    }),
    
    tool({
      name: 'list_files',
      description: 'List files in a directory',
      parameters: z.object({
        directory: z.string().describe('Directory path to list files from'),
        pattern: z.string().optional().describe('File pattern filter (e.g., *.txt)')
      }),
      execute: async ({ directory, pattern }) => {
        try {
          const files = await fs.listFiles(directory);
          
          let filteredFiles = files;
          if (pattern) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            filteredFiles = files.filter(file => regex.test(file));
          }
          
          return {
            success: true,
            directory,
            files: filteredFiles,
            totalCount: filteredFiles.length,
            pattern: pattern || 'none',
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            directory,
            timestamp: new Date().toISOString()
          };
        }
      }
    })
  ];

  // Create a file system agent
  const fileSystemAgent = new Agent({
    name: 'FileSystemManager',
    instructions: `
      You are a file system manager that can read, write, and manage files.
      Use the file system tools to:
      1. Read file contents and provide analysis
      2. Write new files or append to existing ones
      3. List and explore directory structures
      
      Always provide helpful insights about file contents and suggest improvements.
    `,
    tools: fileSystemTools
  });

  try {
    // Read and analyze a file
    console.log('--- Reading and Analyzing File ---');
    const fileAnalysis = await run(fileSystemAgent, 'Read the app configuration file and analyze its contents');
    console.log('File Analysis:', fileAnalysis.finalOutput);

    // List directory contents
    console.log('\n--- Listing Directory Contents ---');
    const directoryListing = await run(fileSystemAgent, 'List all files in the logs directory');
    console.log('Directory Listing:', directoryListing.finalOutput);

    // Write a new file
    console.log('\n--- Writing New File ---');
    const writeFile = await run(fileSystemAgent, 'Create a new file called /data/summary.txt with a summary of the current system status');
    console.log('Write File Result:', writeFile.finalOutput);

    // Append to existing file
    console.log('\n--- Appending to File ---');
    const appendFile = await run(fileSystemAgent, 'Append a new log entry to the error log file');
    console.log('Append File Result:', appendFile.finalOutput);
    
  } catch (error) {
    console.error('Error in file system integration:', error);
  }
}

/**
 * Example 4: Multi-Service Integration
 * 
 * This example shows how to combine multiple external services
 * to create comprehensive workflows and data pipelines.
 */
async function multiServiceIntegrationExample() {
  console.log('\n=== Multi-Service Integration Example ===\n');
  
  const db = new MockDatabase();
  const apiClient = new MockAPIClient();
  const fs = new MockFileSystem();
  
  // Create comprehensive integration tools
  const integrationTools = [
    tool({
      name: 'data_pipeline',
      description: 'Execute a complete data pipeline combining multiple services',
      parameters: z.object({
        pipeline: z.enum(['user_analysis', 'market_research', 'system_report']).describe('Type of pipeline to execute'),
        output_format: z.enum(['json', 'csv', 'report']).default('report').describe('Output format for results')
      }),
      execute: async ({ pipeline, output_format }) => {
        try {
          let results: any = {};
          
          switch (pipeline) {
            case 'user_analysis':
              // Combine database and API data
              const users = await db.query('SELECT * FROM users');
              const userCount = users.length;
              const adminCount = users.filter(u => u.role === 'admin').length;
              
              results = {
                pipeline: 'user_analysis',
                userStats: {
                  total: userCount,
                  admins: adminCount,
                  regular: userCount - adminCount
                },
                users: users,
                timestamp: new Date().toISOString()
              };
              break;
              
            case 'market_research':
              // Combine stock data and news
              const stockData = await apiClient.get('https://api.stocks.com/quote?symbol=AAPL');
              const newsData = await apiClient.get('https://api.news.com/search?q=technology');
              
              results = {
                pipeline: 'market_research',
                stock: stockData,
                news: newsData,
                analysis: {
                  marketSentiment: 'positive',
                  keyTrends: ['AI advancement', 'Cloud computing', 'Cybersecurity']
                },
                timestamp: new Date().toISOString()
              };
              break;
              
            case 'system_report':
              // Combine file system and database data
              const configFiles = await fs.listFiles('/config');
              const logFiles = await fs.listFiles('/logs');
              const orders = await db.query('SELECT * FROM orders');
              
              results = {
                pipeline: 'system_report',
                system: {
                  configFiles: configFiles.length,
                  logFiles: logFiles.length,
                  totalOrders: orders.length
                },
                files: { config: configFiles, logs: logFiles },
                orders: orders,
                timestamp: new Date().toISOString()
              };
              break;
          }
          
          // Format output
          let formattedOutput = results;
          if (output_format === 'csv') {
            formattedOutput = convertToCSV(results);
          } else if (output_format === 'json') {
            formattedOutput = JSON.stringify(results, null, 2);
          }
          
          return {
            success: true,
            pipeline,
            output_format,
            results: formattedOutput,
            timestamp: new Date().toISOString()
          };
          
        } catch (error) {
          return {
            success: false,
            error: error.message,
            pipeline,
            timestamp: new Date().toISOString()
          };
        }
      }
    }),
    
    tool({
      name: 'cross_service_query',
      description: 'Query multiple services and correlate the results',
      parameters: z.object({
        services: z.array(z.string()).describe('Services to query (database, api, files)'),
        query: z.string().describe('Query to execute across services'),
        correlation: z.enum(['merge', 'compare', 'analyze']).default('merge').describe('How to correlate results')
      }),
      execute: async ({ services, query, correlation }) => {
        try {
          const results: Record<string, any> = {};
          
          // Query each requested service
          if (services.includes('database')) {
            if (query.includes('user')) {
              results.database = await db.query('SELECT * FROM users');
            } else if (query.includes('product')) {
              results.database = await db.query('SELECT * FROM products');
            }
          }
          
          if (services.includes('api')) {
            if (query.includes('weather')) {
              results.api = await apiClient.get('https://api.weather.com/current?location=NewYork');
            } else if (query.includes('stock')) {
              results.api = await apiClient.get('https://api.stocks.com/quote?symbol=AAPL');
            }
          }
          
          if (services.includes('files')) {
            if (query.includes('config')) {
              results.files = await fs.listFiles('/config');
            } else if (query.includes('logs')) {
              results.files = await fs.listFiles('/logs');
            }
          }
          
          // Correlate results based on type
          let correlatedResult = results;
          if (correlation === 'compare') {
            correlatedResult = {
              comparison: 'Cross-service data comparison',
              services: Object.keys(results),
              data: results,
              insights: generateInsights(results)
            };
          } else if (correlation === 'analyze') {
            correlatedResult = {
              analysis: 'Cross-service data analysis',
              services: Object.keys(results),
              data: results,
              patterns: identifyPatterns(results),
              recommendations: generateRecommendations(results)
            };
          }
          
          return {
            success: true,
            services,
            query,
            correlation,
            results: correlatedResult,
            timestamp: new Date().toISOString()
          };
          
        } catch (error) {
          return {
            success: false,
            error: error.message,
            services,
            query,
            timestamp: new Date().toISOString()
          };
        }
      }
    })
  ];

  // Helper functions
  function convertToCSV(data: any): string {
    // Simple CSV conversion for demo
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      const headers = Object.keys(data[0]);
      const csv = [headers.join(',')];
      data.forEach(row => {
        csv.push(headers.map(header => JSON.stringify(row[header])).join(','));
      });
      return csv.join('\n');
    }
    return JSON.stringify(data);
  }
  
  function generateInsights(data: Record<string, any>): string[] {
    const insights: string[] = [];
    if (data.database) insights.push('Database contains structured user and product data');
    if (data.api) insights.push('API provides real-time external data');
    if (data.files) insights.push('File system contains configuration and log files');
    return insights;
  }
  
  function identifyPatterns(data: Record<string, any>): string[] {
    const patterns: string[] = [];
    if (data.database && data.api) patterns.push('Combined structured and real-time data');
    if (data.files && data.database) patterns.push('Configuration-driven data management');
    return patterns;
  }
  
  function generateRecommendations(data: Record<string, any>): string[] {
    const recommendations: string[] = [];
    if (Object.keys(data).length > 1) {
      recommendations.push('Consider implementing data synchronization between services');
      recommendations.push('Implement caching to reduce API calls');
    }
    return recommendations;
  }

  // Create a multi-service integration agent
  const integrationAgent = new Agent({
    name: 'MultiServiceIntegrator',
    instructions: `
      You are a multi-service integration specialist that can orchestrate data flows.
      Use the integration tools to:
      1. Execute comprehensive data pipelines
      2. Query multiple services and correlate results
      3. Provide insights across different data sources
      
      Always explain how different services work together and provide actionable insights.
    `,
    tools: integrationTools
  });

  try {
    // Execute user analysis pipeline
    console.log('--- Executing User Analysis Pipeline ---');
    const userPipeline = await run(integrationAgent, 'Run the user analysis pipeline and provide insights');
    console.log('User Pipeline Result:', userPipeline.finalOutput);

    // Cross-service query
    console.log('\n--- Cross-Service Query ---');
    const crossServiceQuery = await run(integrationAgent, 'Query the database for users, get weather data from API, and analyze the correlation');
    console.log('Cross-Service Query Result:', crossServiceQuery.finalOutput);

    // System report pipeline
    console.log('\n--- System Report Pipeline ---');
    const systemReport = await run(integrationAgent, 'Generate a comprehensive system report combining all services');
    console.log('System Report Result:', systemReport.finalOutput);
    
  } catch (error) {
    console.error('Error in multi-service integration:', error);
  } finally {
    await db.close();
  }
}

/**
 * Main function that runs all integration examples
 */
async function main() {
  console.log('🔗 OpenAI Agents SDK - External Integrations Examples\n');
  console.log('This example demonstrates integration with external services and systems.\n');
  
  try {
    await databaseIntegrationExample();
    await restApiIntegrationExample();
    await fileSystemIntegrationExample();
    await multiServiceIntegrationExample();
    
    console.log('\n✅ All integration examples completed successfully!');
    console.log('\nKey Takeaways:');
    console.log('1. Tools enable seamless integration with external services');
    console.log('2. Error handling is crucial for reliable external integrations');
    console.log('3. Data transformation bridges different service formats');
    console.log('4. Multi-service workflows create powerful data pipelines');
    console.log('5. Security and rate limiting are essential for production integrations');
    
  } catch (error) {
    console.error('\n❌ Error running integration examples:', error);
    process.exit(1);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  databaseIntegrationExample,
  restApiIntegrationExample,
  fileSystemIntegrationExample,
  multiServiceIntegrationExample
};