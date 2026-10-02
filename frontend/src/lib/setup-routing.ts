import { contactsApi, operatorApi } from "@/lib/api";
import { deriveSetupReadiness, hasRequiredSetup } from "@/lib/setup-readiness";

export async function loadSetupDestination(): Promise<"/setup" | "/console"> {
  await operatorApi.action({ action: "bootstrap" });
  const [snapshot, contacts] = await Promise.all([operatorApi.read(), contactsApi.list()]);
  return hasRequiredSetup(deriveSetupReadiness(snapshot, contacts)) ? "/console" : "/setup";
}
