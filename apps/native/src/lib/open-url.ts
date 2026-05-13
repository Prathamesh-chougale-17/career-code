import * as WebBrowser from "expo-web-browser";

export async function openExternalUrl(url?: string | null) {
  if (!url) {
    return;
  }

  await WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
  });
}
