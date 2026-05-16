export const desktopCallbackScheme = "careeright-desktop";

export function getCareerightOrigin() {
  return (
    import.meta.env.VITE_CAREERIGHT_URL?.trim() ||
    "https://careeright.vercel.app"
  ).replace(/\/$/, "");
}
