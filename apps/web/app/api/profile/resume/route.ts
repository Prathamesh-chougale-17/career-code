import { Buffer } from "node:buffer";

import { getSessionFromHeaders } from "@careeright/auth/server";
import { parseResumeText } from "@careeright/domain/profile/resume-parser";
import { createProfileImport } from "@careeright/domain/profile/store";

export const runtime = "nodejs";

const maxResumePdfBytes = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const sessionResult = await getResumeImportSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const formData = await request.formData();
  const resumeFile = formData.get("file");

  if (!isFormDataFile(resumeFile)) {
    return Response.json({ error: "Upload a PDF resume." }, { status: 400 });
  }

  if (!isPdfFile(resumeFile)) {
    return Response.json({ error: "Only PDF files are supported." }, { status: 400 });
  }

  if (resumeFile.size > maxResumePdfBytes) {
    return Response.json(
      { error: "PDF must be 8 MB or smaller." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await resumeFile.arrayBuffer());

  if (!buffer.subarray(0, 4).equals(Buffer.from("%PDF"))) {
    return Response.json({ error: "The uploaded file is not a valid PDF." }, { status: 400 });
  }

  const text = await extractPdfText(buffer);
  const parsedResume = parseResumeText(text);

  if (parsedResume.items.length === 0) {
    return Response.json(
      {
        error: "No resume sections were detected in this PDF.",
        warnings: parsedResume.warnings,
        textLength: parsedResume.textLength,
      },
      { status: 422 },
    );
  }

  const profileImport = await createProfileImport(
    {
      profileBasics: parsedResume.profileBasics,
      items: parsedResume.items,
      summary: parsedResume.summary,
    },
    sessionResult.user.id,
    "pdf",
  );

  return Response.json({
    profileImport,
    warnings: parsedResume.warnings,
    textLength: parsedResume.textLength,
  });
}

async function getResumeImportSession(request: Request) {
  try {
    const session = await getSessionFromHeaders(request.headers);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return session;
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Auth is not configured for this environment.",
      },
      { status: 503 },
    );
  }
}

function isFormDataFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
      typeof value !== "string" &&
      typeof value.arrayBuffer === "function",
  );
}

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.type === "application/x-pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

async function extractPdfText(data: Buffer) {
  installPdfJsTextExtractionPolyfills();
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

function installPdfJsTextExtractionPolyfills() {
  const globalScope = globalThis as typeof globalThis & {
    DOMMatrix?: typeof DOMMatrix;
    ImageData?: typeof ImageData;
    Path2D?: typeof Path2D;
  };

  if (!globalScope.DOMMatrix) {
    globalScope.DOMMatrix = class TextExtractionDOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;

      constructor(init?: string | number[] | DOMMatrixInit) {
        if (Array.isArray(init)) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = [
            init[0] ?? 1,
            init[1] ?? 0,
            init[2] ?? 0,
            init[3] ?? 1,
            init[4] ?? 0,
            init[5] ?? 0,
          ];
          return;
        }

        if (init && typeof init === "object") {
          this.a = init.a ?? init.m11 ?? this.a;
          this.b = init.b ?? init.m12 ?? this.b;
          this.c = init.c ?? init.m21 ?? this.c;
          this.d = init.d ?? init.m22 ?? this.d;
          this.e = init.e ?? init.m41 ?? this.e;
          this.f = init.f ?? init.m42 ?? this.f;
        }
      }

      multiplySelf() {
        return this;
      }

      preMultiplySelf() {
        return this;
      }

      translateSelf() {
        return this;
      }

      scaleSelf() {
        return this;
      }

      rotateSelf() {
        return this;
      }
    } as typeof DOMMatrix;
  }

  if (!globalScope.ImageData) {
    globalScope.ImageData = class TextExtractionImageData {
      colorSpace: PredefinedColorSpace = "srgb";
      data: Uint8ClampedArray;
      height: number;
      width: number;

      constructor(
        dataOrWidth: Uint8ClampedArray | number,
        width: number,
        height?: number,
      ) {
        if (typeof dataOrWidth === "number") {
          this.width = dataOrWidth;
          this.height = width;
          this.data = new Uint8ClampedArray(this.width * this.height * 4);
          return;
        }

        this.data = dataOrWidth;
        this.width = width;
        this.height = height ?? 0;
      }
    } as typeof ImageData;
  }

  if (!globalScope.Path2D) {
    globalScope.Path2D = class TextExtractionPath2D {
      addPath() {}
    } as unknown as typeof Path2D;
  }
}
