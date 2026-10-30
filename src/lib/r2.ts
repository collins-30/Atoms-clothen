// Cloudflare R2 (S3-compatible storage) for uploaded images. Server only: the
// secret key must never reach the browser, so only server code imports this file.
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REQUIRED = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"] as const;

export const isR2Configured = () => REQUIRED.every((k) => !!process.env[k]);

let client: S3Client | null = null;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      // Recent AWS SDK versions add checksum headers that browsers can't send on a
      // pre-signed upload and that R2 then rejects. Only add them when required.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}

/**
 * A short-lived (5 minute) link the admin's browser can PUT one file to, plus the
 * public address the file will have afterwards. The file goes straight from the
 * browser to R2, so it never passes through this server.
 */
export async function createPresignedUpload(key: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string }> {
  const uploadUrl = await getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );
  const base = process.env.R2_PUBLIC_URL!.replace(/\/+$/, "");
  return { uploadUrl, publicUrl: `${base}/${key}` };
}
