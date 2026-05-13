import type { DocumentPickerAsset } from "expo-document-picker";

import { authenticatedHeaders } from "@/lib/api";
import { getCareerightOrigin } from "@/lib/config";

type ResumePdfImportResponse = {
  profileImport: unknown;
  warnings: string[];
  textLength: number;
};

export async function uploadResumePdf(asset: DocumentPickerAsset) {
  const formData = new FormData();
  const fileName = asset.name || "resume.pdf";

  formData.append("file", {
    name: fileName,
    type: asset.mimeType || "application/pdf",
    uri: asset.uri,
  } as unknown as Blob);

  const response = await fetch(`${getCareerightOrigin()}/api/profile/resume`, {
    body: formData,
    headers: authenticatedHeaders(),
    method: "POST",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : "Resume PDF import failed.",
    );
  }

  return payload as ResumePdfImportResponse;
}
