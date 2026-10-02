import { withCors } from "./cors.ts";

export function json<T>(body: T, status = 200): Response {
  return withCors(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }),
  );
}

export async function body<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "INVALID_JSON");
  }
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError)
    return json({ error: error.code }, error.status);
  console.error(error);
  return json({ error: "INTERNAL_ERROR" }, 500);
}

export async function run(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    return errorResponse(error);
  }
}
