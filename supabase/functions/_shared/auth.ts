import { adminClient } from "./admin.ts";
import { HttpError } from "./http.ts";

export type AuthContext = { token: string; userId: string };

export async function requireAuth(request: Request): Promise<AuthContext> {
  const authorization = request.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, "UNAUTHENTICATED");

  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "UNAUTHENTICATED");
  return { token, userId: data.user.id };
}

export async function requireUser(request: Request): Promise<string> {
  return (await requireAuth(request)).userId;
}

export function requireDeviceToken(request: Request): string {
  const authorization = request.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, "UNAUTHENTICATED");
  return token;
}
