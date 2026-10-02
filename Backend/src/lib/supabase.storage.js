import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

let supabaseAdmin;

function getSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is not configured on the backend.");
  }
  if (!serviceRoleKey) {
    throw new Error(
      "PDF storage requires SUPABASE_SERVICE_ROLE_KEY in the backend environment. Do not use the anon key for private storage operations.",
    );
  }

  supabaseAdmin ??= createClient(supabaseUrl, serviceRoleKey);
  return supabaseAdmin;
}

export const pdf_bucket = "pdf-bucket-sources";

export async function createSignedUploadUrl(storagePath) {
  const { data, error } = await getSupabaseAdmin().storage
    .from(pdf_bucket)
    .createSignedUploadUrl(storagePath);
  if (error) {
    console.error("Supabase signed PDF upload URL failed:", error.message);
    throw new Error(`Failed to create signed upload URL: ${error.message}`);
  }
  return data;
}

export async function downloadPdf(storagePath) {
  const { error, data } = await getSupabaseAdmin().storage
    .from(pdf_bucket)
    .download(storagePath);
  if (error)
    throw new Error(`Failed to download PDF from storage: ${error.message}`);

  //convert the blob in raw binary bytes, cause blob is usually a web representation type of storing the file
  return Buffer.from(await data.arrayBuffer());
}

export async function checkPdfExist(storagePath) {
  const folder = storagePath.split("/").slice(0, -1).join("/");
  const filename = storagePath.split("/").pop();
  const { data, error } = await getSupabaseAdmin().storage
    .from(pdf_bucket)
    .list(folder, { search: filename });
  if (error) return false;
  return data.some((f) => f.name === filename);
}
export async function deletePdf(storagePath) {
  await getSupabaseAdmin().storage.from(pdf_bucket).remove([storagePath]).catch(() => {})
}