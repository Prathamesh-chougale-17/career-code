import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

const AUTOSTART_PREFERENCE_KEY = "careeright-desktop-autostart-preference";

type AutostartPreference = "enabled" | "disabled";

export function canUseAutostart() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getAutostartEnabled() {
  if (!canUseAutostart()) return false;
  return isEnabled();
}

export async function setAutostartEnabled(enabled: boolean) {
  assertAutostartAvailable();

  if (enabled) {
    await enable();
    saveAutostartPreference("enabled");
  } else {
    await disable();
    saveAutostartPreference("disabled");
  }

  notifyAutostartChanged();
  return enabled;
}

export async function enableAutostartByDefault() {
  if (!canUseAutostart()) return false;

  const preference = readAutostartPreference();

  if (preference === "disabled") {
    return isEnabled();
  }

  const alreadyEnabled = await isEnabled();

  if (!alreadyEnabled) {
    await enable();
  }

  saveAutostartPreference("enabled");
  notifyAutostartChanged();
  return true;
}

function readAutostartPreference(): AutostartPreference | null {
  const value = localStorage.getItem(AUTOSTART_PREFERENCE_KEY);
  return value === "enabled" || value === "disabled" ? value : null;
}

function saveAutostartPreference(preference: AutostartPreference) {
  localStorage.setItem(AUTOSTART_PREFERENCE_KEY, preference);
}

function notifyAutostartChanged() {
  window.dispatchEvent(new Event("careeright:autostart-changed"));
}

function assertAutostartAvailable() {
  if (!canUseAutostart()) {
    throw new Error("Launch at startup is only available in the desktop app.");
  }
}
