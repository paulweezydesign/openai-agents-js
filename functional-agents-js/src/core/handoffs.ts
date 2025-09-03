import type {
  AgentConfig,
  HandoffConfig,
  Message,
  AgentContext,
  RunResult,
  RunConfig,
} from './types.js';
import { run } from './runner.js';

/**
 * Functional handoff system for agent-to-agent communication
 */

/**
 * Create a handoff configuration
 */
export const createHandoff = (
  targetAgent: AgentConfig,
  options: {
    condition?: (messages: Message[], context?: AgentContext) => boolean;
    inputFilter?: (messages: Message[]) => Message[];
    description?: string;
  } = {}
): HandoffConfig => ({
  targetAgent,
  condition: options.condition,
  inputFilter: options.inputFilter,
  description: options.description || `Handoff to ${targetAgent.name}`,
});

/**
 * Check if handoff should occur
 */
export const shouldHandoff = (
  handoff: HandoffConfig,
  messages: Message[],
  context?: AgentContext
): boolean => {
  if (!handoff.condition) return false;
  return handoff.condition(messages, context);
};

/**
 * Execute a handoff
 */
export const executeHandoff = async (
  handoff: HandoffConfig,
  messages: Message[],
  runConfig?: RunConfig
): Promise<RunResult> => {
  const filteredMessages = handoff.inputFilter 
    ? handoff.inputFilter(messages)
    : messages;
    
  return run(handoff.targetAgent, filteredMessages, runConfig);
};

/**
 * Common handoff conditions
 */

/**
 * Handoff based on keywords in the latest message
 */
export const keywordHandoffCondition = (keywords: string[]) =>
  (messages: Message[]): boolean => {
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop();
      
    if (!lastUserMessage) return false;
    
    const content = lastUserMessage.content.toLowerCase();
    return keywords.some(keyword => content.includes(keyword.toLowerCase()));
  };

/**
 * Handoff based on language detection
 */
export const languageHandoffCondition = (targetLanguages: string[]) =>
  (messages: Message[]): boolean => {
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop();
      
    if (!lastUserMessage) return false;
    
    // Simple language detection (in practice, you'd use a proper library)
    const content = lastUserMessage.content;
    
    // Spanish detection example
    if (targetLanguages.includes('spanish')) {
      const spanishWords = ['hola', 'gracias', 'por favor', 'español'];
      return spanishWords.some(word => content.toLowerCase().includes(word));
    }
    
    return false;
  };

/**
 * Handoff based on message count
 */
export const messageCountHandoffCondition = (threshold: number) =>
  (messages: Message[]): boolean => messages.length >= threshold;

/**
 * Handoff based on context values
 */
export const contextHandoffCondition = (
  predicate: (context?: AgentContext) => boolean
) => (_messages: Message[], context?: AgentContext): boolean =>
  predicate(context);

/**
 * Common input filters for handoffs
 */

/**
 * Remove tool-related messages
 */
export const removeToolMessagesFilter = (messages: Message[]): Message[] =>
  messages.filter(m => m.role !== 'tool' && !m.toolCalls);

/**
 * Keep only the last N messages
 */
export const keepLastMessagesFilter = (n: number) =>
  (messages: Message[]): Message[] => messages.slice(-n);

/**
 * Remove system messages
 */
export const removeSystemMessagesFilter = (messages: Message[]): Message[] =>
  messages.filter(m => m.role !== 'system');

/**
 * Keep only user and assistant messages
 */
export const keepConversationOnlyFilter = (messages: Message[]): Message[] =>
  messages.filter(m => m.role === 'user' || m.role === 'assistant');

/**
 * Transform message content
 */
export const transformMessageContentFilter = (
  transformer: (content: string, role: Message['role']) => string
) => (messages: Message[]): Message[] =>
  messages.map(m => ({
    ...m,
    content: transformer(m.content, m.role),
  }));

/**
 * Compose multiple filters
 */
export const composeFilters = (...filters: Array<(messages: Message[]) => Message[]>) =>
  (messages: Message[]): Message[] =>
    filters.reduce((acc, filter) => filter(acc), messages);

/**
 * Multi-agent orchestration patterns
 */

/**
 * Create a round-robin handoff pattern
 */
export const createRoundRobinHandoff = (agents: AgentConfig[]) => {
  if (agents.length === 0) {
    throw new Error('At least one agent is required for round-robin handoff');
  }
  
  let currentIndex = 0;
  
  return createHandoff(
    agents[0]!,
    {
      condition: () => true,
      inputFilter: (messages) => {
        currentIndex = (currentIndex + 1) % agents.length;
        return messages;
      },
    }
  );
};

/**
 * Create a load-balancing handoff pattern
 */
export const createLoadBalancingHandoff = (
  agents: AgentConfig[],
  loadTracker: Map<string, number> = new Map()
) => {
  if (agents.length === 0) {
    throw new Error('At least one agent is required for load balancing');
  }
  
  const getNextAgent = (): AgentConfig => {
    // Find agent with lowest load
    let minLoad = Infinity;
    let selectedAgent: AgentConfig | undefined = undefined;
    
    for (const agent of agents) {
      const load = loadTracker.get(agent.name) || 0;
      if (load < minLoad) {
        minLoad = load;
        selectedAgent = agent;
      }
    }
    
    if (!selectedAgent) {
      selectedAgent = agents[0]!;
    }
    
    // Increment load
    loadTracker.set(selectedAgent.name, (loadTracker.get(selectedAgent.name) || 0) + 1);
    return selectedAgent;
  };
  
  return createHandoff(
    agents[0]!,
    {
      condition: () => true,
      inputFilter: (messages) => messages,
    }
  );
};

/**
 * Create a priority-based handoff pattern
 */
export const createPriorityHandoff = (
  agentPriorities: Array<{ agent: AgentConfig; priority: number; condition: (messages: Message[]) => boolean }>
) => {
  const sortedAgents = agentPriorities.sort((a, b) => b.priority - a.priority);
  
  return (messages: Message[], context?: AgentContext): HandoffConfig | null => {
    for (const { agent, condition } of sortedAgents) {
      if (condition(messages)) {
        return createHandoff(agent, { condition: () => true });
      }
    }
    return null;
  };
};