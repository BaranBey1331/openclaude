import { isEnvTruthy } from '../envUtils.js'

export type ModelProvider = 'gemini' | 'groq' | 'codex' | 'openai' | 'generic'

export function getModelProvider(): ModelProvider {
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_GEMINI)) return 'gemini'
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_GROQ)) return 'groq'
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI)) {
    const model = (process.env.OPENAI_MODEL || '').toLowerCase()
    if (model.includes('codex')) return 'codex'
    return 'openai'
  }
  return 'generic'
}

const COMMON_TOOL_USE_GUIDANCE = `
# Tool Use Guidelines
- You have access to a variety of tools to help you complete tasks.
- Always check the tool definitions to understand the required parameters and their types.
- If a tool call fails, analyze the error message and try again with corrected parameters.
- Be precise with file paths; use absolute paths when possible.
- Do not make assumptions about the state of the system; use tools to verify.
`

const THINKING_GUIDANCE = `
# Reasoning Process
- Before calling a tool, take a moment to think and plan your next steps.
- Use <thought> tags to outline your reasoning, strategy, and any potential risks.
- This helps ensure that your actions are deliberate and well-considered.
`

const GEMINI_SPECIFIC_GUIDANCE = `
# Gemini Tool Use Tips
- Gemini works best when you clearly state your intention before calling a tool.
- Ensure that the JSON arguments for tool calls perfectly match the expected schema.
- If you need to perform multiple actions, it's often better to call tools one by one and wait for the results.
`

const GROQ_SPECIFIC_GUIDANCE = `
# Groq Tool Use Tips
- Groq models are very fast; use this to your advantage by performing iterative checks.
- Be extra careful with JSON formatting in tool arguments.
`

export function getEnhancementPrompt(provider: ModelProvider): string {
  let prompt = COMMON_TOOL_USE_GUIDANCE

  // Only add thinking guidance if the model doesn't have native reasoning support
  // (Assuming for now we want to encourage it via prompt for most)
  prompt += `\n${THINKING_GUIDANCE}`

  switch (provider) {
    case 'gemini':
      prompt += `\n${GEMINI_SPECIFIC_GUIDANCE}`
      break
    case 'groq':
      prompt += `\n${GROQ_SPECIFIC_GUIDANCE}`
      break
    case 'codex':
      // Codex might need specific guidance too, but starting with common
      break
  }

  return prompt
}
