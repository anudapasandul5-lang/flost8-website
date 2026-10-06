import { saveInquiry, type IntakeEnv } from './_intake'

interface Env extends IntakeEnv {
  APPS_SCRIPT_URL: string
  TURNSTILE_SECRET?: string
}

export const onRequest = async (context: {
  request: Request
  env: Env
  waitUntil: (p: Promise<unknown>) => void
}): Promise<Response> => {
  const { request, env } = context

  if (!env.APPS_SCRIPT_URL) {
    return new Response(
      JSON.stringify({ ok: false, errors: [{ message: 'Backend not configured' }] }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    )
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, errors: [{ message: 'Method not allowed' }] }),
      { status: 405, headers: { 'content-type': 'application/json', Allow: 'GET, POST' } }
    )
  }

  try {
    if (request.method === 'GET') {
      const incoming = new URL(request.url)
      const target = `${env.APPS_SCRIPT_URL}${incoming.search}`

      const upstream = await fetch(target, {
        method: 'GET',
        redirect: 'follow',
      })

      const body = await upstream.text()
      return new Response(body, {
        status: upstream.status,
        headers: { 'content-type': 'application/json' },
      })
    }

    // POST
    const body = await request.text()

    if (env.TURNSTILE_SECRET) {
      let token: string | undefined
      try {
        const parsed = JSON.parse(body)
        token = parsed?.token
      } catch {
        // ignore parse errors; treated as missing token below
      }

      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET,
          response: token ?? '',
        }),
      })
      const verifyData = await verifyRes.json() as { success: boolean }

      if (!verifyData.success) {
        return new Response(
          JSON.stringify({ ok: false, errors: [{ message: 'Turnstile verification failed' }] }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        )
      }
    }

    const upstream = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
    })

    const responseBody = await upstream.text()

    // Dual-write confirmed bookings to Supabase. Runs after the response is sent; a failure is
    // logged and never reaches the visitor (the Sheet row + alerts already happened).
    try {
      const payload = JSON.parse(body)
      const accepted = upstream.ok && JSON.parse(responseBody)?.ok !== false
      if (accepted && payload?.type === 'booking') {
        context.waitUntil(
          saveInquiry(env, payload).catch(err => console.error('supabase intake failed', err))
        )
      }
    } catch {
      // unparseable body/response: nothing to mirror
    }

    return new Response(responseBody, {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error('apps script proxy failed', err)
    return new Response(
      JSON.stringify({ ok: false, errors: [{ message: 'Upstream error' }] }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    )
  }
}
