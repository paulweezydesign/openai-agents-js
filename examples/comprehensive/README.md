# OpenAI Agents SDK - Comprehensive Examples

This directory contains detailed examples demonstrating every feature of the OpenAI Agents SDK for JavaScript/TypeScript. Each example is fully documented with explanations of the concepts, code walkthroughs, and best practices.

## 🚀 Quick Start

Before running any examples, ensure you have:

1. **Node.js 22+** installed
2. **OpenAI API Key** set as environment variable: `export OPENAI_API_KEY="your-key-here"`
3. **Dependencies installed**: `pnpm install`

## 📚 Example Categories

### 1. **Core Concepts** (`01-core-concepts/`)
- Basic agent creation and configuration
- Tool definitions and usage
- Agent lifecycle and hooks
- Error handling and validation

### 2. **Advanced Agent Patterns** (`02-advanced-patterns/`)
- Multi-agent workflows with handoffs
- Parallel agent execution
- Agent composition and inheritance
- Dynamic agent creation

### 3. **Tool System** (`03-tool-system/`)
- Function tools with Zod schemas
- Computer tools for system access
- MCP server integration
- Custom tool implementations
- Tool approval workflows

### 4. **Guardrails & Safety** (`04-guardrails/`)
- Input validation and sanitization
- Output content filtering
- Rate limiting and usage controls
- Custom safety checks

### 5. **Streaming & Real-time** (`05-streaming-realtime/`)
- Streaming agent responses
- Real-time voice agents
- WebSocket integration
- Event-driven workflows

### 6. **Model Providers** (`06-model-providers/`)
- OpenAI integration
- Custom model providers
- Model switching and fallbacks
- Cost optimization

### 7. **Production Patterns** (`07-production-patterns/`)
- Error handling and retries
- Logging and monitoring
- Performance optimization
- Deployment strategies

### 8. **Integration Examples** (`08-integrations/`)
- Database integration
- API integrations
- File system operations
- External service calls

## 🏃‍♂️ Running Examples

Each example can be run independently:

```bash
# Run a specific example
pnpm tsx examples/comprehensive/01-core-concepts/01-basic-agent.ts

# Run all examples in a category
pnpm tsx examples/comprehensive/01-core-concepts/

# Run with debugging
DEBUG=* pnpm tsx examples/comprehensive/01-core-concepts/01-basic-agent.ts
```

## 🔧 Configuration

Examples use environment variables for configuration:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export OPENAI_ORG_ID="your-org-id"  # Optional
export DEBUG="*"                     # Enable debug logging
export NODE_ENV="development"        # Environment mode
```

## 📖 Learning Path

For beginners, follow this order:
1. Start with `01-core-concepts/01-basic-agent.ts`
2. Move to `01-core-concepts/02-tools-basic.ts`
3. Explore `02-advanced-patterns/01-handoffs.ts`
4. Continue through each category progressively

For experienced developers:
- Jump directly to specific examples
- Use examples as templates for your own implementations
- Modify examples to test different configurations

## 🐛 Troubleshooting

Common issues and solutions:

1. **API Key Issues**: Ensure `OPENAI_API_KEY` is set correctly
2. **Rate Limits**: Examples include rate limiting demonstrations
3. **Memory Issues**: Large agents may require more memory
4. **Network Issues**: Check firewall and proxy settings

## 📝 Contributing

To add new examples:
1. Create a new file in the appropriate category
2. Include comprehensive documentation
3. Add error handling and edge cases
4. Test with different configurations
5. Update this README

## 🔗 Additional Resources

- [Official Documentation](https://openai.github.io/openai-agents-js/)
- [API Reference](https://openai.github.io/openai-agents-js/api/)
- [GitHub Repository](https://github.com/openai/openai-agents-js)
- [Python SDK](https://github.com/openai/openai-agents-python) (for comparison)