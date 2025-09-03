/**
 * OpenAI Agents SDK - Comprehensive Examples Index
 * 
 * This is the main entry point for all comprehensive examples.
 * It demonstrates the full power and flexibility of the OpenAI Agents SDK
 * by showcasing every major feature and pattern.
 * 
 * To run all examples:
 * ```bash
 * pnpm tsx examples/comprehensive/index.ts
 * ```
 * 
 * To run specific categories:
 * ```bash
 * pnpm tsx examples/comprehensive/01-core-concepts/01-basic-agent.ts
 * pnpm tsx examples/comprehensive/02-advanced-patterns/01-handoffs.ts
 * pnpm tsx examples/comprehensive/04-guardrails/01-input-output-guardrails.ts
 * pnpm tsx examples/comprehensive/05-streaming-realtime/01-streaming-agents.ts
 * pnpm tsx examples/comprehensive/07-production-patterns/01-production-ready-agents.ts
 * pnpm tsx examples/comprehensive/08-integrations/01-external-integrations.ts
 * ```
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

// Import all example functions
import {
  simpleTextAgent,
  specializedAgent,
  dynamicInstructionsAgent,
  structuredOutputAgent,
  errorHandlingExample
} from './01-core-concepts/01-basic-agent';

import {
  basicFunctionTool,
  complexParameterTool,
  approvalRequiredTool,
  robustToolWithSideEffects,
  toolCompositionExample
} from './01-core-concepts/02-tools-basic';

import {
  basicHandoffExample,
  conditionalHandoffWorkflow,
  hierarchicalAgentStructure,
  dynamicHandoffSelection,
  contextEnrichmentAndSynthesis
} from './02-advanced-patterns/01-handoffs';

import {
  basicInputGuardrails,
  advancedInputValidation,
  outputContentFiltering,
  rateLimitingGuardrails,
  compositeGuardrails
} from './04-guardrails/01-input-output-guardrails';

import {
  basicStreamingAgent,
  progressiveContentGeneration,
  interactiveStreaming,
  realtimeDataProcessing,
  multiAgentStreamingWorkflow,
  streamEventMonitoring
} from './05-streaming-realtime/01-streaming-agents';

import {
  productionReadyErrorHandling,
  agentCachingAndOptimization,
  agentSecurityAndAuthentication,
  agentHealthChecksAndMonitoring,
  agentDeploymentAndScaling
} from './07-production-patterns/01-production-ready-agents';

import {
  databaseIntegrationExample,
  restApiIntegrationExample,
  fileSystemIntegrationExample,
  multiServiceIntegrationExample
} from './08-integrations/01-external-integrations';

/**
 * Master Agent Example
 * 
 * This demonstrates how to create a master agent that can coordinate
 * and orchestrate all the different types of agents and tools.
 */
async function masterAgentExample() {
  console.log('\n🎯 Master Agent Example - Orchestrating All Capabilities\n');
  
  // Create a master coordination tool
  const masterTool = tool({
    name: 'orchestrate_workflow',
    description: 'Orchestrates complex workflows using multiple agent types and capabilities',
    parameters: z.object({
      workflow_type: z.enum([
        'data_analysis',
        'content_creation',
        'system_monitoring',
        'user_support',
        'research_synthesis'
      ]).describe('Type of workflow to orchestrate'),
      complexity: z.enum(['simple', 'moderate', 'complex']).default('moderate').describe('Workflow complexity level'),
      include_streaming: z.boolean().default(true).describe('Whether to use streaming capabilities'),
      include_guardrails: z.boolean().default(true).describe('Whether to apply safety guardrails')
    }),
    execute: async ({ workflow_type, complexity, include_streaming, include_guardrails }) => {
      const startTime = Date.now();
      
      // Simulate workflow orchestration
      const workflowSteps = [];
      
      switch (workflow_type) {
        case 'data_analysis':
          workflowSteps.push(
            'Data collection and validation',
            'Statistical analysis and pattern recognition',
            'Insight generation and visualization',
            'Recommendation synthesis'
          );
          break;
          
        case 'content_creation':
          workflowSteps.push(
            'Research and information gathering',
            'Content outline and structure planning',
            'Draft creation and refinement',
            'Quality assurance and optimization'
          );
          break;
          
        case 'system_monitoring':
          workflowSteps.push(
            'Health check execution',
            'Performance metrics collection',
            'Anomaly detection and alerting',
            'Remediation planning and execution'
          );
          break;
          
        case 'user_support':
          workflowSteps.push(
            'Issue classification and routing',
            'Solution research and documentation',
            'Response generation and personalization',
            'Follow-up and satisfaction tracking'
          );
          break;
          
        case 'research_synthesis':
          workflowSteps.push(
            'Literature review and source evaluation',
            'Data extraction and synthesis',
            'Pattern identification and analysis',
            'Comprehensive report generation'
          );
          break;
      }
      
      // Simulate workflow execution
      for (const step of workflowSteps) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate processing time
      }
      
      const duration = Date.now() - startTime;
      
      return {
        workflow_type,
        complexity,
        capabilities_used: {
          streaming: include_streaming,
          guardrails: include_guardrails,
          multi_agent: true,
          tools: true,
          error_handling: true
        },
        steps_executed: workflowSteps,
        duration,
        status: 'completed',
        timestamp: new Date().toISOString()
      };
    }
  });

  // Create the master agent
  const masterAgent = new Agent({
    name: 'MasterOrchestrator',
    instructions: `
      You are a master orchestrator that can coordinate complex workflows.
      
      Your capabilities include:
      - Core agent functionality (text generation, reasoning)
      - Tool integration and execution
      - Multi-agent coordination and handoffs
      - Input/output validation and safety guardrails
      - Streaming and real-time processing
      - Production-ready error handling and monitoring
      - External service integration and data pipelines
      
      When users request complex tasks:
      1. Analyze the requirements and determine the appropriate workflow type
      2. Orchestrate the necessary agents, tools, and capabilities
      3. Ensure proper error handling, validation, and monitoring
      4. Provide comprehensive results with clear explanations
      
      Always explain what capabilities you're using and why they're appropriate for each task.
    `,
    tools: [masterTool]
  });

  try {
    console.log('🚀 Starting Master Agent Demonstration...\n');
    
    // Demonstrate complex workflow orchestration
    const workflowRequest = `
      I need a comprehensive analysis of our system performance that includes:
      - Real-time monitoring and health checks
      - Data analysis from multiple sources
      - Content generation for executive reports
      - Integration with external monitoring services
      
      Please orchestrate this as a complex workflow with streaming capabilities
      and full safety guardrails enabled.
    `;
    
    console.log('--- Complex Workflow Request ---');
    const result = await run(masterAgent, workflowRequest);
    console.log('Master Agent Response:', result.finalOutput);
    
    // Demonstrate simpler workflow
    console.log('\n--- Simple Workflow Request ---');
    const simpleRequest = 'Create a simple content creation workflow for a blog post about AI agents';
    const simpleResult = await run(masterAgent, simpleRequest);
    console.log('Simple Workflow Result:', simpleResult.finalOutput);
    
  } catch (error) {
    console.error('Error in master agent example:', error);
  }
}

/**
 * Capability Showcase
 * 
 * This demonstrates all the major capabilities of the SDK
 * in a single, comprehensive example.
 */
async function capabilityShowcase() {
  console.log('\n🌟 SDK Capability Showcase\n');
  
  console.log('📚 Core Concepts:');
  console.log('✅ Basic agent creation and configuration');
  console.log('✅ Dynamic instructions and structured outputs');
  console.log('✅ Comprehensive error handling');
  
  console.log('\n🔧 Tool System:');
  console.log('✅ Function tools with Zod schemas');
  console.log('✅ Tool approval workflows');
  console.log('✅ Tool composition and chaining');
  
  console.log('\n🔄 Advanced Patterns:');
  console.log('✅ Multi-agent workflows with handoffs');
  console.log('✅ Hierarchical agent structures');
  console.log('✅ Dynamic agent selection');
  
  console.log('\n🛡️ Guardrails & Safety:');
  console.log('✅ Input validation and sanitization');
  console.log('✅ Output content filtering');
  console.log('✅ Rate limiting and usage controls');
  
  console.log('\n🌊 Streaming & Real-time:');
  console.log('✅ Real-time response generation');
  console.log('✅ Progressive content delivery');
  console.log('✅ Multi-agent streaming workflows');
  
  console.log('\n🏭 Production Patterns:');
  console.log('✅ Comprehensive error handling and retries');
  console.log('✅ Performance optimization and caching');
  console.log('✅ Security and authentication');
  console.log('✅ Health checks and monitoring');
  
  console.log('\n🔗 External Integrations:');
  console.log('✅ Database and API integrations');
  console.log('✅ File system operations');
  console.log('✅ Multi-service data pipelines');
  
  console.log('\n🎯 Key Benefits:');
  console.log('✅ Full feature parity with Python SDK');
  console.log('✅ Modern JavaScript/TypeScript syntax');
  console.log('✅ Comprehensive composability');
  console.log('✅ Production-ready architecture');
  console.log('✅ Extensive documentation and examples');
}

/**
 * Quick Start Guide
 * 
 * Provides a quick overview of how to get started with the SDK.
 */
async function quickStartGuide() {
  console.log('\n🚀 Quick Start Guide\n');
  
  console.log('1. Installation:');
  console.log('   npm install @openai/agents');
  console.log('   # or');
  console.log('   pnpm add @openai/agents');
  
  console.log('\n2. Basic Usage:');
  console.log('   import { Agent, run } from "@openai/agents";');
  console.log('   ');
  console.log('   const agent = new Agent({');
  console.log('     name: "MyAgent",');
  console.log('     instructions: "You are a helpful assistant."');
  console.log('   });');
  console.log('   ');
  console.log('   const result = await run(agent, "Hello!");');
  
  console.log('\n3. Adding Tools:');
  console.log('   import { tool } from "@openai/agents";');
  console.log('   ');
  console.log('   const myTool = tool({');
  console.log('     name: "my_tool",');
  console.log('     description: "A helpful tool",');
  console.log('     parameters: z.object({...}),');
  console.log('     execute: async (params) => { ... }');
  console.log('   });');
  
  console.log('\n4. Running Examples:');
  console.log('   # Run all examples');
  console.log('   pnpm tsx examples/comprehensive/index.ts');
  console.log('   ');
  console.log('   # Run specific examples');
  console.log('   pnpm tsx examples/comprehensive/01-core-concepts/01-basic-agent.ts');
  
  console.log('\n5. Environment Setup:');
  console.log('   export OPENAI_API_KEY="your-api-key-here"');
  console.log('   export NODE_ENV="development"');
}

/**
 * Main function that runs the comprehensive demonstration
 */
async function main() {
  console.log('🎉 OpenAI Agents SDK - Comprehensive Examples\n');
  console.log('This demonstration showcases the full power and capabilities of the SDK.\n');
  
  try {
    // Show capabilities overview
    await capabilityShowcase();
    
    // Provide quick start guide
    await quickStartGuide();
    
    // Demonstrate master agent
    await masterAgentExample();
    
    console.log('\n🎯 SDK Demonstration Complete!');
    console.log('\n📖 Next Steps:');
    console.log('1. Explore individual example files for detailed implementations');
    console.log('2. Modify examples to test different configurations');
    console.log('3. Build your own agents using the patterns demonstrated');
    console.log('4. Check the official documentation for advanced features');
    console.log('5. Join the community for support and collaboration');
    
    console.log('\n🔗 Resources:');
    console.log('- Official Documentation: https://openai.github.io/openai-agents-js/');
    console.log('- GitHub Repository: https://github.com/openai/openai-agents-js');
    console.log('- Python SDK (for comparison): https://github.com/openai/openai-agents-python');
    
  } catch (error) {
    console.error('\n❌ Error in comprehensive demonstration:', error);
    process.exit(1);
  }
}

// Run the comprehensive demonstration if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  masterAgentExample,
  capabilityShowcase,
  quickStartGuide,
  // Core concepts
  simpleTextAgent,
  specializedAgent,
  dynamicInstructionsAgent,
  structuredOutputAgent,
  errorHandlingExample,
  // Tools
  basicFunctionTool,
  complexParameterTool,
  approvalRequiredTool,
  robustToolWithSideEffects,
  toolCompositionExample,
  // Advanced patterns
  basicHandoffExample,
  conditionalHandoffWorkflow,
  hierarchicalAgentStructure,
  dynamicHandoffSelection,
  contextEnrichmentAndSynthesis,
  // Guardrails
  basicInputGuardrails,
  advancedInputValidation,
  outputContentFiltering,
  rateLimitingGuardrails,
  compositeGuardrails,
  // Streaming
  basicStreamingAgent,
  progressiveContentGeneration,
  interactiveStreaming,
  realtimeDataProcessing,
  multiAgentStreamingWorkflow,
  streamEventMonitoring,
  // Production patterns
  productionReadyErrorHandling,
  agentCachingAndOptimization,
  agentSecurityAndAuthentication,
  agentHealthChecksAndMonitoring,
  agentDeploymentAndScaling,
  // Integrations
  databaseIntegrationExample,
  restApiIntegrationExample,
  fileSystemIntegrationExample,
  multiServiceIntegrationExample
};