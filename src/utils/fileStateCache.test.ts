import { expect, test } from 'bun:test'

import {
  cloneFileStateCache,
  createFileStateCacheWithSizeLimit,
} from './fileStateCache.ts'

test('normalizes keys so equivalent paths share one entry', () => {
  const cache = createFileStateCacheWithSizeLimit(10, 1024 * 1024, 0)
  cache.set('/tmp/demo/../demo/file.txt', {
    content: 'hello',
    timestamp: Date.now(),
    offset: undefined,
    limit: undefined,
  })

  expect(cache.get('/tmp/demo/file.txt')?.content).toBe('hello')
})

test('expires stale entries and refreshes ttl on cache hit', async () => {
  const cache = createFileStateCacheWithSizeLimit(10, 1024 * 1024, 120)
  cache.set('/tmp/fresh.txt', {
    content: 'v1',
    timestamp: Date.now(),
    offset: undefined,
    limit: undefined,
  })

  await Bun.sleep(25)
  expect(cache.get('/tmp/fresh.txt')?.content).toBe('v1')

  // Hit should refresh age (updateAgeOnGet), so this should still exist.
  await Bun.sleep(25)
  expect(cache.get('/tmp/fresh.txt')?.content).toBe('v1')

  // No touch for longer than TTL -> expires.
  await Bun.sleep(140)
  expect(cache.get('/tmp/fresh.txt')).toBeUndefined()
})

test('includes key and metadata overhead in size-based eviction', () => {
  const cache = createFileStateCacheWithSizeLimit(10, 220, 0)

  cache.set('/tmp/a', {
    content: 'x',
    timestamp: Date.now(),
    offset: undefined,
    limit: undefined,
  })
  cache.set('/tmp/b', {
    content: 'y',
    timestamp: Date.now(),
    offset: undefined,
    limit: undefined,
  })

  expect(cache.has('/tmp/a')).toBe(false)
  expect(cache.has('/tmp/b')).toBe(true)
})

test('clone preserves ttl configuration', () => {
  const cache = createFileStateCacheWithSizeLimit(10, 1024 * 1024, 1234)
  const cloned = cloneFileStateCache(cache)

  expect(cloned.ttl).toBe(1234)
})
