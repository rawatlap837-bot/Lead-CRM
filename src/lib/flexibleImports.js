import { supabase } from "./supabase";
function throwIfImportError(error) {
  if (error)
    throw new Error(
      ["42P01", "PGRST205"].includes(error.code)
        ? "File uploads need one-time setup: run supabase/flexible-imports.sql in Supabase SQL Editor."
        : error.message,
    );
}
export { flexibleRows } from "./flexibleRows.js";
export async function saveFileRows(rows, source, fileName) {
  if (!source.trim()) throw new Error("Enter a landing page name.");
  const { error } = await supabase
    .from("crm_import_rows")
    .insert(
      rows.map((fields) => ({ source: source.trim(), fields, file_name: fileName })),
    );
  if (error?.code === "42501" && source.startsWith("Personal leads / ")) {
    throw new Error(
      "Personal workspace setup is required. Ask your administrator to run supabase/personal-workspaces.sql once.",
    );
  }
  throwIfImportError(error);
}
export async function fetchFileRows(source, page = 0) {
  let query = supabase
    .from("crm_import_rows")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id");
  if (source) query = query.eq("source", source);
  const { data, error, count } = await query.range(page * 25, page * 25 + 24);
  throwIfImportError(error);
  return { data, count };
}
// Supabase caps query sizes, so read batches until the last partial batch.
export async function fileSources() {
  const sources = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("crm_import_rows")
      .select("source")
      .order("source")
      .range(offset, offset + 999);
    if (["42P01", "PGRST205"].includes(error?.code)) return [];
    throwIfImportError(error);
    data.forEach((row) => sources.add(row.source));
    if (data.length < 1000) break;
  }
  return [...sources];
}
export async function updateFileRow(id, fields) {
  const { error } = await supabase
    .from("crm_import_rows")
    .update({ fields })
    .eq("id", id)
    .select("id")
    .single();
  throwIfImportError(error);
}

export async function fileStats() {
  const stats = {};
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("crm_import_rows")
      .select("source")
      .order("id")
      .range(offset, offset + 999);
    if (["42P01", "PGRST205"].includes(error?.code)) return {};
    throwIfImportError(error);
    data.forEach((row) => {
      stats[row.source] = (stats[row.source] || 0) + 1;
    });
    if (data.length < 1000) break;
  }
  return stats;
}
