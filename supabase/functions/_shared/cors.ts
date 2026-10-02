const allowedOrigin = Deno.env.get("FRONTEND_ORIGIN") ?? "*";

export const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([name, value]) =>
    headers.set(name, value),
  );
  return new Response(response.body, { status: response.status, headers });
}

export function preflight(request: Request): Response | null {
  return request.method === "OPTIONS"
    ? withCors(new Response(null, { status: 204 }))
    : null;
}
