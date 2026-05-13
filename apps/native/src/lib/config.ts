export const CAREERIGHT_SCHEME = "careeright";
export const CAREERIGHT_STORAGE_PREFIX = "careeright";
export const DEFAULT_CAREERIGHT_ORIGIN = "https://careeright.vercel.app";

export function getCareerightOrigin() {
  const configuredOrigin = process.env.EXPO_PUBLIC_CAREERIGHT_URL?.trim();
  const origin = configuredOrigin || DEFAULT_CAREERIGHT_ORIGIN;

  return origin.replace(/\/$/, "");
}
