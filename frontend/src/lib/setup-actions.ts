import { contactsApi, operatorApi, type ActionResult } from "@/lib/api";
import type { ContactInput, RegisterDeviceInput } from "@/lib/schemas";
import type { SetupDeviceToken } from "@/lib/setup-device-token";

export type SetupPasswordInput = {
  current: string;
  checkin: string;
  duress: string;
};

export async function saveSetupPasswords(input: SetupPasswordInput): Promise<ActionResult> {
  const result = await operatorApi.action({ action: "setPins", ...input });
  if (!result.ok) {
    throw new Error(
      result.error === "PIN_REJECTED"
        ? "Current password rejected"
        : (result.error ?? "Passwords rejected"),
    );
  }
  return result;
}

export async function registerSetupDevice(input: RegisterDeviceInput): Promise<SetupDeviceToken> {
  const result = await operatorApi.action({ action: "registerDevice", ...input });
  if (!result.token) throw new Error("Registration failed");
  return { token: result.token, kind: input.kind };
}

export function authorizeSetupContact(input: ContactInput) {
  return contactsApi.add(input);
}
