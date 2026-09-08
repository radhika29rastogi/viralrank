import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { detectImageMime } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

function extensionForMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return null;
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
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectImageMime(buffer);
  if (!detected) {
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

  const { error: uploadError } = await admin.storage.from("creator-images").upload(path, buffer, {
    contentType: detected,
    upsert: false,
  });

  if (uploadError) {
    console.error("[upload-image] storage failed");
    return NextResponse.json(
      { error: "Could not upload image. Ensure migration 0006 is applied." },
      { status: 500 },
    );
  }

  const { data: publicUrl } = admin.storage.from("creator-images").getPublicUrl(path);

  return NextResponse.json({
    ok: true,
    url: publicUrl.publicUrl,
    path,
  });
}
