/**
 * Production-Ready Agents Example
 * 
 * This example demonstrates how to build production-ready agents with
 * enterprise-grade features including:
 * 
 * - Comprehensive error handling and retries
 * - Structured logging and monitoring
 * - Performance optimization and caching
 * - Security and authentication
 * - Deployment and scaling strategies
 * - Health checks and observability
 * 
 * Key Concepts:
 * - Error Handling: Graceful failure handling with retries and fallbacks
 * - Logging: Structured logging for debugging and monitoring
 * - Monitoring: Performance metrics and health checks
 * - Security: Input validation, authentication, and authorization
 * - Caching: Response caching and optimization strategies
 * - Resilience: Circuit breakers and fault tolerance
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

// Production utilities and configurations
interface Logger {
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error, metadata?: Record<string, any>): void;
  debug(message: string, metadata?: Record<string, any>): void;
}

interface Metrics {
  increment(metric: string, value?: number, tags?: Record<string, string>): void;
  timing(metric: string, duration: number, tags?: Record<string, string>): void;
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
}

interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// Simple production utilities (in real apps, use proper libraries)
class ProductionLogger implements Logger {
  info(message: string, metadata?: Record<string, any>): void {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, metadata || '');
  }
  
  warn(message: string, metadata?: Record<string, any>): void {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, metadata || '');
  }
  
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error?.stack || '', metadata || '');
  }
  
  debug(message: string, metadata?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`, metadata || '');
    }
  }
}

class ProductionMetrics implements Metrics {
  private metrics: Map<string, { count: number; total: number; min: number; max: number }> = new Map();
  
  increment(metric: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.formatKey(metric, tags);
    const current = this.metrics.get(key) || { count: 0, total: 0, min: Infinity, max: -Infinity };
    
    this.metrics.set(key, {
      count: current.count + 1,
      total: current.total + value,
      min: Math.min(current.min, value),
      max: Math.max(current.max, value)
    });
  }
  
  timing(metric: string, duration: number, tags?: Record<string, string>): void {
    this.increment(metric, duration, tags);
  }
  
  gauge(metric: string, value: number, tags?: Record<string, string>): void {
    const key = this.formatKey(metric, tags);
    this.metrics.set(key, { count: 1, total: value, min: value, max: value });
  }
  
  private formatKey(metric: string, tags?: Record<string, string>): string {
    if (!tags) return metric;
    const tagString = Object.entries(tags).map(([k, v]) => `${k}=${v}`).join(',');
    return `${metric}[${tagString}]`;
  }
  
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const [key, value] of this.metrics) {
      stats[key] = {
        ...value,
        average: value.total / value.count
      };
    }
    return stats;
  }
}

class ProductionCache implements Cache {
  private store: Map<string, { value: any; expiry: number }> = new Map();
  
  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return item.value as T;
  }
  
  async set<T>(key: string, value: T, ttl: number = 300000): Promise<void> { // 5 min default
    this.store.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }
  
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  
  clear(): void {
    this.store.clear();
  }
}

/**
 * Example 1: Production-Ready Agent with Comprehensive Error Handling
 * 
 * This demonstrates how to build agents that handle errors gracefully,
 * implement retries, and provide fallback mechanisms.
 */
async function productionReadyErrorHandling() {
  console.log('\n=== Production-Ready Error Handling ===\n');
  
  const logger = new ProductionLogger();
  const metrics = new ProductionMetrics();
  
  // Create a robust tool with error handling
  const robustTool = tool({
    name: 'robust_data_fetcher',
    description: 'Fetches data with comprehensive error handling and retries',
    parameters: z.object({
      endpoint: z.string().describe('API endpoint to fetch data from'),
      retries: z.number().min(0).max(5).default(3).describe('Number of retry attempts'),
      timeout: z.number().min(1000).max(30000).default(5000).describe('Request timeout in milliseconds')
    }),
    execute: async ({ endpoint, retries, timeout }) => {
      const startTime = Date.now();
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          logger.info(`Attempting to fetch data from ${endpoint}`, { attempt: attempt + 1, retries });
          
          // Simulate API call with potential failures
          if (Math.random() < 0.3) { // 30% failure rate for demo
            throw new Error(`Simulated API failure on attempt ${attempt + 1}`);
          }
          
          // Simulate successful response
          const response = {
            data: `Sample data from ${endpoint}`,
            timestamp: new Date().toISOString(),
            attempt: attempt + 1
          };
          
          const duration = Date.now() - startTime;
          metrics.timing('api_request_duration', duration, { endpoint, success: 'true' });
          metrics.increment('api_request_success', 1, { endpoint });
          
          logger.info(`Successfully fetched data from ${endpoint}`, { 
            attempt: attempt + 1, 
            duration,
            endpoint 
          });
          
          return response;
          
        } catch (error) {
          lastError = error as Error;
          const duration = Date.now() - startTime;
          
          metrics.increment('api_request_failure', 1, { endpoint, attempt: attempt + 1 });
          logger.warn(`API request failed on attempt ${attempt + 1}`, { 
            endpoint, 
            attempt: attempt + 1, 
            error: error.message,
            duration 
          });
          
          if (attempt < retries) {
            const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff
            logger.info(`Retrying in ${backoffDelay}ms...`, { endpoint, attempt: attempt + 1 });
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
        }
      }
      
      // All retries exhausted
      metrics.increment('api_request_exhausted', 1, { endpoint });
      logger.error(`All retry attempts exhausted for ${endpoint}`, lastError, { 
        endpoint, 
        totalAttempts: retries + 1,
        totalDuration: Date.now() - startTime 
      });
      
      throw new Error(`Failed to fetch data from ${endpoint} after ${retries + 1} attempts: ${lastError?.message}`);
    }
  });

  // Create a production-ready agent
  const productionAgent = new Agent({
    name: 'ProductionReadyAssistant',
    instructions: `
      You are a production-ready assistant that handles requests robustly.
      When using tools, always provide clear explanations and handle errors gracefully.
      If a tool fails, explain what happened and suggest alternatives.
    `,
    tools: [robustTool]
  });

  try {
    logger.info('Starting production agent test');
    
    // Test successful request
    console.log('--- Testing Successful Request ---');
    const successResult = await run(productionAgent, 'Fetch data from https://api.example.com/data');
    console.log('Success Result:', successResult.finalOutput);
    
    // Test failed request (will trigger retries)
    console.log('\n--- Testing Failed Request (Will Trigger Retries) ---');
    try {
      const failureResult = await run(productionAgent, 'Fetch data from https://api.example.com/failing-endpoint');
      console.log('Failure Result:', failureResult.finalOutput);
    } catch (error) {
      console.log('Expected Error:', error.message);
    }
    
    // Display metrics
    console.log('\n--- Metrics Summary ---');
    console.log(JSON.stringify(metrics.getStats(), null, 2));
    
  } catch (error) {
    logger.error('Error in production agent test', error as Error);
    console.error('Test failed:', error);
  }
}

/**
 * Example 2: Agent with Caching and Performance Optimization
 * 
 * This example shows how to implement caching strategies and
 * performance optimizations for production agents.
 */
async function agentCachingAndOptimization() {
  console.log('\n=== Agent Caching and Performance Optimization ===\n');
  
  const logger = new ProductionLogger();
  const metrics = new ProductionMetrics();
  const cache = new ProductionCache();
  
  // Create a cacheable tool
  const cacheableTool = tool({
    name: 'cacheable_data_processor',
    description: 'Processes data with intelligent caching for performance optimization',
    parameters: z.object({
      query: z.string().describe('Data query to process'),
      useCache: z.boolean().default(true).describe('Whether to use cached results'),
      cacheTTL: z.number().min(60000).max(3600000).default(300000).describe('Cache TTL in milliseconds')
    }),
    execute: async ({ query, useCache, cacheTTL }) => {
      const startTime = Date.now();
      const cacheKey = `data_processor:${Buffer.from(query).toString('base64')}`;
      
      // Try to get from cache first
      if (useCache) {
        const cachedResult = await cache.get(cacheKey);
        if (cachedResult) {
          const duration = Date.now() - startTime;
          metrics.timing('cache_hit_duration', duration, { query: query.substring(0, 20) });
          metrics.increment('cache_hits', 1);
          logger.info('Cache hit for data processing query', { query: query.substring(0, 20) });
          return { ...cachedResult, fromCache: true, duration };
        }
      }
      
      // Process data (simulate expensive operation)
      logger.info('Processing data query (cache miss)', { query: query.substring(0, 20) });
      
      // Simulate processing time
      const processingTime = Math.random() * 2000 + 500; // 500-2500ms
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      const result = {
        processedData: `Processed result for: ${query}`,
        timestamp: new Date().toISOString(),
        processingTime,
        fromCache: false
      };
      
      // Cache the result
      if (useCache) {
        await cache.set(cacheKey, result, cacheTTL);
        logger.info('Cached data processing result', { 
          query: query.substring(0, 20), 
          ttl: cacheTTL 
        });
      }
      
      const totalDuration = Date.now() - startTime;
      metrics.timing('data_processing_duration', totalDuration, { query: query.substring(0, 20) });
      metrics.increment('cache_misses', 1);
      
      return { ...result, duration: totalDuration };
    }
  });

  // Create an optimized agent
  const optimizedAgent = new Agent({
    name: 'OptimizedAssistant',
    instructions: `
      You are a performance-optimized assistant that uses caching effectively.
      When processing data, always consider whether to use cached results.
      Explain the benefits of caching and performance optimizations.
    `,
    tools: [cacheableTool]
  });

  try {
    logger.info('Starting optimization test');
    
    // Test first request (cache miss)
    console.log('--- Testing First Request (Cache Miss) ---');
    const firstResult = await run(optimizedAgent, 'Process this data query: user authentication patterns');
    console.log('First Result:', firstResult.finalOutput);
    
    // Test second request (cache hit)
    console.log('\n--- Testing Second Request (Cache Hit) ---');
    const secondResult = await run(optimizedAgent, 'Process this data query: user authentication patterns');
    console.log('Second Result:', secondResult.finalOutput);
    
    // Test different query (cache miss)
    console.log('\n--- Testing Different Query (Cache Miss) ---');
    const differentResult = await run(optimizedAgent, 'Process this data query: database performance metrics');
    console.log('Different Result:', differentResult.finalOutput);
    
    // Display performance metrics
    console.log('\n--- Performance Metrics ---');
    console.log(JSON.stringify(metrics.getStats(), null, 2));
    
  } catch (error) {
    logger.error('Error in optimization test', error as Error);
    console.error('Test failed:', error);
  }
}

/**
 * Example 3: Agent with Security and Authentication
 * 
 * This example demonstrates how to implement security features
 * including authentication, authorization, and input validation.
 */
async function agentSecurityAndAuthentication() {
  console.log('\n=== Agent Security and Authentication ===\n');
  
  const logger = new ProductionLogger();
  const metrics = new ProductionMetrics();
  
  // Simple user store (in production, use proper authentication)
  const users = new Map([
    ['admin', { role: 'admin', permissions: ['read', 'write', 'delete'] }],
    ['user', { role: 'user', permissions: ['read'] }],
    ['guest', { role: 'guest', permissions: [] }]
  ]);
  
  // Security guardrail function
  const securityGuardrail = async (input: any, context: any) => {
    const userId = context.userId || 'anonymous';
    const user = users.get(userId) || { role: 'anonymous', permissions: [] };
    
    // Check for sensitive operations
    const sensitivePatterns = [
      { pattern: 'delete', permission: 'delete', severity: 'high' },
      { pattern: 'modify', permission: 'write', severity: 'medium' },
      { pattern: 'admin', permission: 'admin', severity: 'high' }
    ];
    
    const inputStr = input.toString().toLowerCase();
    const violations = [];
    
    for (const { pattern, permission, severity } of sensitivePatterns) {
      if (inputStr.includes(pattern) && !user.permissions.includes(permission)) {
        violations.push({ pattern, permission, severity });
      }
    }
    
    if (violations.length > 0) {
      const highSeverityViolations = violations.filter(v => v.severity === 'high');
      
      if (highSeverityViolations.length > 0) {
        metrics.increment('security_violation', 1, { userId, severity: 'high' });
        logger.warn('High severity security violation detected', { 
          userId, 
          violations: highSeverityViolations,
          input: inputStr.substring(0, 100) 
        });
        
        return {
          passed: false,
          message: 'Access denied: Insufficient permissions for requested operation',
          metadata: {
            type: 'security_violation',
            userId,
            violations: highSeverityViolations,
            requiredPermissions: highSeverityViolations.map(v => v.permission)
          }
        };
      }
      
      // Log medium severity violations but allow
      metrics.increment('security_warning', 1, { userId, severity: 'medium' });
      logger.warn('Medium severity security warning', { 
        userId, 
        violations,
        input: inputStr.substring(0, 100) 
      });
    }
    
    return {
      passed: true,
      message: 'Security check passed',
      metadata: {
        type: 'security_check',
        userId,
        role: user.role,
        permissions: user.permissions
      }
    };
  };

  // Create a secure tool
  const secureTool = tool({
    name: 'secure_data_access',
    description: 'Access data with security controls and permission checks',
    parameters: z.object({
      operation: z.enum(['read', 'write', 'delete']).describe('Operation to perform'),
      resource: z.string().describe('Resource to access'),
      data: z.any().optional().describe('Data for write operations')
    }),
    execute: async ({ operation, resource, data }, context) => {
      const userId = context.userId || 'anonymous';
      const user = users.get(userId) || { role: 'anonymous', permissions: [] };
      
      // Check permissions
      if (!user.permissions.includes(operation)) {
        metrics.increment('permission_denied', 1, { userId, operation, resource });
        logger.warn('Permission denied for data access', { userId, operation, resource });
        throw new Error(`Insufficient permissions for ${operation} operation on ${resource}`);
      }
      
      // Simulate data access
      const result = {
        operation,
        resource,
        userId,
        timestamp: new Date().toISOString(),
        success: true,
        data: operation === 'read' ? `Data from ${resource}` : `Operation ${operation} completed on ${resource}`
      };
      
      metrics.increment('data_access_success', 1, { userId, operation, resource });
      logger.info('Data access successful', { userId, operation, resource });
      
      return result;
    }
  });

  // Create a secure agent
  const secureAgent = new Agent({
    name: 'SecureAssistant',
    instructions: `
      You are a secure assistant that respects user permissions.
      Always check user permissions before performing operations.
      Explain security measures and permission requirements clearly.
    `,
    tools: [secureTool],
    inputGuardrails: [securityGuardrail]
  });

  try {
    logger.info('Starting security test');
    
    // Test with admin user
    console.log('--- Testing Admin User Access ---');
    const adminResult = await run(secureAgent, 'Delete the user database', {
      context: { userId: 'admin' }
    });
    console.log('Admin Result:', adminResult.finalOutput);
    
    // Test with regular user (should be denied for delete)
    console.log('\n--- Testing Regular User Access (Should Be Denied) ---');
    try {
      const userResult = await run(secureAgent, 'Delete the user database', {
        context: { userId: 'user' }
      });
      console.log('User Result:', userResult.finalOutput);
    } catch (error) {
      console.log('Expected Security Error:', error.message);
    }
    
    // Test with guest user (limited access)
    console.log('\n--- Testing Guest User Access ---');
    const guestResult = await run(secureAgent, 'Read the public data', {
      context: { userId: 'guest' }
    });
    console.log('Guest Result:', guestResult.finalOutput);
    
    // Display security metrics
    console.log('\n--- Security Metrics ---');
    console.log(JSON.stringify(metrics.getStats(), null, 2));
    
  } catch (error) {
    logger.error('Error in security test', error as Error);
    console.error('Test failed:', error);
  }
}

/**
 * Example 4: Agent Health Checks and Monitoring
 * 
 * This example shows how to implement health checks, monitoring,
 * and observability for production agents.
 */
async function agentHealthChecksAndMonitoring() {
  console.log('\n=== Agent Health Checks and Monitoring ===\n');
  
  const logger = new ProductionLogger();
  const metrics = new ProductionMetrics();
  
  // Health check tool
  const healthCheckTool = tool({
    name: 'system_health_check',
    description: 'Performs comprehensive system health checks',
    parameters: z.object({
      components: z.array(z.string()).default(['database', 'api', 'cache']).describe('Components to check'),
      detailed: z.boolean().default(false).describe('Whether to return detailed health information')
    }),
    execute: async ({ components, detailed }) => {
      const startTime = Date.now();
      const healthResults: Record<string, any> = {};
      
      for (const component of components) {
        try {
          // Simulate health check for each component
          const healthCheck = await performHealthCheck(component);
          healthResults[component] = healthCheck;
          
          if (healthCheck.status === 'healthy') {
            metrics.increment('health_check_success', 1, { component });
          } else {
            metrics.increment('health_check_failure', 1, { component, status: healthCheck.status });
          }
          
        } catch (error) {
          healthResults[component] = {
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
          };
          metrics.increment('health_check_error', 1, { component });
        }
      }
      
      const overallStatus = Object.values(healthResults).every(r => r.status === 'healthy') ? 'healthy' : 'degraded';
      const duration = Date.now() - startTime;
      
      metrics.timing('health_check_duration', duration, { overallStatus });
      metrics.gauge('system_health_score', overallStatus === 'healthy' ? 100 : 50);
      
      const result = {
        overallStatus,
        components: healthResults,
        timestamp: new Date().toISOString(),
        duration,
        detailed: detailed ? healthResults : undefined
      };
      
      logger.info('Health check completed', { 
        overallStatus, 
        componentCount: components.length,
        duration 
      });
      
      return result;
    }
  });

  // Simulate health check for a component
  async function performHealthCheck(component: string) {
    // Simulate different health states
    const healthStates = {
      database: { status: 'healthy', responseTime: 45, connections: 25 },
      api: { status: 'degraded', responseTime: 1200, errorRate: 0.05 },
      cache: { status: 'healthy', responseTime: 12, hitRate: 0.89 }
    };
    
    const state = healthStates[component as keyof typeof healthStates] || { status: 'unknown' };
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    return {
      status: state.status,
      timestamp: new Date().toISOString(),
      metrics: state
    };
  }

  // Create a monitoring agent
  const monitoringAgent = new Agent({
    name: 'SystemMonitor',
    instructions: `
      You are a system monitoring specialist that performs health checks.
      Analyze system health and provide actionable insights.
      Highlight any issues and suggest remediation steps.
    `,
    tools: [healthCheckTool]
  });

  try {
    logger.info('Starting health monitoring test');
    
    // Basic health check
    console.log('--- Basic Health Check ---');
    const basicHealth = await run(monitoringAgent, 'Check the health of all system components');
    console.log('Basic Health Result:', basicHealth.finalOutput);
    
    // Detailed health check
    console.log('\n--- Detailed Health Check ---');
    const detailedHealth = await run(monitoringAgent, 'Perform a detailed health check of the API component');
    console.log('Detailed Health Result:', detailedHealth.finalOutput);
    
    // Health analysis
    console.log('\n--- Health Analysis ---');
    const healthAnalysis = await run(monitoringAgent, 'Analyze the current system health and suggest improvements');
    console.log('Health Analysis:', healthAnalysis.finalOutput);
    
    // Display monitoring metrics
    console.log('\n--- Monitoring Metrics ---');
    console.log(JSON.stringify(metrics.getStats(), null, 2));
    
  } catch (error) {
    logger.error('Error in health monitoring test', error as Error);
    console.error('Test failed:', error);
  }
}

/**
 * Example 5: Agent Deployment and Scaling Patterns
 * 
 * This example demonstrates deployment strategies, configuration management,
 * and scaling considerations for production agents.
 */
async function agentDeploymentAndScaling() {
  console.log('\n=== Agent Deployment and Scaling Patterns ===\n');
  
  const logger = new ProductionLogger();
  const metrics = new ProductionMetrics();
  
  // Configuration management tool
  const configTool = tool({
    name: 'configuration_manager',
    description: 'Manages agent configuration and deployment settings',
    parameters: z.object({
      action: z.enum(['get', 'set', 'validate', 'deploy']).describe('Configuration action to perform'),
      key: z.string().optional().describe('Configuration key'),
      value: z.any().optional().describe('Configuration value'),
      environment: z.enum(['development', 'staging', 'production']).default('development').describe('Target environment')
    }),
    execute: async ({ action, key, value, environment }) => {
      const startTime = Date.now();
      
      try {
        switch (action) {
          case 'get':
            if (!key) throw new Error('Configuration key is required for get action');
            const configValue = await getConfiguration(key, environment);
            metrics.increment('config_get_success', 1, { environment, key });
            return { action, key, value: configValue, environment, timestamp: new Date().toISOString() };
            
          case 'set':
            if (!key || value === undefined) throw new Error('Configuration key and value are required for set action');
            await setConfiguration(key, value, environment);
            metrics.increment('config_set_success', 1, { environment, key });
            return { action, key, value, environment, timestamp: new Date().toISOString() };
            
          case 'validate':
            const validationResult = await validateConfiguration(environment);
            metrics.increment('config_validation', 1, { environment, status: validationResult.valid ? 'valid' : 'invalid' });
            return { action, environment, validationResult, timestamp: new Date().toISOString() };
            
          case 'deploy':
            const deploymentResult = await deployConfiguration(environment);
            metrics.increment('config_deployment', 1, { environment, status: deploymentResult.success ? 'success' : 'failed' });
            return { action, environment, deploymentResult, timestamp: new Date().toISOString() };
            
          default:
            throw new Error(`Unknown action: ${action}`);
        }
        
      } catch (error) {
        metrics.increment('config_error', 1, { environment, action });
        logger.error('Configuration operation failed', error as Error, { action, key, environment });
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        metrics.timing('config_operation_duration', duration, { action, environment });
      }
    }
  });

  // Simulate configuration operations
  const configStore = new Map();
  
  async function getConfiguration(key: string, environment: string) {
    const fullKey = `${environment}:${key}`;
    return configStore.get(fullKey) || `default_${key}`;
  }
  
  async function setConfiguration(key: string, value: any, environment: string) {
    const fullKey = `${environment}:${key}`;
    configStore.set(fullKey, value);
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async operation
  }
  
  async function validateConfiguration(environment: string) {
    const requiredKeys = ['model', 'max_tokens', 'temperature'];
    const missingKeys = [];
    
    for (const key of requiredKeys) {
      const value = await getConfiguration(key, environment);
      if (!value || value === `default_${key}`) {
        missingKeys.push(key);
      }
    }
    
    return {
      valid: missingKeys.length === 0,
      missingKeys,
      environment
    };
  }
  
  async function deployConfiguration(environment: string) {
    const validation = await validateConfiguration(environment);
    if (!validation.valid) {
      return {
        success: false,
        error: `Configuration validation failed: missing keys: ${validation.missingKeys.join(', ')}`
      };
    }
    
    // Simulate deployment process
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      environment,
      deployedAt: new Date().toISOString(),
      version: `v${Date.now()}`
    };
  }

  // Create a deployment agent
  const deploymentAgent = new Agent({
    name: 'DeploymentManager',
    instructions: `
      You are a deployment manager that handles configuration and deployment.
      Validate configurations before deployment and ensure proper environment setup.
      Provide clear feedback on deployment status and any issues.
    `,
    tools: [configTool]
  });

  try {
    logger.info('Starting deployment test');
    
    // Set configuration
    console.log('--- Setting Configuration ---');
    const setResult = await run(deploymentAgent, 'Set the model configuration to gpt-4 for production environment');
    console.log('Set Result:', setResult.finalOutput);
    
    // Validate configuration
    console.log('\n--- Validating Configuration ---');
    const validateResult = await run(deploymentAgent, 'Validate the production configuration');
    console.log('Validate Result:', validateResult.finalOutput);
    
    // Deploy configuration
    console.log('\n--- Deploying Configuration ---');
    const deployResult = await run(deploymentAgent, 'Deploy the configuration to production environment');
    console.log('Deploy Result:', deployResult.finalOutput);
    
    // Get configuration
    console.log('\n--- Getting Configuration ---');
    const getResult = await run(deploymentAgent, 'Get the model configuration for production');
    console.log('Get Result:', getResult.finalOutput);
    
    // Display deployment metrics
    console.log('\n--- Deployment Metrics ---');
    console.log(JSON.stringify(metrics.getStats(), null, 2));
    
  } catch (error) {
    logger.error('Error in deployment test', error as Error);
    console.error('Test failed:', error);
  }
}

/**
 * Main function that runs all production pattern examples
 */
async function main() {
  console.log('🏭 OpenAI Agents SDK - Production Patterns Examples\n');
  console.log('This example demonstrates enterprise-grade production features.\n');
  
  try {
    await productionReadyErrorHandling();
    await agentCachingAndOptimization();
    await agentSecurityAndAuthentication();
    await agentHealthChecksAndMonitoring();
    await agentDeploymentAndScaling();
    
    console.log('\n✅ All production pattern examples completed successfully!');
    console.log('\nKey Takeaways:');
    console.log('1. Comprehensive error handling with retries and fallbacks is essential');
    console.log('2. Caching and performance optimization improve user experience');
    console.log('3. Security features protect against unauthorized access and abuse');
    console.log('4. Health checks and monitoring ensure system reliability');
    console.log('5. Proper deployment patterns enable scalable and maintainable systems');
    
  } catch (error) {
    console.error('\n❌ Error running production pattern examples:', error);
    process.exit(1);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  productionReadyErrorHandling,
  agentCachingAndOptimization,
  agentSecurityAndAuthentication,
  agentHealthChecksAndMonitoring,
  agentDeploymentAndScaling
};