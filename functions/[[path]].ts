/**
 * Cloudflare Pages Functions
 *
 * Intercepts streaming endpoints (/movie, /tv, /api/*) and delegates them
 * to the private Cloudflare Worker via Service Binding (env.VYLA_WORKER).
 * All other paths pass through to the static front-end assets.
 */

interface Env {
  VYLA_WORKER?: Fetcher;
  VYLA_BACKEND_URL?: string;
  VYLA_API_KEY?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const isHtmlRequest = request.headers.get('accept')?.includes('text/html');

  // Streaming API routes (SSE / JSON / Proxies)
  if (!isHtmlRequest && (url.pathname === '/movie' || url.pathname === '/tv' || url.pathname.startsWith('/api'))) {
    // 1. Delegate to private Cloudflare Worker via Service Binding
    if (env.VYLA_WORKER) {
      return env.VYLA_WORKER.fetch(request);
    }

    // 2. Direct Pages Function proxy fallback if VYLA_BACKEND_URL is configured in Pages environment
    const backendUrl = (env.VYLA_BACKEND_URL || 'http://localhost:7860').replace(/\/+$/, '');
    const apiKey = env.VYLA_API_KEY || '';
    const targetUrl = `${backendUrl}${url.pathname}${url.search}`;

    const headers = new Headers(request.headers);
    if (!headers.has('X-Session-Token') && !headers.has('Authorization') && apiKey) {
      headers.set('Authorization', `Bearer ${apiKey}`);
    }
    headers.delete('host');

    try {
      const backendRes = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });

      return new Response(backendRes.body, {
        status: backendRes.status,
        statusText: backendRes.statusText,
        headers: backendRes.headers,
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: `Pages proxy error: ${error}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Pass through all other requests to static assets (HTML/CSS/JS/images)
  return context.next();
};
