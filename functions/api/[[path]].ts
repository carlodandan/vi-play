/**
 * Cloudflare Pages Functions API Proxy
 * Allows VPlay on Cloudflare Pages to proxy directly to self-hosted Vyla API
 */

interface Env {
  VYLA_BACKEND_URL?: string;
  VYLA_API_KEY?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key, X-Session-Token, Range',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, Accept-Ranges',
  'Access-Control-Max-Age': '86400',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const backendUrl = (env.VYLA_BACKEND_URL || 'http://localhost:7860').replace(/\/+$/, '');
  const apiKey = env.VYLA_API_KEY || '';

  // Extract path following /api/
  const subPath = url.pathname.replace(/^\/api/, '');
  const targetUrl = `${backendUrl}${subPath}${url.search}`;

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

    const resHeaders = new Headers(backendRes.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      resHeaders.set(key, value);
    }

    return new Response(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: resHeaders,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: `Pages function proxy error: ${error}` }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
};
