export type SetupDeviceKind = "phone" | "wearable";

export type SetupDeviceToken = {
  token: string;
  kind: SetupDeviceKind;
};

export function tokenForDeviceKind(
  deviceToken: SetupDeviceToken | null,
  kind: SetupDeviceKind,
): string | null {
  return deviceToken?.kind === kind ? deviceToken.token : null;
}
