// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { onRequest } from './script'

afterEach(() => vi.unstubAllGlobals())

const APPS_SCRIPT = 'https://script.example/exec'
const form = { type: 'join', name: 'Test', email: 'a@b.co', token: 'turnstile-token' }
const body = JSON.stringify(form)
const request = (text = body) => new Request('https://site/api/script', { method: 'POST', body: text })
const waitUntil = () => {}

// Records the Apps Script call; Turnstile siteverify answers success.
function fakeFetch() {
  const forwarded: string[] = []
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push(url)
    if (url.startsWith('https://challenges.cloudflare.com')) return Response.json({ success: true })
    if (url === APPS_SCRIPT) {
      forwarded.push(String(init?.body))
      return Response.json({ ok: true })
    }
    throw new Error('Unexpected URL ' + url)
  }))
  return { forwarded, calls }
}

it('forwards the body byte-for-byte when APPS_SCRIPT_PROXY_SECRET is unset', async () => {
  const { forwarded } = fakeFetch()
  const res = await onRequest({ request: request(), env: { APPS_SCRIPT_URL: APPS_SCRIPT }, waitUntil })
  expect(res.status).toBe(200)
  expect(forwarded).toEqual([body])
})

it('adds the proxy secret to the forwarded copy only, keeping every other field', async () => {
  const { forwarded } = fakeFetch()
  const res = await onRequest({
    request: request(),
    env: { APPS_SCRIPT_URL: APPS_SCRIPT, APPS_SCRIPT_PROXY_SECRET: 'proxy-secret' },
    waitUntil,
  })
  expect(res.status).toBe(200)
  expect(JSON.parse(forwarded[0])).toEqual({ ...form, secret: 'proxy-secret' })
})

it('still runs the Turnstile check before forwarding when TURNSTILE_SECRET is set', async () => {
  const { forwarded, calls } = fakeFetch()
  await onRequest({
    request: request(),
    env: { APPS_SCRIPT_URL: APPS_SCRIPT, TURNSTILE_SECRET: 'ts', APPS_SCRIPT_PROXY_SECRET: 'proxy-secret' },
    waitUntil,
  })
  expect(calls[0]).toContain('challenges.cloudflare.com')
  expect(calls[1]).toBe(APPS_SCRIPT)
  expect(JSON.parse(forwarded[0]).secret).toBe('proxy-secret')
})

it('forwards an unparseable body unchanged even when the secret is set', async () => {
  const { forwarded } = fakeFetch()
  await onRequest({
    request: request('not json'),
    env: { APPS_SCRIPT_URL: APPS_SCRIPT, APPS_SCRIPT_PROXY_SECRET: 'proxy-secret' },
    waitUntil,
  })
  expect(forwarded).toEqual(['not json'])
})
