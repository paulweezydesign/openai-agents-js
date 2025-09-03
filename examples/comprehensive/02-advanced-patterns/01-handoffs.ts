/**
 * Agent Handoffs Example
 * 
 * This example demonstrates how to create multi-agent workflows using handoffs.
 * Handoffs allow agents to transfer control to other agents, enabling:
 * 
 * - Specialized agent delegation
 * - Complex workflow orchestration
 * - Separation of concerns
 * - Dynamic agent selection
 * - Hierarchical agent structures
 * 
 * Key Concepts:
 * - Handoff: Transfer of control from one agent to another
 * - Agent Composition: Building complex systems from simple agents
 * - Workflow Orchestration: Coordinating multiple agents
 * - Context Passing: Sharing information between agents
 * - Dynamic Routing: Choosing agents based on context
 */

import { Agent, run, handoff } from '@openai/agents';
import { z } from 'zod';

/**
 * Example 1: Basic Handoff Between Specialized Agents
 * 
 * This demonstrates the simplest form of handoff - one agent
 * delegating a specific task to another specialized agent.
 */
async function basicHandoffExample() {
  console.log('\n=== Basic Handoff Example ===\n');
  
  // Create a specialized math agent
  const mathAgent = new Agent({
    name: 'MathSpecialist',
    instructions: `
      You are a math specialist. You excel at:
      - Complex mathematical calculations
      - Mathematical proofs and explanations
      - Statistical analysis
      - Mathematical modeling
      
      Always show your work and explain your reasoning step by step.
      Use mathematical notation when appropriate.
    `,
    handoffDescription: 'Expert in mathematics, calculations, and mathematical reasoning'
  });

  // Create a general assistant that can hand off math problems
  const generalAssistant = new Agent({
    name: 'GeneralAssistant',
    instructions: `
      You are a general assistant that helps with various tasks.
      When you encounter complex mathematical problems, hand them off to the MathSpecialist.
      For other tasks, handle them yourself.
      
      Always explain what you're doing and why you're making decisions.
    `,
    handoffs: [mathAgent]
  });

  try {
    // Test a general question
    console.log('--- General Question ---');
    const generalResult = await run(generalAssistant, 'What is the capital of France?');
    console.log('General Response:', generalResult.finalOutput);

    // Test a math question that should trigger handoff
    console.log('\n--- Math Question (Should Trigger Handoff) ---');
    const mathResult = await run(generalAssistant, 'Solve the quadratic equation x² + 5x + 6 = 0');
    console.log('Math Response:', mathResult.finalOutput);
    
  } catch (error) {
    console.error('Error running handoff example:', error);
  }
}

/**
 * Example 2: Multi-Agent Workflow with Conditional Handoffs
 * 
 * This example shows how to create a workflow where different agents
 * handle different types of tasks based on content analysis.
 */
async function conditionalHandoffWorkflow() {
  console.log('\n=== Conditional Handoff Workflow ===\n');
  
  // Create specialized agents for different domains
  const codeReviewAgent = new Agent({
    name: 'CodeReviewer',
    instructions: `
      You are an expert code reviewer with 15+ years of experience.
      Focus on:
      - Code quality and best practices
      - Security vulnerabilities
      - Performance optimizations
      - Maintainability and readability
      
      Provide specific, actionable feedback with examples.
    `,
    handoffDescription: 'Expert code reviewer for software development tasks'
  });

  const dataAnalysisAgent = new Agent({
    name: 'DataAnalyst',
    instructions: `
      You are a data analyst specializing in:
      - Statistical analysis
      - Data visualization recommendations
      - Trend identification
      - Predictive modeling
      
      Always provide insights and actionable recommendations.
    `,
    handoffDescription: 'Data analysis and statistical expertise'
  });

  const writingAgent = new Agent({
    name: 'WritingSpecialist',
    instructions: `
      You are a writing specialist who excels at:
      - Content creation and editing
      - Grammar and style improvement
      - Tone and voice adjustment
      - Structure and flow optimization
      
      Provide clear, engaging, and well-structured content.
    `,
    handoffDescription: 'Writing, editing, and content creation expertise'
  });

  // Create a router agent that analyzes requests and delegates appropriately
  const routerAgent = new Agent({
    name: 'TaskRouter',
    instructions: `
      You are a task router that analyzes incoming requests and delegates them
      to the most appropriate specialist agent.
      
      Routing rules:
      - Code-related tasks → CodeReviewer
      - Data analysis tasks → DataAnalyst  
      - Writing/content tasks → WritingSpecialist
      - General questions → Handle yourself
      
      Always explain your routing decision and what you expect from the specialist.
    `,
    handoffs: [codeReviewAgent, dataAnalysisAgent, writingAgent]
  });

  try {
    const testCases = [
      {
        description: 'Code Review Request',
        input: 'Please review this Python function for best practices:\n\ndef calculate_fibonacci(n):\n    if n <= 1:\n        return n\n    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)'
      },
      {
        description: 'Data Analysis Request',
        input: 'I have sales data for Q1-Q4. Can you help me analyze trends and identify seasonal patterns?'
      },
      {
        description: 'Writing Request',
        input: 'I need help writing a professional email to a client about a project delay.'
      },
      {
        description: 'General Question',
        input: 'What are the benefits of using version control in software development?'
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n--- ${testCase.description} ---`);
      const result = await run(routerAgent, testCase.input);
      console.log('Router Response:', result.finalOutput);
    }
    
  } catch (error) {
    console.error('Error running conditional handoff workflow:', error);
  }
}

/**
 * Example 3: Hierarchical Agent Structure with Context Passing
 * 
 * This example demonstrates a hierarchical structure where agents
 * can hand off to sub-agents and pass context between them.
 */
async function hierarchicalAgentStructure() {
  console.log('\n=== Hierarchical Agent Structure ===\n');
  
  // Create leaf-level specialized agents
  const frontendAgent = new Agent({
    name: 'FrontendDeveloper',
    instructions: `
      You are a frontend developer specializing in:
      - React, Vue, Angular frameworks
      - CSS and responsive design
      - User experience optimization
      - Frontend performance
      
      Provide specific code examples and best practices.
    `,
    handoffDescription: 'Frontend development and UI/UX expertise'
  });

  const backendAgent = new Agent({
    name: 'BackendDeveloper',
    instructions: `
      You are a backend developer specializing in:
      - API design and development
      - Database design and optimization
      - Server architecture
      - Security and authentication
      
      Provide architectural guidance and implementation details.
    `,
    handoffDescription: 'Backend development and system architecture expertise'
  });

  const devopsAgent = new Agent({
    name: 'DevOpsEngineer',
    instructions: `
      You are a DevOps engineer specializing in:
      - CI/CD pipelines
      - Infrastructure as code
      - Container orchestration
      - Monitoring and logging
      
      Provide deployment and operational guidance.
    `,
    handoffDescription: 'DevOps, deployment, and infrastructure expertise'
  });

  // Create a team lead agent that coordinates specialists
  const teamLeadAgent = new Agent({
    name: 'DevelopmentTeamLead',
    instructions: `
      You are a development team lead who coordinates with specialists.
      When technical questions arise:
      1. Analyze the request to identify the domain
      2. Hand off to the appropriate specialist
      3. Synthesize their responses into a cohesive plan
      4. Provide high-level guidance and next steps
      
      Always maintain project context and ensure consistency across responses.
    `,
    handoffs: [frontendAgent, backendAgent, devopsAgent]
  });

  // Create a project manager agent that works with the team lead
  const projectManagerAgent = new Agent({
    name: 'ProjectManager',
    instructions: `
      You are a project manager who oversees development projects.
      You work with the development team lead to:
      - Understand technical requirements
      - Estimate timelines and resources
      - Identify risks and dependencies
      - Coordinate stakeholder communication
      
      When technical details are needed, hand off to the team lead.
    `,
    handoffs: [teamLeadAgent]
  });

  try {
    const projectRequest = `
      We need to build a new e-commerce platform with:
      - User authentication and profiles
      - Product catalog and search
      - Shopping cart and checkout
      - Admin dashboard
      - Mobile-responsive design
      
      Please provide:
      1. Technical architecture overview
      2. Development timeline estimate
      3. Resource requirements
      4. Risk assessment
    `;

    console.log('--- Project Request ---');
    const result = await run(projectManagerAgent, projectRequest);
    console.log('Project Manager Response:', result.finalOutput);
    
  } catch (error) {
    console.error('Error running hierarchical agent structure:', error);
  }
}

/**
 * Example 4: Dynamic Handoff Selection with Context Analysis
 * 
 * This example shows how to create agents that dynamically choose
 * which specialist to hand off to based on content analysis.
 */
async function dynamicHandoffSelection() {
  console.log('\n=== Dynamic Handoff Selection ===\n');
  
  // Create specialized agents for different content types
  const technicalWriterAgent = new Agent({
    name: 'TechnicalWriter',
    instructions: `
      You are a technical writer who specializes in:
      - Technical documentation
      - API documentation
      - User manuals and guides
      - Process documentation
      
      Write clear, concise, and well-structured technical content.
    `,
    handoffDescription: 'Technical writing and documentation expertise'
  });

  const creativeWriterAgent = new Agent({
    name: 'CreativeWriter',
    instructions: `
      You are a creative writer who excels at:
      - Storytelling and narratives
      - Marketing copy and advertisements
      - Creative content and entertainment
      - Emotional engagement
      
      Create engaging, imaginative, and compelling content.
    `,
    handoffDescription: 'Creative writing and storytelling expertise'
  });

  const businessWriterAgent = new Agent({
    name: 'BusinessWriter',
    instructions: `
      You are a business writer who specializes in:
      - Business proposals and reports
      - Executive summaries
      - Marketing materials
      - Professional communications
      
      Write professional, persuasive, and business-focused content.
    `,
    handoffDescription: 'Business writing and professional communication expertise'
  });

  // Create a content analyzer that dynamically selects the best writer
  const contentAnalyzerAgent = new Agent({
    name: 'ContentAnalyzer',
    instructions: `
      You are a content analyzer that determines the best writing specialist
      for different types of content requests.
      
      Analysis criteria:
      - Technical content → TechnicalWriter
      - Creative/storytelling content → CreativeWriter
      - Business/professional content → BusinessWriter
      - Mixed content → Choose the primary focus
      
      Always explain your analysis and why you chose a particular specialist.
      Provide context about the content type and expected outcome.
    `,
    handoffs: [technicalWriterAgent, creativeWriterAgent, businessWriterAgent]
  });

  try {
    const contentRequests = [
      {
        description: 'Technical Documentation',
        input: 'I need documentation for a REST API that handles user authentication. Include endpoint descriptions, request/response examples, and error codes.'
      },
      {
        description: 'Creative Story',
        input: 'Write a short story about a robot learning to paint. Make it emotional and inspiring, suitable for children.'
      },
      {
        description: 'Business Proposal',
        input: 'Create a business proposal for implementing a new customer relationship management system. Include cost-benefit analysis and implementation timeline.'
      },
      {
        description: 'Mixed Content (Technical + Business)',
        input: 'I need both technical specifications and business justification for upgrading our database infrastructure. Include technical details and ROI analysis.'
      }
    ];

    for (const request of contentRequests) {
      console.log(`\n--- ${request.description} ---`);
      const result = await run(contentAnalyzerAgent, request.input);
      console.log('Content Analyzer Response:', result.finalOutput);
    }
    
  } catch (error) {
    console.error('Error running dynamic handoff selection:', error);
  }
}

/**
 * Example 5: Handoff with Context Enrichment and Result Synthesis
 * 
 * This example demonstrates how to pass rich context between agents
 * and synthesize results from multiple specialists.
 */
async function contextEnrichmentAndSynthesis() {
  console.log('\n=== Context Enrichment and Result Synthesis ===\n');
  
  // Create domain-specific analysis agents
  const securityAgent = new Agent({
    name: 'SecurityAnalyst',
    instructions: `
      You are a cybersecurity analyst specializing in:
      - Security threat assessment
      - Vulnerability analysis
      - Security best practices
      - Compliance requirements
      
      Always provide risk ratings and mitigation strategies.
    `,
    handoffDescription: 'Cybersecurity and security analysis expertise'
  });

  const performanceAgent = new Agent({
    name: 'PerformanceEngineer',
    instructions: `
      You are a performance engineer specializing in:
      - System performance analysis
      - Optimization strategies
      - Scalability planning
      - Performance monitoring
      
      Always provide metrics, benchmarks, and improvement recommendations.
    `,
    handoffDescription: 'Performance engineering and optimization expertise'
  });

  const costAgent = new Agent({
    name: 'CostAnalyst',
    instructions: `
      You are a cost analyst specializing in:
      - Cost-benefit analysis
      - Budget planning
      - Resource optimization
      - ROI calculations
      
      Always provide detailed cost breakdowns and financial projections.
    `,
    handoffDescription: 'Cost analysis and financial planning expertise'
  });

  // Create a synthesis agent that coordinates multiple specialists
  const synthesisAgent = new Agent({
    name: 'ProjectSynthesizer',
    instructions: `
      You are a project synthesizer who coordinates multiple specialists
      to provide comprehensive project analysis.
      
      Your process:
      1. Analyze the project requirements
      2. Hand off to relevant specialists with enriched context
      3. Collect and synthesize their responses
      4. Provide a unified project assessment with:
         - Executive summary
         - Technical recommendations
         - Security considerations
         - Performance implications
         - Cost analysis
         - Risk assessment
         - Implementation roadmap
      
      Ensure all specialist inputs are integrated into a cohesive plan.
    `,
    handoffs: [securityAgent, performanceAgent, costAgent]
  });

  try {
    const projectRequest = `
      We're planning to migrate our legacy e-commerce system to a modern cloud-based architecture.
      
      Current system:
      - Monolithic PHP application
      - MySQL database with 10M+ records
      - 100,000+ daily active users
      - $50M annual revenue
      
      Target architecture:
      - Microservices with Node.js/Python
      - Cloud-native database (PostgreSQL/Aurora)
      - Container orchestration (Kubernetes)
      - CI/CD pipeline
      
      Please provide a comprehensive analysis covering all aspects of this migration.
    `;

    console.log('--- Complex Project Analysis ---');
    const result = await run(synthesisAgent, projectRequest);
    console.log('Synthesis Agent Response:', result.finalOutput);
    
  } catch (error) {
    console.error('Error running context enrichment and synthesis:', error);
  }
}

/**
 * Main function that runs all handoff examples
 */
async function main() {
  console.log('🔄 OpenAI Agents SDK - Handoffs Examples\n');
  console.log('This example demonstrates multi-agent workflows using handoffs.\n');
  
  try {
    await basicHandoffExample();
    await conditionalHandoffWorkflow();
    await hierarchicalAgentStructure();
    await dynamicHandoffSelection();
    await contextEnrichmentAndSynthesis();
    
    console.log('\n✅ All handoff examples completed successfully!');
    console.log('\nKey Takeaways:');
    console.log('1. Handoffs enable agent specialization and delegation');
    console.log('2. Multi-agent workflows can handle complex, multi-domain tasks');
    console.log('3. Hierarchical structures provide clear separation of concerns');
    console.log('4. Dynamic handoff selection enables intelligent routing');
    console.log('5. Context passing and result synthesis create cohesive workflows');
    
  } catch (error) {
    console.error('\n❌ Error running handoff examples:', error);
    process.exit(1);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicHandoffExample,
  conditionalHandoffWorkflow,
  hierarchicalAgentStructure,
  dynamicHandoffSelection,
  contextEnrichmentAndSynthesis
};