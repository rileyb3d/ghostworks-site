import { put, type PutBlobResult } from "@vercel/blob";

// Stream a remote URL into Vercel Blob and return the stable public URL.
// Use this for any asset whose origin URL might expire (Notion files, S3
// presigned URLs, etc.) so users never hit a dead link.
//
// Pattern from TECH_STACK.md §7:
//   - access: "public"
//   - addRandomSuffix: false (stable, idempotent URL)
//   - multipart: true (no in-memory size limit)
export async function syncRemoteToBlob(
  remoteUrl: string,
  blobPath: string,
  init?: { contentType?: string },
): Promise<PutBlobResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }

  const res = await fetch(remoteUrl);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to fetch ${remoteUrl}: ${res.status}`);
  }

  return put(blobPath, res.body, {
    access: "public",
    addRandomSuffix: false,
    multipart: true,
    contentType: init?.contentType ?? res.headers.get("content-type") ?? undefined,
    token,
  });
}

// Upload an in-memory buffer / blob / stream to Vercel Blob with the same
// stable-URL pattern.
export async function uploadToBlob(
  blobPath: string,
  data: Parameters<typeof put>[1],
  init?: { contentType?: string },
): Promise<PutBlobResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }
  return put(blobPath, data, {
    access: "public",
    addRandomSuffix: false,
    multipart: true,
    contentType: init?.contentType,
    token,
  });
}
