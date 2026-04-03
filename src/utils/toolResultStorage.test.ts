import { afterEach, expect, test } from 'bun:test'

import { createUserMessage } from './messages.ts'
import {
  applyToolResultReplacementsToMessages,
  getPerMessageBudgetLimit,
  provisionContentReplacementState,
  TOKEN_SAVER_DEFAULT_TOOL_RESULT_BUDGET_CHARS,
} from './toolResultStorage.ts'

const originalEnv = {
  OPENCLAUDE_TOKEN_SAVER: process.env.OPENCLAUDE_TOKEN_SAVER,
  CLAUDE_CODE_TOKEN_SAVER: process.env.CLAUDE_CODE_TOKEN_SAVER,
  OPENCLAUDE_TOOL_RESULT_BUDGET_CHARS:
    process.env.OPENCLAUDE_TOOL_RESULT_BUDGET_CHARS,
}

afterEach(() => {
  process.env.OPENCLAUDE_TOKEN_SAVER = originalEnv.OPENCLAUDE_TOKEN_SAVER
  process.env.CLAUDE_CODE_TOKEN_SAVER = originalEnv.CLAUDE_CODE_TOKEN_SAVER
  process.env.OPENCLAUDE_TOOL_RESULT_BUDGET_CHARS =
    originalEnv.OPENCLAUDE_TOOL_RESULT_BUDGET_CHARS
})

test('applyToolResultReplacementsToMessages replaces matching tool results and preserves unrelated messages', () => {
  const unrelated = createUserMessage({ content: 'keep me' })
  const oversizedResult = createUserMessage({
    content: [
      {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: 'very large tool output',
        is_error: false,
      },
    ],
  })
  const messages = [unrelated, oversizedResult]
  const replacement =
    '<persisted-output>\nOutput too large. Preview\n</persisted-output>'

  const next = applyToolResultReplacementsToMessages(
    messages,
    new Map([['tool-1', replacement]]),
  )

  expect(next).not.toBe(messages)
  expect(next[0]).toBe(unrelated)
  expect(next[1]).not.toBe(oversizedResult)
  expect((next[1]!.message.content as Array<{ content: string }>)[0]!.content).toBe(
    replacement,
  )
})

test('applyToolResultReplacementsToMessages is idempotent when messages are already hydrated', () => {
  const hydrated = createUserMessage({
    content: [
      {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: '<persisted-output>\nPreview\n</persisted-output>',
        is_error: false,
      },
    ],
  })
  const messages = [hydrated]

  const next = applyToolResultReplacementsToMessages(
    messages,
    new Map([['tool-1', '<persisted-output>\nPreview\n</persisted-output>']]),
  )

  expect(next).toBe(messages)
})

test('token saver mode enables content replacement state without feature flags', () => {
  process.env.OPENCLAUDE_TOKEN_SAVER = '1'
  delete process.env.CLAUDE_CODE_TOKEN_SAVER
  delete process.env.OPENCLAUDE_TOOL_RESULT_BUDGET_CHARS

  const state = provisionContentReplacementState()

  expect(state).toBeDefined()
  expect(state?.seenIds.size).toBe(0)
  expect(state?.replacements.size).toBe(0)
})

test('explicit OPENCLAUDE_TOOL_RESULT_BUDGET_CHARS override wins', () => {
  process.env.OPENCLAUDE_TOOL_RESULT_BUDGET_CHARS = '90001'
  process.env.OPENCLAUDE_TOKEN_SAVER = '1'

  expect(getPerMessageBudgetLimit()).toBe(90001)
})

test('token saver mode applies lower default tool-result budget', () => {
  delete process.env.OPENCLAUDE_TOOL_RESULT_BUDGET_CHARS
  process.env.OPENCLAUDE_TOKEN_SAVER = 'true'

  expect(getPerMessageBudgetLimit()).toBe(
    TOKEN_SAVER_DEFAULT_TOOL_RESULT_BUDGET_CHARS,
  )
})
