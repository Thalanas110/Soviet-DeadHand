import { requireUser } from "../_shared/auth.ts";
import { preflight } from "../_shared/cors.ts";
import { adminClient } from "../_shared/admin.ts";
import { body, errorResponse, HttpError, json, run } from "../_shared/http.ts";
import { open, seal } from "../_shared/crypto.ts";
import { contactsActionSchema } from "../_shared/schemas.ts";

async function execute(
  userId: string,
  input: ReturnType<typeof contactsActionSchema.parse>,
) {
  const db = adminClient();
  if (input.action === "list") {
    const { data, error } = await db
      .from("emergency_contacts")
      .select(
        "id, alias, priority, authorized, contact_enc, contact_iv, created_at",
      )
      .eq("user_id", userId)
      .order("priority");
    if (error) throw new Error(error.message);
    return Promise.all(
      (data ?? []).map(async (contact) => {
        let detail: {
          name: string;
          email: string;
          phone: string | null;
        } | null = null;
        try {
          detail = await open(
            contact.contact_enc,
            contact.contact_iv,
            `contact:${userId}`,
          );
        } catch {
          detail = null;
        }
        return {
          id: contact.id,
          alias: contact.alias,
          priority: contact.priority,
          authorized: contact.authorized,
          created_at: contact.created_at,
          detail,
        };
      }),
    );
  }

  if (input.action === "add") {
    const encrypted = await seal(
      { name: input.name, email: input.email, phone: input.phone || null },
      `contact:${userId}`,
    );
    const { error } = await db.from("emergency_contacts").insert({
      user_id: userId,
      alias: input.alias,
      priority: input.priority,
      contact_enc: encrypted.ciphertext,
      contact_iv: encrypted.iv,
    });
    if (error) throw new Error("Could not save contact");
    return { ok: true };
  }

  const { error } = await db
    .from("emergency_contacts")
    .delete()
    .eq("id", input.contactId)
    .eq("user_id", userId);
  if (!error) return { ok: true, deauthorized: false };

  const fallback = await db
    .from("emergency_contacts")
    .update({ authorized: false })
    .eq("id", input.contactId)
    .eq("user_id", userId);
  if (fallback.error) throw new Error("Could not remove contact");
  return { ok: true, deauthorized: true };
}

Deno.serve((request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;

  return run(async () => {
    if (request.method !== "POST")
      throw new HttpError(405, "METHOD_NOT_ALLOWED");
    const userId = await requireUser(request);
    const parsed = contactsActionSchema.safeParse(await body<unknown>(request));
    if (!parsed.success) throw new HttpError(400, "INVALID_REQUEST");
    return json(await execute(userId, parsed.data));
  }).catch(errorResponse);
});
