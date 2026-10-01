import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase URL or Service Role Key is not defined in environment variables.",
  );
}
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
export const pdf_bucket = "pdf-bucket-sources";

export async function createSignedUploadUrl(storagePath) {
  const { data, error } = await supabaseAdmin.storage
    .from(pdf_bucket)
    .createSignedUploadUrl(storagePath);
  if (error) throw new Error("Failed to create signed upload url");
  return data;
}

export async function downloadPdf(storagePath) {
  const { error, data } = await supabaseAdmin.storage
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
  const { data, error } = await supabaseAdmin.storage
    .from(pdf_bucket)
    .list(folder, { search: filename });
  if (error) return false;
  return data.some((f) => f.name === filename);
}
export async function deletePdf(storagePath) {
  await supabaseAdmin.storage.from(PDF_BUCKET).remove([storagePath]).catch(() => {})
}