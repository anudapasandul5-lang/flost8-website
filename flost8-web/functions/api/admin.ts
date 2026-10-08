interface Env {
  APPS_SCRIPT_URL: string
  ADMIN_PASSWORD: string
  ADMIN_SECRET: string
}

/**
 * Admin write path for the Upcoming Shows list. Mirrors functions/api/script.ts
 * but gated by a shared password instead of Turnstile.
 *
 * The client sends { password, action, ... }. This Function verifies the
 * password (constant-time), then forwards { action, secret, ... } to the Apps
 * Script web app — injecting the server-only ADMIN_SECRET the client never sees.
 * The /exec URL is public, so Apps Script re-checks that secret on its side.
 */

// Length-independent constant-time string compare — avoids leaking the password
// length or match-prefix via response timing.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  let diff = ab.length ^ bb.length
  const len = Math.max(ab.length, bb.length)
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0)
  }
  return diff === 0
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export const onRequest = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context

  if (!env.APPS_SCRIPT_URL || !env.ADMIN_PASSWORD || !env.ADMIN_SECRET) {
    return jsonResponse({ ok: false, errors: [{ message: 'Admin backend not configured' }] }, 503)
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, errors: [{ message: 'Method not allowed' }] }),
      { status: 405, headers: { 'content-type': 'application/json', Allow: 'POST' } }
    )
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(await request.text())
  } catch {
    return jsonResponse({ ok: false, errors: [{ message: 'Invalid request' }] }, 400)
  }

  const password = typeof payload.password === 'string' ? payload.password : ''
  if (!timingSafeEqual(password, env.ADMIN_PASSWORD)) {
    // Generic 401 — never echo the password or say which part was wrong.
    return jsonResponse({ ok: false, errors: [{ message: 'Unauthorized' }] }, 401)
  }

  // Swap the client password for the server-only secret before forwarding.
  delete payload.password
  const forwarded = { ...payload, secret: env.ADMIN_SECRET }

  try {
    const upstream = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(forwarded),
      redirect: 'follow',
    })
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    // Never log the payload/secret — only the failure.
    console.error('admin proxy failed', err)
    return jsonResponse({ ok: false, errors: [{ message: 'Upstream error' }] }, 502)
  }
}
