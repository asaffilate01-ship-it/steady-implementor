function enabled(value: string | boolean | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return value.toLowerCase() === "true";
}

/** Build-time rollout switches. These control UX exposure, never authorisation. */
export const FEATURES = Object.freeze({
  smartMap: enabled(import.meta.env.VITE_FEATURE_SMART_MAP, true),
  fleetWorkspace: enabled(import.meta.env.VITE_FEATURE_FLEET_WORKSPACE, true),
  ticketScanner: enabled(import.meta.env.VITE_FEATURE_TICKET_SCANNER, true),
});
