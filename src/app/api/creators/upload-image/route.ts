import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { CREATOR_IMAGES_BUCKET } from "@/lib/creators/storage";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { detectImageMime } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionForMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return null;
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function storageErrorFields(error: {
  message?: string;
  name?: string;
  status?: number;
  statusCode?: string;
  code?: string;
  originalError?: unknown;
  cause?: unknown;
}) {
  const cause = error.originalError ?? error.cause;
  return {
    message: error.message,
    name: error.name,
    status: error.status,
    statusCode: error.statusCode,
    code: error.code,
    cause: cause === undefined || cause === null ? undefined : String(cause),
  };
}

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "creator-upload-image"), 12);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many uploads. Please wait." }, { status: 429 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Uploads are not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Uploads are not configured." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!isUploadFile(file)) {
    return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectImageMime(buffer);
  if (!detected || !ALLOWED_MIME.has(detected)) {
    return NextResponse.json(
      { error: "File content is not a valid JPG, PNG, or WebP image." },
      { status: 400 },
    );
  }

  const ext = extensionForMime(detected);
  if (!ext) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }

  const path = `${user.id}/${randomUUID()}.${ext}`;
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path)) {
    return NextResponse.json({ error: "Image upload failed. Please try again." }, { status: 500 });
  }

  // File/Blob so storage-js sends multipart/form-data (standard upload), not a raw Uint8Array body.
  const uploadFile = new File([new Uint8Array(buffer)], `upload.${ext}`, { type: detected });

  const { error: uploadError } = await admin.storage.from(CREATOR_IMAGES_BUCKET).upload(path, uploadFile, {
    contentType: detected,
    upsert: false,
  });

  if (uploadError) {
    const details = storageErrorFields(uploadError);
    console.error("[upload-image] storage failed", {
      ...details,
      fileSize: file.size,
      fileType: file.type,
      detectedMime: detected,
      bucket: CREATOR_IMAGES_BUCKET,
      path,
      bodyKind: "File",
      adminConfigured: true,
    });
    return NextResponse.json(
      {
        error: details.message || "Image upload failed. Please try again.",
        storage: details,
      },
      { status: uploadError.status && uploadError.status >= 400 ? uploadError.status : 500 },
    );
  }

  const { data: publicUrl } = admin.storage.from(CREATOR_IMAGES_BUCKET).getPublicUrl(path);

  return NextResponse.json({
    ok: true,
    url: publicUrl.publicUrl,
    path,
  });
}
