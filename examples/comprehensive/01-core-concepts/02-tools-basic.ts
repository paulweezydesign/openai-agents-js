/**
 * Tools Basic Example
 * 
 * This example demonstrates how to create and use tools with agents.
 * Tools are functions that agents can call to perform specific tasks.
 * 
 * Key Concepts:
 * - Function Tools: Custom functions that agents can invoke
 * - Tool Schemas: JSON schemas that define tool parameters and return types
 * - Tool Execution: How agents call tools and process results
 * - Tool Approval: Human-in-the-loop tool execution
 * 
 * Tools enable agents to:
 * - Access external data and APIs
 * - Perform calculations and data processing
 * - Interact with databases and file systems
 * - Execute system commands
 * - Integrate with third-party services
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

/**
 * Example 1: Basic Function Tool
 * 
 * This demonstrates the simplest form of a tool - a function that
 * takes parameters and returns a result.
 */
async function basicFunctionTool() {
  console.log('\n=== Basic Function Tool ===\n');
  
  // Create a simple calculator tool
  const calculatorTool = tool({
    name: 'calculator',
    description: 'Perform basic mathematical calculations',
    parameters: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: z.number().describe('First number'),
      b: z.number().describe('Second number')
    }),
    execute: async ({ operation, a, b }) => {
      switch (operation) {
        case 'add': return a + b;
        case 'subtract': return a - b;
        case 'multiply': return a * b;
        case 'divide': 
          if (b === 0) throw new Error('Division by zero');
          return a / b;
        default: throw new Error(`Unknown operation: ${operation}`);
      }
    }
  });

  const mathAgent = new Agent({
    name: 'MathTutor',
    instructions: 'You are a math tutor. Use the calculator tool to solve problems and explain the steps.',
    tools: [calculatorTool]
  });

  try {
    const result = await run(mathAgent, 'What is 15 multiplied by 7? Show me the calculation.');
    console.log('Math Agent Response:');
    console.log(result.finalOutput);
  } catch (error) {
    console.error('Error running math agent:', error);
  }
}

/**
 * Example 2: Tool with Complex Parameters
 * 
 * This example shows how to create tools with more complex parameter schemas,
 * including nested objects, arrays, and validation rules.
 */
async function complexParameterTool() {
  console.log('\n=== Complex Parameter Tool ===\n');
  
  // Create a weather analysis tool with complex parameters
  const weatherAnalysisTool = tool({
    name: 'analyze_weather',
    description: 'Analyze weather data for multiple locations and time periods',
    parameters: z.object({
      locations: z.array(z.object({
        city: z.string().min(1, 'City name is required'),
        country: z.string().optional(),
        coordinates: z.object({
          lat: z.number().min(-90).max(90),
          lon: z.number().min(-180).max(180)
        }).optional()
      })).min(1, 'At least one location is required'),
      timeRange: z.object({
        start: z.string().datetime('Start date must be a valid ISO datetime'),
        end: z.string().datetime('End date must be a valid ISO datetime')
      }),
      metrics: z.array(z.enum(['temperature', 'humidity', 'pressure', 'wind_speed', 'precipitation'])),
      includeForecast: z.boolean().default(false)
    }),
    execute: async ({ locations, timeRange, metrics, includeForecast }) => {
      // Simulate weather data analysis
      const analysis = {
        timestamp: new Date().toISOString(),
        locations: locations.map(location => ({
          ...location,
          weatherData: {
            temperature: Math.random() * 30 + 10, // 10-40°C
            humidity: Math.random() * 40 + 30,   // 30-70%
            pressure: Math.random() * 200 + 1000, // 1000-1200 hPa
            windSpeed: Math.random() * 20,        // 0-20 m/s
            precipitation: Math.random() * 10     // 0-10 mm
          }
        })),
        timeRange,
        metrics,
        forecast: includeForecast ? 'Extended forecast data available' : 'No forecast requested'
      };
      
      return JSON.stringify(analysis, null, 2);
    }
  });

  const weatherAgent = new Agent({
    name: 'WeatherAnalyst',
    instructions: 'You are a weather analyst. Use the analyze_weather tool to provide detailed weather insights.',
    tools: [weatherAnalysisTool]
  });

  try {
    const result = await run(weatherAgent, `
      Analyze the weather for New York City and London for the next 3 days.
      Include temperature, humidity, and wind speed metrics.
      Also provide a forecast.
    `);
    
    console.log('Weather Analysis Result:');
    console.log(result.finalOutput);
  } catch (error) {
    console.error('Error running weather agent:', error);
  }
}

/**
 * Example 3: Tool with Approval Workflow
 * 
 * This example demonstrates how to create tools that require human approval
 * before execution, useful for sensitive operations.
 */
async function approvalRequiredTool() {
  console.log('\n=== Approval Required Tool ===\n');
  
  // Create a database modification tool that requires approval
  const databaseTool = tool({
    name: 'modify_database',
    description: 'Modify database records (requires approval for safety)',
    parameters: z.object({
      operation: z.enum(['insert', 'update', 'delete']),
      table: z.string().min(1, 'Table name is required'),
      data: z.record(z.any()).describe('Data to insert/update or conditions for delete'),
      reason: z.string().min(10, 'Reason must be at least 10 characters')
    }),
    execute: async ({ operation, table, data, reason }) => {
      // Simulate database operation
      const timestamp = new Date().toISOString();
      return {
        success: true,
        operation,
        table,
        affectedRows: Math.floor(Math.random() * 10) + 1,
        timestamp,
        reason,
        message: `Successfully ${operation}ed ${table} table`
      };
    },
    needsApproval: async (runContext, input, callId) => {
      // In a real application, this would check user permissions
      // For this example, we'll simulate approval logic
      console.log(`\n🔐 Tool Approval Required:`);
      console.log(`Operation: ${input.operation}`);
      console.log(`Table: ${input.table}`);
      console.log(`Reason: ${input.reason}`);
      console.log(`Call ID: ${callId}`);
      
      // Simulate user approval (in real app, this would be interactive)
      const approved = input.operation !== 'delete' || input.reason.includes('urgent');
      
      console.log(`Approval: ${approved ? '✅ APPROVED' : '❌ DENIED'}`);
      return approved;
    }
  });

  const databaseAgent = new Agent({
    name: 'DatabaseManager',
    instructions: 'You are a database manager. Use the modify_database tool carefully and always provide clear reasons.',
    tools: [databaseTool]
  });

  try {
    // This should trigger approval
    const result = await run(databaseAgent, 'Insert a new user record for John Doe with email john@example.com');
    console.log('\nDatabase Operation Result:');
    console.log(result.finalOutput);
  } catch (error) {
    console.error('Error running database agent:', error);
  }
}

/**
 * Example 4: Tool with Side Effects and Error Handling
 * 
 * This example shows how to create robust tools that handle errors gracefully
 * and can perform side effects like logging or notifications.
 */
async function robustToolWithSideEffects() {
  console.log('\n=== Robust Tool with Side Effects ===\n');
  
  // Create a file operation tool with comprehensive error handling
  const fileOperationTool = tool({
    name: 'file_operation',
    description: 'Perform file operations with comprehensive error handling and logging',
    parameters: z.object({
      operation: z.enum(['read', 'write', 'delete', 'list']),
      path: z.string().min(1, 'File path is required'),
      content: z.string().optional().describe('Content to write (for write operations)'),
      encoding: z.enum(['utf8', 'ascii', 'base64']).default('utf8')
    }),
    execute: async ({ operation, path, content, encoding }) => {
      try {
        // Simulate file operations
        switch (operation) {
          case 'read':
            // Simulate file reading
            if (path.includes('nonexistent')) {
              throw new Error(`File not found: ${path}`);
            }
            return `File content from ${path} (${encoding}): Sample file content here`;
            
          case 'write':
            // Simulate file writing
            if (path.includes('protected')) {
              throw new Error(`Permission denied: ${path}`);
            }
            return `Successfully wrote ${content?.length || 0} characters to ${path}`;
            
          case 'delete':
            // Simulate file deletion
            if (path.includes('system')) {
              throw new Error(`Cannot delete system file: ${path}`);
            }
            return `Successfully deleted file: ${path}`;
            
          case 'list':
            // Simulate directory listing
            return `Files in ${path}:\n- file1.txt\n- file2.txt\n- subdirectory/`;
            
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      } catch (error) {
        // Log the error (side effect)
        console.error(`File operation error: ${error.message}`);
        
        // Return structured error information
        return {
          success: false,
          error: error.message,
          operation,
          path,
          timestamp: new Date().toISOString()
        };
      }
    }
  });

  const fileAgent = new Agent({
    name: 'FileManager',
    instructions: 'You are a file manager. Use the file_operation tool to manage files safely.',
    tools: [fileOperationTool]
  });

  try {
    // Test various file operations
    const operations = [
      'List the contents of the documents directory',
      'Read the file config.txt',
      'Write "Hello World" to test.txt',
      'Try to read a nonexistent file called missing.txt'
    ];

    for (const operation of operations) {
      console.log(`\n--- Testing: ${operation} ---`);
      const result = await run(fileAgent, operation);
      console.log('Result:', result.finalOutput);
    }
  } catch (error) {
    console.error('Error running file agent:', error);
  }
}

/**
 * Example 5: Tool Composition and Chaining
 * 
 * This example demonstrates how tools can be composed together to create
 * more complex workflows and how agents can chain tool calls.
 */
async function toolCompositionExample() {
  console.log('\n=== Tool Composition Example ===\n');
  
  // Create a set of related tools that can work together
  const dataProcessingTools = [
    // Data validation tool
    tool({
      name: 'validate_data',
      description: 'Validate data against a schema',
      parameters: z.object({
        data: z.any(),
        schema: z.string().describe('JSON schema as string')
      }),
      execute: async ({ data, schema }) => {
        try {
          const parsedSchema = JSON.parse(schema);
          // Simulate validation
          return { valid: true, message: 'Data validation passed' };
        } catch (error) {
          return { valid: false, message: `Validation error: ${error.message}` };
        }
      }
    }),
    
    // Data transformation tool
    tool({
      name: 'transform_data',
      description: 'Transform data using specified rules',
      parameters: z.object({
        data: z.any(),
        transformation: z.string().describe('Transformation rule')
      }),
      execute: async ({ data, transformation }) => {
        // Simulate data transformation
        return `Data transformed using rule: ${transformation}`;
      }
    }),
    
    // Data analysis tool
    tool({
      name: 'analyze_data',
      description: 'Perform statistical analysis on data',
      parameters: z.object({
        data: z.any(),
        metrics: z.array(z.string()).describe('Metrics to calculate')
      }),
      execute: async ({ data, metrics }) => {
        // Simulate data analysis
        const analysis = metrics.map(metric => ({
          metric,
          value: Math.random() * 100,
          unit: 'units'
        }));
        return JSON.stringify(analysis, null, 2);
      }
    })
  ];

  const dataWorkflowAgent = new Agent({
    name: 'DataWorkflowAgent',
    instructions: `
      You are a data workflow specialist. You can:
      1. Validate data using the validate_data tool
      2. Transform data using the transform_data tool
      3. Analyze data using the analyze_data tool
      
      Always validate data before processing, then transform if needed, and finally analyze.
      Provide a comprehensive workflow report.
    `,
    tools: dataProcessingTools
  });

  try {
    const result = await run(dataWorkflowAgent, `
      I have a dataset with customer information. Please:
      1. Validate the data structure
      2. Transform it to a standardized format
      3. Analyze the customer demographics
      
      The data includes: name, age, location, purchase_amount
    `);
    
    console.log('Data Workflow Result:');
    console.log(result.finalOutput);
  } catch (error) {
    console.error('Error running data workflow agent:', error);
  }
}

/**
 * Main function that runs all tool examples
 */
async function main() {
  console.log('🔧 OpenAI Agents SDK - Tools Examples\n');
  console.log('This example demonstrates how to create and use tools with agents.\n');
  
  try {
    await basicFunctionTool();
    await complexParameterTool();
    await approvalRequiredTool();
    await robustToolWithSideEffects();
    await toolCompositionExample();
    
    console.log('\n✅ All tool examples completed successfully!');
    console.log('\nKey Takeaways:');
    console.log('1. Tools extend agent capabilities with external functionality');
    console.log('2. Tool schemas ensure proper parameter validation');
    console.log('3. Tools can require approval for sensitive operations');
    console.log('4. Robust error handling makes tools production-ready');
    console.log('5. Tools can be composed to create complex workflows');
    
  } catch (error) {
    console.error('\n❌ Error running tool examples:', error);
    process.exit(1);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicFunctionTool,
  complexParameterTool,
  approvalRequiredTool,
  robustToolWithSideEffects,
  toolCompositionExample
};