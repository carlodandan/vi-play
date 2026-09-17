/**
 * VPlay Cloudflare Worker - Vyla Streaming API Gateway
 *
 * Secure reverse proxy between VPlay on Cloudflare Pages and your self-hosted Vyla API.
 * - Handles CORS for all origins
 * - Secures master VYLA_API_KEY so it is never exposed in the browser
 * - Issues and refreshes session tokens
 * - Streams Server-Sent Events (SSE) for /movie and /tv without buffering
 * - Proxies HLS and MP4 streams (/api?url=...)
 * - Proxies /api/health, /api/subtitles, and /api/downloads
 */

export interface Env {
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

function handleCorsOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function addCorsHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handleCorsOptions();
    }

    const url = new URL(request.url);
    const workerOrigin = url.origin;
    const backendUrl = (env.VYLA_BACKEND_URL || 'http://localhost:7860').replace(/\/+$/, '');
    const apiKey = env.VYLA_API_KEY || '';

    // Root status endpoint
    if (url.pathname === '/' || url.pathname === '/healthz') {
      return addCorsHeaders(
        Response.json({
          name: 'VPlay Vyla Gateway',
          status: 'online',
          backend: backendUrl ? 'configured' : 'missing',
          notice: 'For entertainment purposes only',
          timestamp: new Date().toISOString(),
        })
      );
    }

    // 1. Session Token Auth (/api/auth)
    if (url.pathname === '/api/auth' && request.method === 'POST') {
      // Use configured secret API key, or client-supplied Authorization header if present
      const clientAuth = request.headers.get('Authorization') || request.headers.get('X-API-Key');
      const authHeader = clientAuth || (apiKey ? `Bearer ${apiKey}` : '');

      try {
        const backendRes = await fetch(`${backendUrl}/api/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
        });

        const data = await backendRes.text();
        return addCorsHeaders(
          new Response(data, {
            status: backendRes.status,
            headers: {
              'Content-Type': backendRes.headers.get('Content-Type') || 'application/json',
            },
          })
        );
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return addCorsHeaders(
          Response.json(
            { error: `Failed to connect to Vyla backend: ${error}` },
            { status: 502 }
          )
        );
      }
    }

    // 2. Token Refresh (/api/auth/refresh)
    if (url.pathname === '/api/auth/refresh' && request.method === 'POST') {
      const sessionToken = request.headers.get('X-Session-Token');
      try {
        const backendRes = await fetch(`${backendUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { 'X-Session-Token': sessionToken } : {}),
          },
        });

        const data = await backendRes.text();
        return addCorsHeaders(
          new Response(data, {
            status: backendRes.status,
            headers: {
              'Content-Type': backendRes.headers.get('Content-Type') || 'application/json',
            },
          })
        );
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return addCorsHeaders(
          Response.json({ error: `Backend error: ${error}` }, { status: 502 })
        );
      }
    }

    // 3. SSE Endpoints (/movie and /tv)
    if (url.pathname === '/movie' || url.pathname === '/tv') {
      const targetUrl = new URL(`${backendUrl}${url.pathname}${url.search}`);
      const headers = new Headers(request.headers);

      // Pass auth: if client didn't supply auth but worker has API key, inject it
      if (!headers.has('X-Session-Token') && !headers.has('Authorization') && apiKey) {
        headers.set('Authorization', `Bearer ${apiKey}`);
      }

      try {
        const backendRes = await fetch(targetUrl.toString(), {
          method: 'GET',
          headers,
        });

        // If backend returned SSE stream, transform URLs if needed to route through this worker
        if (backendRes.body) {
          const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              // Convert any backend proxy URLs to worker proxy URLs
              const text = new TextDecoder().decode(chunk);
              // Replace backend /api?url= with workerOrigin/api?url=
              const rewritten = text.replace(
                new RegExp(`${backendUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api\\?url=`, 'g'),
                `${workerOrigin}/api?url=`
              );
              controller.enqueue(new TextEncoder().encode(rewritten));
            },
          });

          backendRes.body.pipeTo(writable).catch(() => {});

          const resHeaders = new Headers(backendRes.headers);
          for (const [key, value] of Object.entries(CORS_HEADERS)) {
            resHeaders.set(key, value);
          }
          resHeaders.set('Cache-Control', 'no-cache');
          resHeaders.set('Connection', 'keep-alive');

          return new Response(readable, {
            status: backendRes.status,
            statusText: backendRes.statusText,
            headers: resHeaders,
          });
        }

        return addCorsHeaders(backendRes);
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return addCorsHeaders(
          Response.json({ error: `Stream connection error: ${error}` }, { status: 502 })
        );
      }
    }

    // 4. Stream Proxy & Segments (/api or other paths)
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

      return addCorsHeaders(backendRes);
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      return addCorsHeaders(
        Response.json({ error: `Proxy request failed: ${error}` }, { status: 502 })
      );
    }
  },
};
