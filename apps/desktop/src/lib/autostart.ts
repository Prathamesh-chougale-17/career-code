const AUTOSTART_PREFERENCE_KEY = "careeright-desktop-autostart-preference";

type AutostartPreference = "enabled" | "disabled";
type AutostartPlugin = typeof import("@tauri-apps/plugin-autostart");

let autostartPluginPromise: Promise<AutostartPlugin> | null = null;

function loadAutostartPlugin() {
  autostartPluginPromise ??= import("@tauri-apps/plugin-autostart");
  return autostartPluginPromise;
}

export function canUseAutostart() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getAutostartEnabled() {
  if (!canUseAutostart()) return false;
  const { isEnabled } = await loadAutostartPlugin();
  return isEnabled();
}

export async function setAutostartEnabled(enabled: boolean) {
  assertAutostartAvailable();
  const { disable, enable } = await loadAutostartPlugin();

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
  const { enable, isEnabled } = await loadAutostartPlugin();

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
